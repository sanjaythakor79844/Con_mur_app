import { useEffect, useMemo, useRef, useState } from "react";
import { Btn, Card, Icon, Pill, Section } from "@/components/aaha";
import type { Reading } from "@/lib/ambika-engine";
import {
  ESSENTIAL_TESTS,
  calcBmi,
  makeReading,
  pendingReading,
  recommendedTests,
  testById,
  validateEntry,
  type TestDef,
} from "@/lib/diagnostics-catalog";

type Draft = { value?: string; systolic?: string; diastolic?: string; choice?: string };

const toneFor = (flag: Reading["flag"]) => (flag === "red" ? "red" : flag === "amber" ? "amber" : "green");

function TestRow({
  def,
  saved,
  busy,
  onSave,
  onClear,
}: {
  def: TestDef;
  saved?: Reading;
  busy: boolean;
  onSave: (draft: Draft) => Promise<string | null>;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (saved && !open) {
    return (
      <Card as="li" className="space-y-2">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold">
              {def.name} · {saved.value} {saved.unit}
            </p>
            <p className="text-xs text-muted-foreground">
              {saved.label} · {def.refText}
            </p>
          </div>
          <Pill tone={toneFor(saved.flag)}>{saved.label}</Pill>
        </div>
        <div className="flex gap-2">
          <Btn size="md" variant="outline" icon="edit" onClick={() => setOpen(true)} disabled={busy}>
            Edit
          </Btn>
          <Btn size="md" variant="outline" icon="delete" onClick={onClear} disabled={busy}>
            Remove
          </Btn>
        </div>
      </Card>
    );
  }

  return (
    <Card as="li" className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold">{def.name}</p>
        <span className="text-xs text-muted-foreground">{def.refText}</span>
      </div>

      {def.kind === "bp" && (
        <div className="grid grid-cols-2 gap-2">
          <input
            aria-label="Systolic"
            inputMode="numeric"
            placeholder="Systolic"
            value={draft.systolic ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, systolic: e.target.value }))}
            className="min-h-11 rounded-2xl bg-soft px-3 text-sm font-semibold outline-none"
          />
          <input
            aria-label="Diastolic"
            inputMode="numeric"
            placeholder="Diastolic"
            value={draft.diastolic ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, diastolic: e.target.value }))}
            className="min-h-11 rounded-2xl bg-soft px-3 text-sm font-semibold outline-none"
          />
        </div>
      )}

      {def.kind === "choice" && (
        <div className="flex flex-wrap gap-2">
          {def.choices?.map((c) => (
            <button key={c.value} type="button" onClick={() => setDraft({ choice: c.value })}>
              <Pill tone={draft.choice === c.value ? toneFor(c.flag) : "neutral"}>{c.label}</Pill>
            </button>
          ))}
        </div>
      )}

      {def.kind === "number" && (
        <input
          aria-label={`${def.name} value`}
          inputMode="decimal"
          placeholder={`Value in ${def.unit || "units"}`}
          value={draft.value ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
          className="min-h-11 w-full rounded-2xl bg-soft px-3 text-sm font-semibold outline-none"
        />
      )}

      {error && <p className="text-xs font-semibold text-danger">{error}</p>}

      <Btn
        size="md"
        icon="check"
        disabled={busy || saving}
        onClick={async () => {
          setSaving(true);
          // Persisted immediately, so the value survives a refresh or a back-step.
          const err = await onSave(draft);
          setSaving(false);
          setError(err);
          if (!err) {
            setOpen(false);
            setDraft({});
          }
        }}
      >
        {saving ? "Saving…" : `Save ${def.name}`}
      </Btn>
    </Card>
  );
}

export function DiagnosticsPanel({
  conditions,
  rapidIds,
  labIds,
  busy,
  initialReadings,
  onPersist,
  onRemove,
  onFinish,
}: {
  conditions: string[];
  rapidIds: string[];
  labIds: string[];
  busy: boolean;
  /** Readings already stored for this check-up, so the panel reopens filled in. */
  initialReadings?: Record<string, Reading>;
  /** Store one reading right away; reject to surface a save error inline. */
  onPersist?: (id: string, reading: Reading) => Promise<void>;
  onRemove?: (id: string) => Promise<void>;
  onFinish: (readings: Record<string, Reading>) => void;
}) {
  const [saved, setSaved] = useState<Record<string, Reading>>(initialReadings ?? {});

  // Adopt stored readings once they arrive from the database.
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current || !initialReadings || !Object.keys(initialReadings).length) return;
    hydrated.current = true;
    setSaved((s) => ({ ...initialReadings, ...s }));
  }, [initialReadings]);

  const rapid = useMemo(
    () => (rapidIds.length ? rapidIds.map(testById).filter(Boolean) as TestDef[] : recommendedTests("rapid", conditions)),
    [rapidIds, conditions],
  );
  const labs = useMemo(
    () => (labIds.length ? labIds.map(testById).filter(Boolean) as TestDef[] : recommendedTests("lab", conditions)),
    [labIds, conditions],
  );

  const persist = async (entries: Array<[string, Reading]>): Promise<string | null> => {
    if (!onPersist) return null;
    try {
      for (const [id, reading] of entries) await onPersist(id, reading);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Could not save this value. Please try again.";
    }
  };

  const save = async (def: TestDef, draft: Draft): Promise<string | null> => {
    const err = validateEntry(def, draft);
    if (err) return err;
    const reading = makeReading(def, {
      value: draft.value ? Number(draft.value) : undefined,
      systolic: draft.systolic ? Number(draft.systolic) : undefined,
      diastolic: draft.diastolic ? Number(draft.diastolic) : undefined,
      choice: draft.choice,
    });
    const next: Record<string, Reading> = { ...saved, [def.id]: reading };
    const h = Number(next.height?.value);
    const w = Number(next.weight?.value);
    if (Number.isFinite(h) && Number.isFinite(w) && h > 0 && w > 0) {
      const bmiDef = ESSENTIAL_TESTS.find((t) => t.id === "bmi")!;
      next.bmi = makeReading(bmiDef, { value: calcBmi(h, w) });
    }

    const entries: Array<[string, Reading]> = [[def.id, reading]];
    if (next.bmi && next.bmi !== saved.bmi) entries.push(["bmi", next.bmi]);
    const saveError = await persist(entries);
    if (saveError) return saveError;

    setSaved(next);
    return null;
  };

  const clear = async (id: string) => {
    const removing = id === "height" || id === "weight" ? [id, "bmi"] : [id];
    setSaved((s) => {
      const next = { ...s };
      for (const key of removing) delete next[key];
      return next;
    });
    if (onRemove) {
      for (const key of removing) await onRemove(key).catch(() => undefined);
    }
  };

  const markPending = async (def: TestDef) => {
    const reading = pendingReading(def);
    setSaved((s) => ({ ...s, [def.id]: reading }));
    await persist([[def.id, reading]]);
  };

  const bmi = saved.bmi;
  const pendingCount = labs.filter((t) => !saved[t.id] || saved[t.id].status === "pending").length;

  return (
    <>
      <Section title="Essential screening tests">
        <ul className="space-y-3">
          {ESSENTIAL_TESTS.filter((t) => t.kind !== "derived").map((def) => (
            <TestRow
              key={def.id}
              def={def}
              saved={saved[def.id]}
              busy={busy}
              onSave={(d) => save(def, d)}
              onClear={() => void clear(def.id)}
            />
          ))}
          <Card as="li" className="bg-soft">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
              <Icon name="monitor_weight" className="text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-bold">BMI {bmi ? `· ${bmi.value} kg/m²` : ""}</p>
                <p className="text-xs text-muted-foreground">
                  {bmi ? bmi.label : "Calculated automatically from your height and weight"}
                </p>
              </div>
              {bmi && <Pill tone={toneFor(bmi.flag)}>{bmi.label}</Pill>}
            </div>
          </Card>
        </ul>
      </Section>

      <Section title="Rapid tests">
        <ul className="space-y-3">
          {rapid.map((def) => (
            <TestRow
              key={def.id}
              def={def}
              saved={saved[def.id]}
              busy={busy}
              onSave={(d) => save(def, d)}
              onClear={() => void clear(def.id)}
            />
          ))}
        </ul>
      </Section>

      <Section title="Laboratory reports">
        <ul className="space-y-3">
          {labs.map((def) =>
            saved[def.id]?.status === "pending" ? (
              <Card as="li" key={def.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold">{def.name}</p>
                  <p className="text-xs text-muted-foreground">Marked pending · {def.refText}</p>
                </div>
                <button type="button" onClick={() => void clear(def.id)}>
                  <Pill tone="amber">Undo</Pill>
                </button>
              </Card>
            ) : (
              <div key={def.id} className="space-y-2">
                <TestRow def={def} saved={saved[def.id]} busy={busy} onSave={(d) => save(def, d)} onClear={() => void clear(def.id)} />
                {!saved[def.id] && (
                  <button type="button" className="pl-1 text-xs font-semibold text-primary" onClick={() => void markPending(def)}>
                    I don't have this report yet
                  </button>
                )}
              </div>
            ),
          )}
        </ul>
      </Section>

      <Section>
        <Btn
          icon="summarize"
          disabled={busy}
          onClick={() => {
            const readings = { ...saved };
            for (const def of labs) if (!readings[def.id]) readings[def.id] = pendingReading(def);
            onFinish(readings);
          }}
        >
          {busy ? "Preparing your report…" : "Generate my health report"}
        </Btn>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {pendingCount ? `${pendingCount} investigation${pendingCount > 1 ? "s" : ""} will be marked pending — upload them anytime.` : "All investigations recorded."}
        </p>
      </Section>
    </>
  );
}

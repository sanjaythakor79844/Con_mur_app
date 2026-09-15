import { Card, Icon, Pill, Section } from "@/components/aaha";
import type {
  AwisSnapshot,
  ConditionSnapshot,
  PrescriptionContent,
  PrescriptionRow,
  SymptomSnapshot,
} from "@/lib/prescriptions";
import { contentOf } from "@/lib/prescriptions";

function CareList({ title, icon, items }: { title: string; icon: string; items: { title: string; detail: string }[] }) {
  if (!items?.length) return null;
  return (
    <Card>
      <div className="flex items-center gap-2 text-primary">
        <Icon name={icon} className="text-[18px]" />
        <p className="text-sm font-bold">{title}</p>
      </div>
      <ul className="mt-2 space-y-2">
        {items.map((i, idx) => (
          <li key={`${i.title}-${idx}`} className="rounded-2xl bg-muted p-3">
            <p className="text-sm font-semibold">{i.title}</p>
            {i.detail ? <p className="mt-1 text-xs text-muted-foreground">{i.detail}</p> : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Read-only rendering of an approved (or drafted) prescription. */
export function PrescriptionView({ row }: { row: PrescriptionRow }) {
  const c: PrescriptionContent = contentOf(row);
  const symptoms = (row.symptoms_snapshot ?? []) as unknown as SymptomSnapshot[];
  const awis = (row.awis_snapshot ?? {}) as unknown as AwisSnapshot;
  const condition = (row.condition_snapshot ?? {}) as unknown as ConditionSnapshot;

  return (
    <>
      <Section>
        <Card>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-bold">{row.doctor_name ?? "Aaha doctor"}</p>
              <p className="text-xs text-muted-foreground">
                {row.approved_at
                  ? `Approved ${new Date(row.approved_at).toLocaleDateString()}`
                  : `Created ${new Date(row.created_at).toLocaleDateString()}`}
              </p>
              <p className="text-xs text-muted-foreground">
                Last updated {new Date(row.updated_at).toLocaleDateString()}
              </p>
            </div>
            <Pill tone={row.status === "APPROVED" ? "green" : "amber"}>
              {row.status === "APPROVED" ? "Approved" : "Draft"}
            </Pill>
          </div>

          {condition.primary ? (
            <p className="mt-3 text-sm">
              <span className="font-semibold">Focus:</span> {condition.primary}
              {condition.suspected && condition.suspected.length > 1
                ? ` (also considering ${condition.suspected.slice(1).join(", ")})`
                : ""}
            </p>
          ) : null}
          {awis.score !== undefined ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Wellness score at consultation: <span className="font-semibold text-primary">{awis.score}</span>
              {awis.band ? ` · ${awis.band}` : ""}
            </p>
          ) : null}
        </Card>
      </Section>

      {c.consultation_summary ? (
        <Section title="Consultation summary">
          <Card className="bg-soft">
            <p className="text-sm text-muted-foreground">{c.consultation_summary}</p>
          </Card>
        </Section>
      ) : null}

      {symptoms.length ? (
        <Section title="Symptoms recorded">
          <Card>
            <ul className="space-y-1">
              {symptoms.map((s, i) => (
                <li key={`${s.label}-${i}`} className="text-xs text-muted-foreground">
                  • {s.label}: {s.answer}
                </li>
              ))}
            </ul>
          </Card>
        </Section>
      ) : null}

      <Section title="Medication">
        <Card>
          {c.medication?.length ? (
            <ul className="space-y-2">
              {c.medication.map((m, i) => (
                <li key={`${m.name}-${i}`} className="rounded-2xl bg-muted p-3">
                  <p className="text-sm font-semibold">{m.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[m.dosage, m.frequency, m.route, m.duration].filter(Boolean).join(" · ")}
                  </p>
                  {m.notes ? <p className="mt-1 text-xs text-muted-foreground">{m.notes}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No medication prescribed.</p>
          )}
        </Card>
      </Section>


      <Section title="Your care plan">
        <div className="space-y-3">
          <CareList title="Lifestyle management" icon="self_improvement" items={c.lifestyle_management} />
          <CareList title="Nutrition" icon="restaurant" items={c.nutrition} />
          <CareList title="Physical activity" icon="directions_run" items={c.physical_activity} />
        </div>
      </Section>

      {c.follow_up?.timeline || c.follow_up?.tests?.length || c.follow_up?.notes ? (
        <Section title="Follow-up">
          <Card>
            {c.follow_up.timeline ? <p className="text-sm font-semibold">{c.follow_up.timeline}</p> : null}
            {c.follow_up.tests?.length ? (
              <ul className="mt-2 space-y-1">
                {c.follow_up.tests.map((t) => (
                  <li key={t} className="text-xs text-muted-foreground">
                    • {t}
                  </li>
                ))}
              </ul>
            ) : null}
            {c.follow_up.notes ? <p className="mt-2 text-xs text-muted-foreground">{c.follow_up.notes}</p> : null}
          </Card>
        </Section>
      ) : null}
    </>
  );
}

import { Card, Icon, Pill, Section } from "@/components/aaha";
import { Link } from "@tanstack/react-router";
import type {
  AwisSnapshot,
  ConditionSnapshot,
  PrescriptionContent,
  PrescriptionRow,
  SymptomSnapshot,
} from "@/lib/prescriptions";
import { contentOf } from "@/lib/prescriptions";

function CareList({
  title,
  icon,
  items,
}: {
  title: string;
  icon: string;
  items: { title: string; detail: string }[];
}) {
  if (!items?.length) return null;
  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 text-primary mb-3">
        <Icon name={icon} className="text-[20px]" />
        <h2 className="text-[16px] font-bold tracking-tight">{title}</h2>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((i, idx) => (
          <div key={`${i.title}-${idx}`} className="flex items-start gap-3 bg-card border border-border p-3.5 rounded-[20px] shadow-sm">
             <button type="button" className="shrink-0 mt-0.5 size-7 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground/30 hover:border-primary hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20">
               <Icon name="check" className="text-[18px] font-bold" />
             </button>
             <div className="min-w-0 flex-1">
               <p className="text-[15px] font-bold leading-snug">{i.title}</p>
               {i.detail ? <p className="mt-1 text-[14px] text-muted-foreground leading-relaxed">{i.detail}</p> : null}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Read-only rendering of an approved (or drafted) prescription. */
export function PrescriptionView({ row }: { row: PrescriptionRow }) {
  const c: PrescriptionContent = contentOf(row);
  const symptoms = (row.symptoms_snapshot ?? []) as unknown as SymptomSnapshot[];
  const awis = (row.awis_snapshot ?? {}) as unknown as AwisSnapshot;
  const condition = (row.condition_snapshot ?? {}) as unknown as ConditionSnapshot;

  return (
    <div className="px-5 pt-4 pb-8 flex flex-col">
      <div className="mb-6">
        <div className="text-[12px] font-bold tracking-widest text-muted-foreground uppercase mb-1">
          {row.approved_at
            ? `Approved by ${row.doctor_name ?? "your doctor"}, ${new Date(row.approved_at).toLocaleDateString()}`
            : `Draft created ${new Date(row.created_at).toLocaleDateString()}`}
        </div>
        <h1 className="text-[28px] font-bold leading-tight">Your care plan</h1>
      </div>

      {condition.primary || awis.score ? (
        <section className="bg-card border border-border rounded-[24px] p-4 flex flex-col gap-2 mb-6 shadow-sm">
          {condition.primary ? (
            <p className="text-[15px]">
              <span className="font-bold">Focus:</span> {condition.primary}
              {condition.suspected && condition.suspected.length > 1
                ? ` (also considering ${condition.suspected.slice(1).join(", ")})`
                : ""}
            </p>
          ) : null}
          {awis.score !== undefined ? (
            <p className="text-[14px] text-muted-foreground">
              Wellness score at consultation:{" "}
              <span className="font-bold text-primary">{awis.score}</span>
              {awis.band ? ` · ${awis.band}` : ""}
            </p>
          ) : null}
        </section>
      ) : null}

      {c.consultation_summary ? (
        <section className="mb-6">
          <h2 className="text-[16px] font-bold mb-3">Consultation summary</h2>
          <div className="bg-soft border border-accent/70 rounded-[24px] p-4">
            <p className="text-[15px] text-foreground leading-relaxed">{c.consultation_summary}</p>
          </div>
        </section>
      ) : null}

      {symptoms.length ? (
        <section className="mb-6">
          <h2 className="text-[16px] font-bold mb-3">Symptoms recorded</h2>
          <div className="bg-card border border-border rounded-[24px] p-4">
            <ul className="space-y-2">
              {symptoms.map((s, i) => (
                <li key={`${s.label}-${i}`} className="text-[14px] text-muted-foreground flex gap-2">
                  <span className="text-primary">•</span> 
                  <span><span className="font-medium text-foreground">{s.label}:</span> {s.answer}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section>
        {c.medication?.length ? (
          <div className="mt-2">
            <div className="flex items-center gap-2 text-primary mb-3">
              <Icon name="medication" className="text-[20px]" />
              <h2 className="text-[16px] font-bold tracking-tight">Medication</h2>
            </div>
            <div className="flex flex-col gap-3">
              {c.medication.map((m, i) => (
                <div key={`${m.name}-${i}`} className="flex items-start gap-3 bg-card border border-border p-3.5 rounded-[20px] shadow-sm">
                  <button type="button" className="shrink-0 mt-0.5 size-7 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground/30 hover:border-primary hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <Icon name="check" className="text-[18px] font-bold" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold leading-snug">{m.name}</p>
                    <p className="mt-1 text-[13px] font-semibold text-primary bg-primary/10 inline-block px-2 py-0.5 rounded-md">
                      {[m.dosage, m.frequency, m.route, m.duration].filter(Boolean).join(" · ")}
                    </p>
                    {m.notes ? <p className="mt-1.5 text-[14px] text-muted-foreground leading-relaxed">{m.notes}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <CareList title="Lifestyle management" icon="self_improvement" items={c.lifestyle_management} />
        <CareList title="Nutrition" icon="restaurant" items={c.nutrition} />
        <CareList title="Physical activity" icon="directions_run" items={c.physical_activity} />
      </section>

      {c.follow_up?.timeline || c.follow_up?.tests?.length || c.follow_up?.notes ? (
        <section className="mt-8">
          <div className="flex items-center gap-2 text-primary mb-3">
            <Icon name="event" className="text-[20px]" />
            <h2 className="text-[16px] font-bold tracking-tight">Follow-up</h2>
          </div>
          <div className="bg-card border border-border rounded-[24px] p-4 shadow-sm">
            {c.follow_up.timeline ? (
              <p className="text-[15px] font-bold text-foreground mb-2">{c.follow_up.timeline}</p>
            ) : null}
            {c.follow_up.tests?.length ? (
              <ul className="space-y-1 mb-2">
                {c.follow_up.tests.map((t) => (
                  <li key={t} className="text-[14px] text-muted-foreground flex gap-2">
                    <span className="text-primary">•</span> 
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {c.follow_up.notes ? (
              <p className="text-[14px] text-muted-foreground leading-relaxed pt-1">{c.follow_up.notes}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="mt-8">
        <Link to="/aaha" search={{ report: undefined }} className="flex items-center justify-between min-h-[64px] px-5 rounded-[32px] bg-card border border-border hover:border-primary transition-colors shadow-sm">
          <span className="text-[16px] font-semibold">Ask Aaha about your plan</span>
          <span className="grid size-10 place-items-center rounded-full bg-brand text-brand-foreground shrink-0 shadow-sm">
            <Icon name="mic" className="text-[20px]" />
          </span>
        </Link>
      </div>
    </div>
  );
}

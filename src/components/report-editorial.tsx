import type { ReactNode } from "react";
import { Icon } from "@/components/aaha";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Reading } from "@/lib/ambika-engine";
import type { ScoreBreakdown } from "@/lib/health-recommendations";

const TONE = {
  low: { color: "var(--success)", tint: "bg-success/10", text: "text-success" },
  moderate: { color: "var(--warning)", tint: "bg-warning/10", text: "text-[color:var(--warning)]" },
  high: { color: "var(--danger)", tint: "bg-danger/10", text: "text-danger" },
} as const;

function toneOf(band: string) {
  return TONE[(band as keyof typeof TONE) in TONE ? (band as keyof typeof TONE) : "moderate"];
}

/** Editorial masthead — brand line, patient identity and report meta. */
export function ReportMasthead({
  date,
  patientName,
  reportId,
  statusLabel,
}: {
  date?: Date;
  patientName?: string | null;
  reportId?: string | null;
  statusLabel?: string | null;
}) {
  const { t } = useI18n();
  const stamp = (date ?? new Date()).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <header className="border-b border-border px-4 pb-4 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-bold tracking-tight">
            AAHA<span className="text-primary">·</span>Companion
          </p>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
            {t("Health Assessment Report")}
          </p>
        </div>
        <p className="text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t("Guided Check-up Report")}
          <br />
          {stamp}
        </p>
      </div>
      {(patientName || reportId || statusLabel) && (
        <dl className="mt-4 grid gap-2 rounded-2xl border border-border bg-card p-3 text-xs sm:grid-cols-3">
          {patientName ? (
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("Patient")}
              </dt>
              <dd className="truncate font-semibold">{patientName}</dd>
            </div>
          ) : null}
          {reportId ? (
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("Report ID")}
              </dt>
              <dd className="truncate font-mono text-[11px]">{reportId}</dd>
            </div>
          ) : null}
          {statusLabel ? (
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("Overall status")}
              </dt>
              <dd className="truncate font-semibold">{statusLabel}</dd>
            </div>
          ) : null}
        </dl>
      )}
    </header>
  );
}

/** Radial AWIS gauge with the editorial headline block beside it. */
export function ReportHero({
  awis,
  max = 20,
  band,
  label,
  headline,
  copy,
}: {
  awis: number;
  max?: number;
  band: string;
  label: string;
  headline: string;
  copy: string;
}) {
  const tone = toneOf(band);
  const r = 94;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, awis / max));

  return (
    <section className="grid items-center gap-6 px-4 py-8 sm:grid-cols-[220px_minmax(0,1fr)]">
      <div className="relative mx-auto size-[200px] sm:size-[220px]">
        <svg viewBox="0 0 220 220" className="size-full -rotate-90">
          <circle cx="110" cy="110" r={r} fill="none" stroke="var(--muted)" strokeWidth="16" />
          <circle
            cx="110"
            cy="110"
            r={r}
            fill="none"
            stroke={tone.color}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <span>
            <span className={cn("block text-5xl font-bold leading-none", tone.text)}>{awis}</span>
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              of {max} · AWIS
            </span>
          </span>
        </div>
      </div>
      <div className="min-w-0 text-center sm:text-left">
        <p className={cn("text-[10px] font-bold uppercase tracking-[0.12em]", tone.text)}>
          {label}
        </p>
        <h2 className="mt-2 text-2xl font-bold leading-tight tracking-tight">{headline}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{copy}</p>
      </div>
    </section>
  );
}

/** Three-cell score attribution strip. */
export function ReportBreakdown({ breakdown }: { breakdown: ScoreBreakdown }) {
  if (!breakdown?.length) return null;
  return (
    <div className="grid gap-px border-y border-border bg-border sm:grid-cols-3">
      {breakdown.map((b) => (
        <div key={b.label} className="bg-background px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {b.label}
          </p>
          <p className="mt-1 text-2xl font-bold text-primary">+{b.points}</p>
          <p className="mt-1 text-xs text-muted-foreground">{b.detail}</p>
        </div>
      ))}
    </div>
  );
}

export function ReportSection({
  index,
  title,
  sub,
  children,
}: {
  index: string;
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <section className="px-4 py-6">
      <div className="flex items-baseline gap-3 border-b border-border pb-2">
        <span className="text-[11px] font-semibold tabular-nums text-primary">{index}</span>
        <h3 className="text-lg font-bold tracking-tight">{t(title)}</h3>
      </div>
      {sub ? <p className="mt-2 text-xs text-muted-foreground">{t(sub)}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function flagStyle(flag: string) {
  if (flag === "red") return "bg-danger/12 text-danger";
  if (flag === "amber") return "bg-warning/18 text-[color:var(--warning)]";
  return "bg-success/12 text-success";
}

/** Responsive results table: rows on mobile, columns from tablet up. */
export function ReadingTable({ readings }: { readings: Reading[] }) {
  const { t } = useI18n();
  if (!readings.length) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] gap-3 bg-muted px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:grid">
        <span>{t("Test")}</span>
        <span>{t("Result")}</span>
        <span>{t("Reference")}</span>
        <span className="text-right">{t("Reading")}</span>
      </div>
      <ul className="divide-y divide-border">
        {readings.map((r) => (
          <li
            key={r.device_id}
            className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-center sm:gap-3"
          >
            <span className="text-sm font-semibold">{r.name}</span>
            <span className="text-sm tabular-nums text-foreground">
              {r.value} {r.unit}
            </span>
            <span className="text-xs text-muted-foreground">{r.ref_text || "—"}</span>
            <span className="justify-self-start sm:justify-self-end">
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  flagStyle(r.flag),
                )}
              >
                {r.flag === "green" ? t("Normal") : r.label}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TagRow({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <span
          key={i}
          className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground"
        >
          {i}
        </span>
      ))}
    </div>
  );
}

export function PlanGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

export function PlanCard({ title, items, icon }: { title: string; items: string[]; icon: string }) {
  const { t } = useI18n();
  if (!items?.length) return null;
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-primary">
        <Icon name={icon} className="text-[18px]" />
        <h4 className="text-sm font-bold">{t(title)}</h4>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((i) => (
          <li
            key={i}
            className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 text-sm leading-relaxed text-muted-foreground"
          >
            <span className="mt-[7px] size-1.5 rounded-full bg-primary/50" />
            <span className="min-w-0">{i}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function Timeline({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {items.map((i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[23px] top-1.5 size-2.5 rounded-full border-2 border-background bg-primary" />
          <p className="text-sm leading-relaxed text-foreground">{i}</p>
        </li>
      ))}
    </ol>
  );
}

export function TranscriptList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
      {items.map((line, index) => {
        const [q, a] = line.includes(" — ") ? line.split(" — ") : [line, ""];
        return (
          <li key={`${line}-${index}`} className="px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground">{q}</p>
            {a ? <p className="mt-1 text-sm leading-relaxed text-foreground">{a}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

export function ReportFooter() {
  const { t } = useI18n();
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-5 text-[11px] text-muted-foreground">
      <span>{t("AAHA Wellness Index · Screening pending doctor review")}</span>
      <span>{t("Not a diagnosis — for clinical review")}</span>
    </footer>
  );
}

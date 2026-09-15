import { useEffect, useState } from "react";
import { Card, Icon, Pill, Section } from "@/components/aaha";
import type { ScoreBreakdown } from "@/lib/health-recommendations";

const TONES = {
  low: { pill: "green" as const, stroke: "var(--success)", tint: "bg-success/10" },
  moderate: { pill: "amber" as const, stroke: "var(--warning)", tint: "bg-warning/10" },
  high: { pill: "red" as const, stroke: "var(--danger)", tint: "bg-danger/10" },
};

function Gauge({ value, max, stroke }: { value: number; max: number; stroke: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  const r = 52;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, shown / max));

  return (
    <div className="relative grid size-32 shrink-0 place-items-center">
      <svg viewBox="0 0 128 128" className="size-32 -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--muted)" strokeWidth="12" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute text-center">
        <span className="block text-3xl font-bold leading-none">{value}</span>
        <span className="block text-[11px] font-semibold text-muted-foreground">of {max} AWIS</span>
      </div>
    </div>
  );
}

export function AwisScoreCard({
  awis,
  band,
  label,
  description,
  breakdown,
  insights,
}: {
  awis: number;
  band: string;
  label: string;
  description: string;
  breakdown: ScoreBreakdown;
  insights: string[];
}) {
  const tone = TONES[(band as keyof typeof TONES) in TONES ? (band as keyof typeof TONES) : "moderate"];
  const total = breakdown.reduce((a, b) => a + b.points, 0) || 1;

  return (
    <Section title="Your wellness score">
      <Card className={`space-y-4 ${tone.tint}`}>
        <div className="flex items-center gap-4">
          <Gauge value={awis} max={20} stroke={tone.stroke} />
          <div className="min-w-0">
            <Pill tone={tone.pill}>{label}</Pill>
            <p className="mt-2 text-sm font-semibold">Aaha Wellness Index Score</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="space-y-2 rounded-2xl bg-card p-3">
          <p className="text-xs font-bold text-primary">What builds this score</p>
          {breakdown.map((b) => (
            <div key={b.label}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold">{b.label}</span>
                <span className="text-muted-foreground">+{b.points}</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full transition-[width] duration-700"
                  style={{ width: `${Math.min(100, (b.points / total) * 100)}%`, background: tone.stroke }}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{b.detail}</p>
            </div>
          ))}
        </div>

        {insights.length > 0 && (
          <ul className="space-y-2">
            {insights.slice(0, 3).map((i) => (
              <li key={i} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 text-xs text-muted-foreground">
                <Icon name="lightbulb" className="text-[16px] text-primary" />
                <span className="min-w-0">{i}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Section>
  );
}

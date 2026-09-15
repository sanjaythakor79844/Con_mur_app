import { createFileRoute } from "@tanstack/react-router";
import { Btn, Card, Icon, NextStepCard, Pill, Screen, Section, TopBar } from "@/components/aaha";
import { STATUS_LABEL, useReadings } from "@/hooks/use-readings";

export const Route = createFileRoute("/recommended-tests")({
  head: () => ({
    meta: [
      { title: "Recommended tests | Aaha Companion" },
      {
        name: "description",
        content: "The tests Aaha suggests after your screening, with clear preparation instructions.",
      },
      { property: "og:title", content: "Recommended tests | Aaha Companion" },
      { property: "og:description", content: "TSH, Ferritin, AMH, HbA1c and more, explained." },
    ],
  }),
  component: TestsScreen,
});

const TESTS = [
  { id: "tsh", n: "TSH", w: "Checks how your thyroid is working", p: "Morning sample preferred", tone: "amber" as const },
  { id: "ferritin", n: "Ferritin", w: "Shows your iron stores", p: "No fasting needed", tone: "amber" as const },
  { id: "amh", n: "AMH", w: "Reflects ovarian reserve", p: "Any cycle day", tone: "info" as const },
  { id: "hba1c", n: "HbA1c", w: "Average sugar of last 3 months", p: "No fasting needed", tone: "green" as const },
  { id: "cbc", n: "CBC", w: "General blood health", p: "No fasting needed", tone: "green" as const },
  { id: "vitamin_d", n: "Vitamin D", w: "Bone and energy health", p: "No fasting needed", tone: "info" as const },
  { id: "lipid", n: "Lipid Profile", w: "Cholesterol and heart risk", p: "10–12 hours fasting", tone: "amber" as const },
];

function TestsScreen() {
  const { statusOf, byTest, loading } = useReadings();
  return (
    <Screen>
      <TopBar title="Recommended Tests" subtitle="Chosen for your screening result" />
      <Section>
        <ul className="space-y-3">
          {TESTS.map((t) => {
            const status = statusOf(t.id);
            const reading = byTest[t.id];
            return (
            <Card as="li" key={t.n}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="text-base font-bold">{t.n}</p>
                  <p className="text-sm text-muted-foreground">{t.w}</p>
                  {status === "completed" && reading ? (
                    <p className="mt-1 text-xs font-semibold text-primary">
                      Result: {reading.value}
                      {reading.unit ? ` ${reading.unit}` : ""}
                      {reading.label ? ` · ${reading.label}` : ""}
                    </p>
                  ) : null}
                </div>
                <Pill
                  tone={
                    loading
                      ? "neutral"
                      : status === "completed"
                        ? "green"
                        : status === "to_do"
                          ? "amber"
                          : t.tone
                  }
                >
                  {loading ? "Checking…" : status === "not_started" ? (t.tone === "green" ? "Routine" : "Priority") : STATUS_LABEL[status]}
                </Pill>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                <Icon name="info" className="text-[18px] text-primary" />
                {t.p}
              </div>
            </Card>
            );
          })}
        </ul>
      </Section>

      <Section title="Preparation guide">
        <Card className="space-y-3">
          {[
            { i: "no_meals", t: "Fasting", d: "Only for Lipid Profile — water is allowed." },
            { i: "calendar_month", t: "Cycle day", d: "Share your cycle day so hormone values read correctly." },
            { i: "schedule", t: "Collection timing", d: "Between 7 AM and 10 AM gives the most stable readings." },
          ].map((p) => (
            <div key={p.t} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
                <Icon name={p.i} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold">{p.t}</p>
                <p className="text-xs text-muted-foreground">{p.d}</p>
              </div>
            </div>
          ))}
        </Card>
      </Section>

      <Section>
        <Btn to="/diagnostics" icon="science">
          Book diagnostic test
        </Btn>
      </Section>


    </Screen>
  );
}

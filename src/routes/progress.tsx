import { createFileRoute } from "@tanstack/react-router";
import { Btn, Card, FlowNav, Icon, Pill, Screen, Section, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { bandLabel, bandTone, formatDate, useOverview } from "@/hooks/use-overview";
import { useReadings } from "@/hooks/use-readings";
import { isRecordedReading, type AwisReport, type Reading } from "@/lib/ambika-engine";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Health progress | Aaha Companion" },
      {
        name: "description",
        content: "Track your risk trend and key readings across your saved Aaha assessments.",
      },
      { property: "og:title", content: "Health progress | Aaha Companion" },
      { property: "og:description", content: "See how your health is changing over time." },
    ],
  }),
  component: ProgressScreen,
});

function ProgressScreen() {
  return (
    <RequireAuth message="Sign in to track your health progress.">
      <Progress />
    </RequireAuth>
  );
}

const flagTone = (flag?: string) =>
  flag === "red" ? ("red" as const) : flag === "amber" ? ("amber" as const) : ("green" as const);

function Progress() {
  const { assessments, loading: overviewLoading } = useOverview();
  const stored = useReadings();
  const loading = overviewLoading || stored.loading;
  const history = [...assessments].reverse().slice(-6);
  const latest = assessments[0];
  const report = (latest?.report ?? null) as AwisReport | null;
  const reportReadings: Reading[] = Array.isArray(report?.readings) ? report!.readings : [];
  // Persisted readings are canonical; the report blob only fills in older values.
  const merged = new Map<string, Reading>();
  for (const r of reportReadings) merged.set(r.device_id, r);
  for (const r of stored.readings) merged.set(r.device_id, r);
  const keyReadings = [...merged.values()].filter(isRecordedReading).slice(0, 6);


  if (loading)
    return (
      <Screen>
        <TopBar title="Health Progress" />
        <Section>
          <Card className="flex items-center gap-3 text-sm text-muted-foreground">
            <Icon name="progress_activity" className="animate-spin text-primary" />
            Loading your progress…
          </Card>
        </Section>
      </Screen>
    );

  if (assessments.length === 0)
    return (
      <Screen>
        <TopBar title="Health Progress" subtitle="Nothing to compare yet" />
        <Section>
          <Card className="bg-soft">
            <p className="text-sm font-bold">No progress data yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Once you complete check-ups, your AWIS-C trend and key readings appear here.
            </p>
            <Btn to="/checkup" className="mt-4" icon="clinical_notes">
              Start guided check-up
            </Btn>
          </Card>
        </Section>
      </Screen>
    );

  return (
    <Screen>
      <TopBar
        title="Health Progress"
        subtitle={`${assessments.length} saved assessment${assessments.length > 1 ? "s" : ""}`}
      />
      <Section title="Risk trend (AWIS-C)">
        <Card>
          <div className="flex h-36 items-end gap-3">
            {history.map((a) => (
              <div key={a.id} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-xl bg-brand"
                  style={{ height: `${Math.max(6, Math.min(100, Number(a.score ?? 0)))}%` }}
                />
                <span className="text-[10px] text-muted-foreground">{a.score ?? "—"}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between gap-1 text-[10px] text-muted-foreground">
            {history.map((a) => (
              <span key={a.id} className="flex-1 text-center">
                {new Date(a.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            ))}
          </div>
        </Card>
      </Section>

      {keyReadings.length > 0 ? (
        <Section title="Latest readings">
          <ul className="grid grid-cols-2 gap-3">
            {keyReadings.map((m) => (
              <Card as="li" key={m.name} className="p-3">
                <p className="truncate text-xs text-muted-foreground">{m.name}</p>
                <p className="text-xl font-bold leading-tight">
                  {m.value}
                  {m.unit ? <span className="text-sm"> {m.unit}</span> : null}
                </p>
                <Pill tone={flagTone(m.flag)}>{m.flag === "green" ? "Normal" : "Attention"}</Pill>
              </Card>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Previous assessments">
        <ul className="space-y-3">
          {assessments.map((a) => (
            <Card as="li" key={a.id} className="p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <p className="text-sm font-bold">AWIS-C {a.score ?? "—"}</p>
                <Pill tone={bandTone(a.band)}>{bandLabel(a)}</Pill>
              </div>
              <p className="text-xs text-muted-foreground">{formatDate(a.created_at)}</p>
            </Card>
          ))}
        </ul>
      </Section>

      <FlowNav
        steps={[
          {
            to: "/journey",
            title: "See my full journey",
            subtitle: "Timeline of every care step",
            icon: "timeline",
          },
          {
            to: "/doctors",
            title: "Discuss with a doctor",
            subtitle: "Book at an Aaha Health Centre",
            icon: "stethoscope",
          },
        ]}
      />
    </Screen>
  );
}

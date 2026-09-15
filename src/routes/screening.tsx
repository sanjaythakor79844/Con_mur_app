import { createFileRoute } from "@tanstack/react-router";
import {
  AahaSays,
  Btn,
  Card,
  FlowNav,
  Icon,
  NextStepCard,
  Pill,
  Screen,
  Section,
  TopBar,
} from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { bandLabel, bandTone, formatDate, useOverview } from "@/hooks/use-overview";
import { useReadings } from "@/hooks/use-readings";
import { isRecordedReading, type AwisReport, type Reading } from "@/lib/ambika-engine";

export const Route = createFileRoute("/screening")({
  head: () => ({
    meta: [
      { title: "My screening result | Aaha Companion" },
      {
        name: "description",
        content: "Your recorded vitals, symptoms and risk band from your Aaha health screening.",
      },
      { property: "og:title", content: "My screening result | Aaha Companion" },
      { property: "og:description", content: "See your vitals and risk band in simple words." },
    ],
  }),
  component: ScreeningScreen,
});

function ScreeningScreen() {
  return (
    <RequireAuth message="Sign in to see your screening result.">
      <Screening />
    </RequireAuth>
  );
}

function Screening() {
  const { latestAssessment, loading: overviewLoading } = useOverview();
  const stored = useReadings();
  const loading = overviewLoading || stored.loading;
  const report = (latestAssessment?.report ?? null) as AwisReport | null;
  const reportReadings: Reading[] = Array.isArray(report?.readings) ? report!.readings : [];
  // Persisted readings win over anything captured in the report blob.
  const merged = new Map<string, Reading>();
  for (const r of reportReadings) merged.set(r.device_id, r);
  for (const r of stored.readings) merged.set(r.device_id, r);
  const vitals = [...merged.values()].filter(
    (r) => isRecordedReading(r) && r.category !== "lab",
  );
  const symptoms = report?.suspected_conditions ?? latestAssessment?.suspected_conditions ?? [];

  if (loading)
    return (
      <Screen>
        <TopBar title="My Screening" />
        <Section>
          <Card className="flex items-center gap-3 text-sm text-muted-foreground">
            <Icon name="progress_activity" className="animate-spin text-primary" />
            Loading your screening…
          </Card>
        </Section>
      </Screen>
    );

  if (!latestAssessment)
    return (
      <Screen>
        <TopBar title="My Screening" subtitle="No screening saved yet" />
        <Section>
          <Card className="bg-soft">
            <p className="text-sm font-bold">No screening on record</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete a guided check-up — or visit an Aaha kiosk — and your vitals, symptoms and
              risk band will appear here.
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
      <TopBar title="My Screening" subtitle={formatDate(latestAssessment.created_at)} />
      <Section>
        <Card className="bg-soft">
          <Pill tone={bandTone(latestAssessment.band)} icon="shield">
            {bandLabel(latestAssessment)}
          </Pill>
          <p className="mt-3 text-sm text-muted-foreground">
            {latestAssessment.summary || "Your screening result is saved to your health record."}
          </p>
        </Card>
      </Section>

      {vitals.length > 0 ? (
        <Section title="Values recorded">
          <ul className="grid grid-cols-2 gap-3">
            {vitals.map((v) => (
              <Card as="li" key={v.name} className="p-3">
                <div className="flex items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-xl bg-accent text-primary">
                    <Icon name="monitor_heart" className="text-[20px]" />
                  </span>
                  <span
                    className={`size-2.5 rounded-full ${v.flag === "green" ? "bg-success" : v.flag === "red" ? "bg-danger" : "bg-warning"}`}
                  />
                </div>
                <p className="mt-2 text-lg font-bold leading-none">
                  {v.value}
                  {v.unit ? <span className="text-sm"> {v.unit}</span> : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">{v.name}</p>
              </Card>
            ))}
          </ul>
        </Section>
      ) : null}

      {symptoms.length > 0 ? (
        <Section title="What Aaha is watching">
          <div className="flex flex-wrap gap-2">
            {symptoms.map((s) => (
              <Pill key={s} tone="neutral">
                {s}
              </Pill>
            ))}
          </div>
        </Section>
      ) : null}

      <Section>
        <AahaSays>
          {report?.risk_description ||
            "Upload any pending lab reports and I'll update this result the moment they arrive."}
        </AahaSays>
      </Section>

      <Section title="Recommended next">
        <div className="space-y-3">
          <Btn to="/recommended-tests" icon="science">
            View recommended tests
          </Btn>
          <Btn to="/assessment" variant="outline" icon="description">
            View full assessment
          </Btn>
        </div>
      </Section>

      <Section>
        <NextStepCard />
      </Section>

      <FlowNav
        steps={[
          {
            to: "/upload",
            title: "Upload lab reports",
            subtitle: "Aaha reads them for you",
            icon: "upload_file",
          },
          {
            to: "/journey",
            title: "My health journey",
            subtitle: "See where you are today",
            icon: "timeline",
          },
        ]}
      />
    </Screen>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import {
  AahaSays,
  Btn,
  Card,
  FlowNav,
  Icon,
  NextStepCard,
  Pill,
  Ring,
  Screen,
  Section,
  TopBar,
} from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { bandLabel, bandTone, formatDate, useOverview } from "@/hooks/use-overview";
import type { AwisReport, Reading } from "@/lib/ambika-engine";

export const Route = createFileRoute("/assessment")({
  head: () => ({
    meta: [
      { title: "Your health assessment | Aaha Companion" },
      {
        name: "description",
        content:
          "Your AWIS-C score, risk band and a simple explanation of what your lab values mean.",
      },
      { property: "og:title", content: "Your health assessment | Aaha Companion" },
      { property: "og:description", content: "Understand your results and your next steps." },
    ],
  }),
  component: AssessmentScreen,
});

function AssessmentScreen() {
  return (
    <RequireAuth message="Sign in to see your health assessment.">
      <Assessment />
    </RequireAuth>
  );
}

const flagTone = (flag?: string) =>
  flag === "red" ? ("red" as const) : flag === "amber" ? ("amber" as const) : ("green" as const);

function Assessment() {
  const { latestAssessment, assessments, loading } = useOverview();
  const report = (latestAssessment?.report ?? null) as AwisReport | null;
  const readings: Reading[] = Array.isArray(report?.readings) ? report!.readings : [];
  const recorded = readings.filter((r) => r.status !== "pending" && r.source !== "skipped");
  const previous = assessments[1];

  if (loading)
    return (
      <Screen>
        <TopBar title="Health Assessment" />
        <Section>
          <Card className="flex items-center gap-3 text-sm text-muted-foreground">
            <Icon name="progress_activity" className="animate-spin text-primary" />
            Loading your assessment…
          </Card>
        </Section>
      </Screen>
    );

  if (!latestAssessment)
    return (
      <Screen>
        <TopBar title="Health Assessment" subtitle="Nothing saved yet" />
        <Section>
          <Card className="bg-soft">
            <p className="text-sm font-bold">No assessment yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete a guided check-up with Aaha and your AWIS-C score, risk band and explanations
              will appear here.
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
        title="Health Assessment"
        subtitle={`Updated ${formatDate(latestAssessment.created_at)}`}
      />
      <Section>
        <Card className="bg-soft">
          <div className="flex items-center gap-4">
            <Ring value={Number(latestAssessment.score ?? 0)} label="AWIS-C" />
            <div className="min-w-0">
              <Pill tone={bandTone(latestAssessment.band)} icon="shield">
                {bandLabel(latestAssessment)}
              </Pill>
              <p className="mt-2 text-sm text-muted-foreground">
                Aaha Women's Integrated Score — a simple number combining your vitals, symptoms and
                lab values.
              </p>
            </div>
          </div>
        </Card>
      </Section>

      {latestAssessment.summary ? (
        <Section>
          <AahaSays>{latestAssessment.summary}</AahaSays>
        </Section>
      ) : null}

      {recorded.length > 0 ? (
        <Section title="Highlighted values">
          <ul className="space-y-3">
            {recorded.map((v) => (
              <Card as="li" key={`${v.name}-${v.value}`}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">
                      {v.name} · {v.value}
                      {v.unit ? ` ${v.unit}` : ""}
                    </p>
                    {v.label ? <p className="text-xs text-muted-foreground">{v.label}</p> : null}
                  </div>
                  <Pill tone={flagTone(v.flag)}>{v.flag === "green" ? "Normal" : "Attention"}</Pill>
                </div>
              </Card>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Health summary">
        <Card className="space-y-3 text-sm text-muted-foreground">
          <p>
            {previous
              ? `Compared with your assessment on ${formatDate(previous.created_at)}, your score moved from ${previous.score ?? "—"} to ${latestAssessment.score ?? "—"}.`
              : "This is your first saved assessment. Repeat a check-up later to see how your score changes."}
          </p>
          <Btn to="/aaha" variant="outline" size="md" icon="help">
            Why did my result change?
          </Btn>
        </Card>
      </Section>

      {report?.next_steps?.length ? (
        <Section title="Recommended next steps">
          <Card className="space-y-3">
            {report.next_steps.slice(0, 5).map((s) => (
              <div key={s} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
                  <Icon name="check_circle" />
                </span>
                <p className="min-w-0 text-sm font-semibold">{s}</p>
              </div>
            ))}
          </Card>
        </Section>
      ) : null}

      <Section>
        <Btn to="/doctors" icon="stethoscope">
          Book consultation
        </Btn>
      </Section>

      <Section>
        <NextStepCard
          text="Follow-up care works best together. An Aaha Health Centre can bring your doctor review, nutrition plan and repeat tests into one simple schedule."
          cta="Explore centre services"
          to="/services"
        />
      </Section>

      <FlowNav
        steps={[
          {
            to: "/journey",
            title: "See my health journey",
            subtitle: "Every step, in order",
            icon: "timeline",
          },
          {
            to: "/progress",
            title: "Track my progress",
            subtitle: "Compare with past results",
            icon: "show_chart",
          },
        ]}
      />
    </Screen>
  );
}

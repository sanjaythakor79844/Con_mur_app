import { createFileRoute } from "@tanstack/react-router";
import { Btn, Card, FlowNav, Icon, NextStepCard, Pill, Screen, Section, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { formatDate, useOverview } from "@/hooks/use-overview";

export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { title: "My health journey | Aaha Companion" },
      {
        name: "description",
        content:
          "A timeline of your screening, reports, assessments, consultations and follow-up care.",
      },
      { property: "og:title", content: "My health journey | Aaha Companion" },
      { property: "og:description", content: "Every step of your care in one timeline." },
    ],
  }),
  component: JourneyScreen,
});

function JourneyScreen() {
  return (
    <RequireAuth message="Sign in to see your health journey.">
      <Journey />
    </RequireAuth>
  );
}

type Step = { t: string; d: string; s: "done" | "next" | "todo"; i: string };

function Journey() {
  const { latestAssessment, reports, appointments, upcoming, loading } = useOverview();

  const hasReport = reports.length > 0;
  const hasAssessment = !!latestAssessment;
  const hasAppointment = appointments.length > 0;

  const steps: Step[] = [
    {
      t: "Report upload",
      d: hasReport
        ? `${reports.length} report${reports.length > 1 ? "s" : ""} · latest ${formatDate(reports[0]!.report_date)}`
        : "Upload a lab report so Aaha can read it",
      s: hasReport ? "done" : "next",
      i: "upload_file",
    },
    {
      t: "Health assessment",
      d: hasAssessment
        ? `${formatDate(latestAssessment!.created_at)} · AWIS-C ${latestAssessment!.score ?? "—"}`
        : "Complete a guided check-up with Aaha",
      s: hasAssessment ? "done" : hasReport ? "next" : "todo",
      i: "insights",
    },
    {
      t: "Consultation",
      d: upcoming
        ? `${formatDate(upcoming.scheduled_for)} · ${upcoming.doctor_name}`
        : hasAppointment
          ? "Past consultation completed"
          : "Book a doctor review when you're ready",
      s: hasAppointment ? "done" : hasAssessment ? "next" : "todo",
      i: "stethoscope",
    },
    {
      t: "Therapy & lifestyle",
      d: "Nutrition, physiotherapy and wellness support",
      s: "todo",
      i: "spa",
    },
    {
      t: "Follow-up",
      d: "Repeat your flagged tests and upload the results",
      s: "todo",
      i: "event_repeat",
    },
  ];

  const done = steps.filter((s) => s.s === "done").length;

  return (
    <Screen>
      <TopBar title="Health Journey" subtitle="Where you are today" />
      <Section>
        <Card className="bg-soft">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon name="progress_activity" className="animate-spin text-primary" />
              Loading your journey…
            </p>
          ) : (
            <>
              <p className="text-sm font-bold text-primary">
                {done === 0
                  ? "Your journey starts here"
                  : `You are ${done} step${done > 1 ? "s" : ""} into your journey`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Each completed step makes your guidance more personal.
              </p>
            </>
          )}
        </Card>
      </Section>

      <Section title="Timeline">
        <ol className="relative space-y-4 pl-2">
          {steps.map((s, i) => (
            <li key={s.t} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-full ${
                    s.s === "done"
                      ? "bg-success/15 text-success"
                      : s.s === "next"
                        ? "bg-brand text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon name={s.i} className="text-[20px]" />
                </span>
                {i < steps.length - 1 ? <span className="mt-1 w-0.5 flex-1 bg-border" /> : null}
              </div>
              <Card className="min-w-0 p-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <p className="truncate text-sm font-bold">{s.t}</p>
                  {s.s === "next" ? <Pill tone="brand">Next</Pill> : null}
                </div>
                <p className="text-xs text-muted-foreground">{s.d}</p>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      <Section>
        <Btn to="/progress" variant="outline" icon="show_chart">
          See my health progress
        </Btn>
      </Section>

      <Section>
        <NextStepCard cta="Plan my next visit" />
      </Section>

      <FlowNav
        steps={[
          {
            to: "/doctors",
            title: "Book your consultation",
            subtitle: "Next step in your journey",
            icon: "stethoscope",
          },
          {
            to: "/therapies",
            title: "Therapy & wellness",
            subtitle: "Suggested after consultation",
            icon: "spa",
          },
        ]}
      />
    </Screen>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Btn, Card, Icon, Pill, Screen, Section, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { formatDate } from "@/hooks/use-overview";
import { useAuth } from "@/hooks/use-auth";
import { listReports } from "@/lib/aaha-api";
import type { ExtractedValue } from "@/lib/report-ocr.functions";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Review extracted values | Aaha Companion" },
      {
        name: "description",
        content: "Check and correct the values Aaha read from your lab reports before saving them.",
      },
      { property: "og:title", content: "Review extracted values | Aaha Companion" },
      { property: "og:description", content: "Confirm your lab values in a few taps." },
    ],
  }),
  component: ReviewScreen,
});

function ReviewScreen() {
  return (
    <RequireAuth message="Sign in to review the values read from your reports.">
      <Review />
    </RequireAuth>
  );
}

function Review() {
  const { userId } = useAuth();
  const reports = useQuery({
    queryKey: ["reports", userId],
    enabled: !!userId,
    queryFn: listReports,
  });

  const rows = (reports.data ?? []).map((r) => ({
    report: r,
    values: (r.extracted_values ?? []) as unknown as ExtractedValue[],
  }));
  const withValues = rows.filter((r) => r.values.length > 0);

  return (
    <Screen>
      <TopBar title="Review Values" subtitle="Edit anything that looks wrong" />

      {reports.isLoading ? (
        <Section>
          <Card className="flex items-center gap-3 text-sm text-muted-foreground">
            <Icon name="progress_activity" className="animate-spin text-primary" />
            Loading your reports…
          </Card>
        </Section>
      ) : reports.error ? (
        <Section>
          <Card className="bg-soft">
            <p className="text-sm font-bold">We couldn't load your reports</p>
            <Btn size="md" className="mt-3" icon="refresh" onClick={() => void reports.refetch()}>
              Try again
            </Btn>
          </Card>
        </Section>
      ) : withValues.length === 0 ? (
        <Section>
          <Card className="bg-soft">
            <div className="flex items-center gap-2 text-primary">
              <Icon name="edit_note" />
              <p className="text-sm font-bold">Nothing to review yet</p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Upload a lab report — Aaha reads the values and asks you to confirm them here.
            </p>
            <Btn to="/upload" className="mt-4" icon="upload_file">
              Upload a report
            </Btn>
          </Card>
        </Section>
      ) : (
        <Section title="Reports with values read by Aaha">
          <ul className="space-y-3">
            {withValues.map(({ report, values }) => {
              const flagged = values.filter((v) => v.status !== "Normal").length;
              return (
                <Card as="li" key={report.id}>
                  <Link to="/report/$id" params={{ id: report.id }} className="block">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{report.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(report.report_date)} · {values.length} value
                          {values.length > 1 ? "s" : ""}
                        </p>
                      </div>
                      <Pill tone={flagged ? "amber" : "green"}>
                        {flagged ? `${flagged} to check` : "All normal"}
                      </Pill>
                    </div>
                    <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                      Review and correct <Icon name="chevron_right" className="text-[18px]" />
                    </p>
                  </Link>
                </Card>
              );
            })}
          </ul>
        </Section>
      )}

      <Section>
        <Btn to="/follow-up" variant="outline" icon="check">
          Continue to follow-up questions
        </Btn>
      </Section>
    </Screen>
  );
}

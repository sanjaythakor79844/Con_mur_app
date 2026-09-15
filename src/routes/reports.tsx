import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, Icon, NextStepCard, Pill, Screen, Section, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { useReadings } from "@/hooks/use-readings";
import { deleteReport, listAssessments, listReports, reportFileUrl, type Report } from "@/lib/aaha-api";
import { apiService, type Report as BackendReport } from "@/lib/api-service";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "My reports | Aaha Companion" },
      {
        name: "description",
        content: "Screening reports, lab reports, consultation notes and check-up history in one place.",
      },
      { property: "og:title", content: "My reports | Aaha Companion" },
      { property: "og:description", content: "Download or share any report, anytime." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Reports,
});

function Reports() {
  return (
    <Screen>
      <TopBar title="Reports" subtitle="Everything saved for you" back={false} />
      <RequireAuth message="Sign in to see the reports saved in your account.">
        <BackendReports />
        <ReportList />
      </RequireAuth>
      <RequireAuth message="Sign in to see your recorded readings.">
        <ReadingSummary />
      </RequireAuth>
      <Section>
        <div className="space-y-3">
          <NextStepCard
            title="Upload Lab Test Reports"
            text="Upload your lab test results (LH/FSH, Testosterone, TSH, etc.) to Kiosk database"
            to="/upload-file"
            cta="Upload Lab Report"
          />
          <NextStepCard
            title="View Uploaded Files"
            text="See all your uploaded lab reports and medical documents"
            to="/my-uploads"
            cta="My Uploads"
          />
        </div>
      </Section>
    </Screen>
  );
}

/** Backend API Reports - From DB_AHHA PostgreSQL Database */
function BackendReports() {
  const { session } = useAuth();
  const backendReports = useQuery({
    queryKey: ["backend-reports"],
    queryFn: () => apiService.getMyReports(),
    enabled: !!session,
  });

  if (backendReports.isLoading) {
    return (
      <Section title="Health Screening Reports">
        <Card className="flex items-center gap-3 text-sm text-muted-foreground">
          <Icon name="progress_activity" className="animate-spin text-primary" />
          Loading screening reports…
        </Card>
      </Section>
    );
  }

  if (!backendReports.data || backendReports.data.reports.length === 0) {
    return null;
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'green';
      case 'moderate': return 'amber';
      case 'high': return 'red';
      default: return 'neutral';
    }
  };

  return (
    <Section title="Health Screening Reports">
      <ul className="space-y-3">
        {backendReports.data.reports.map((report) => (
          <Card as="li" key={report.report_id}>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-primary">
                  AWIS Score: {report.awis_score}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(report.created_at).toLocaleDateString(undefined, {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Pill tone={getRiskColor(report.prediction.risk_level) as any}>
                {report.prediction.risk_level}
              </Pill>
            </div>

            {/* Vital Signs */}
            {report.report_data && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {report.report_data.blood_pressure && (
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-muted-foreground">Blood Pressure</p>
                    <p className="font-semibold">{report.report_data.blood_pressure}</p>
                  </div>
                )}
                {report.report_data.heart_rate && (
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-muted-foreground">Heart Rate</p>
                    <p className="font-semibold">{report.report_data.heart_rate} bpm</p>
                  </div>
                )}
                {report.report_data.weight && (
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-muted-foreground">Weight</p>
                    <p className="font-semibold">{report.report_data.weight} kg</p>
                  </div>
                )}
                {report.report_data.bmi && (
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-muted-foreground">BMI</p>
                    <p className="font-semibold">{report.report_data.bmi}</p>
                  </div>
                )}
              </div>
            )}

            {/* Conditions */}
            {report.prediction.conditions && report.prediction.conditions.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-muted-foreground">Detected Conditions:</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {report.prediction.conditions.map((condition, idx) => (
                    <span
                      key={idx}
                      className="rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive"
                    >
                      {condition}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {report.prediction.recommendations && report.prediction.recommendations.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-muted-foreground">Recommendations:</p>
                <ul className="mt-1 space-y-1">
                  {report.prediction.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground">
                      • {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-3 rounded-lg bg-accent/50 p-2 text-xs text-muted-foreground">
              <Icon name="info" className="mr-1 inline text-[14px]" />
              Report from Kiosk Health Screening
            </div>
          </Card>
        ))}
      </ul>
    </Section>
  );
}

/** Reading counts, always calculated from the values stored in the database. */
function ReadingSummary() {
  const { counts, loading } = useReadings();

  if (loading)
    return (
      <Section title="Readings recorded">
        <Card className="flex items-center gap-3 text-sm text-muted-foreground">
          <Icon name="progress_activity" className="animate-spin text-primary" />
          Loading your readings…
        </Card>
      </Section>
    );

  if (counts.total === 0 && counts.pending === 0) return null;

  const tiles = [
    { t: "Total", v: counts.total, tone: "neutral" as const },
    { t: "Normal", v: counts.normal, tone: "green" as const },
    { t: "Slightly off", v: counts.slightlyOff, tone: "amber" as const },
    { t: "Abnormal", v: counts.abnormal, tone: "red" as const },
  ];

  return (
    <Section title="Readings recorded">
      <Card>
        <ul className="grid grid-cols-4 gap-2 text-center">
          {tiles.map((x) => (
            <li key={x.t}>
              <p className="text-lg font-bold leading-none">{x.v}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{x.t}</p>
            </li>
          ))}
        </ul>
        {counts.pending > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {counts.pending} test{counts.pending === 1 ? "" : "s"} still pending.
          </p>
        ) : null}
      </Card>
    </Section>
  );
}

function ReportList() {
  const qc = useQueryClient();
  const reports = useQuery({ queryKey: ["reports"], queryFn: listReports });
  const assessments = useQuery({ queryKey: ["assessments"], queryFn: listAssessments });

  const remove = useMutation({
    mutationFn: (r: Report) => deleteReport(r),
    onSuccess: () => {
      toast.success("Report removed");
      void qc.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not remove the report"),
  });

  const open = async (r: Report) => {
    if (!r.file_path) {
      toast.info("No file attached to this report");
      return;
    }
    try {
      const url = await reportFileUrl(r.file_path);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open the file");
    }
  };

  const share = async (r: Report) => {
    try {
      const url = r.file_path ? await reportFileUrl(r.file_path) : window.location.href;
      if (navigator.share) await navigator.share({ title: r.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      /* user cancelled */
    }
  };

  if (reports.isLoading)
    return (
      <Section>
        <Card className="flex items-center gap-3 text-sm text-muted-foreground">
          <Icon name="progress_activity" className="animate-spin text-primary" />
          Loading your reports…
        </Card>
      </Section>
    );

  const groups = new Map<string, Report[]>();
  for (const r of reports.data ?? []) {
    const list = groups.get(r.category) ?? [];
    list.push(r);
    groups.set(r.category, list);
  }

  return (
    <>
      {groups.size === 0 ? (
        <Section>
          <Card className="text-center">
            <Icon name="folder_open" className="text-[32px] text-primary" />
            <p className="mt-2 text-sm font-bold">No reports yet</p>
            <p className="text-xs text-muted-foreground">Upload your first lab report to get started.</p>
          </Card>
        </Section>
      ) : null}

      {[...groups.entries()].map(([group, items]) => (
        <Section key={group} title={group}>
          <ul className="space-y-3">
            {items.map((i) => (
              <Card as="li" key={i.id}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="min-w-0">
                    <Link
                      to="/report/$id"
                      params={{ id: i.id }}
                      className="truncate text-sm font-bold text-primary underline-offset-2 hover:underline"
                    >
                      {i.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {new Date(i.report_date).toLocaleDateString(undefined, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  {i.status_label ? (
                    <Pill tone={(i.status_tone as "amber" | "green" | "info" | "neutral") ?? "neutral"}>
                      {i.status_label}
                    </Pill>
                  ) : null}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void open(i)}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-2 text-xs font-semibold text-primary"
                  >
                    <Icon name="download" className="text-[16px]" /> Open
                  </button>
                  <Link
                    to="/report/$id"
                    params={{ id: i.id }}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-2 text-xs font-semibold text-primary"
                  >
                    <Icon name="insights" className="text-[16px]" /> Details
                  </Link>
                  <button
                    type="button"
                    onClick={() => void share(i)}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-2 text-xs font-semibold text-primary"
                  >
                    <Icon name="share" className="text-[16px]" /> Share
                  </button>
                  <button
                    type="button"
                    onClick={() => remove.mutate(i)}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-2 text-xs font-semibold text-destructive"
                  >
                    <Icon name="delete" className="text-[16px]" /> Delete
                  </button>
                </div>
              </Card>
            ))}
          </ul>
        </Section>
      ))}

      {assessments.data && assessments.data.length > 0 ? (
        <Section title="Check-up history">
          <ul className="space-y-3">
            {assessments.data.map((a) => (
              <Card as="li" key={a.id}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">AWIS {a.score ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString()} · {a.complaint || "Guided check-up"}
                    </p>
                  </div>
                  <Pill tone={a.band === "high" ? "red" : a.band === "moderate" ? "amber" : "green"}>
                    {a.band ?? "Saved"}
                  </Pill>
                </div>
                {a.summary ? <p className="mt-2 text-xs text-muted-foreground">{a.summary}</p> : null}
              </Card>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}

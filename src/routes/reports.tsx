import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, Icon, NextStepCard, Pill, Screen, Section, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { useReadings } from "@/hooks/use-readings";
import { deleteReport, listAssessments, listReports, type Report } from "@/lib/aaha-api";
import { apiService, type Report as BackendReport } from "@/lib/api-service";
import { useAuth } from "@/hooks/use-auth";
import { ReportShare } from "@/components/report-share";
export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "My reports | Aaha Companion" },
      {
        name: "description",
        content:
          "Screening reports, lab reports, consultation notes and check-up history in one place.",
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
  const { session, user } = useAuth();
  const backendReports = useQuery({
    queryKey: ["assessments"],
    queryFn: listAssessments,
    enabled: !!session,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
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

  if (!backendReports.data || backendReports.data.length === 0) {
    return null;
  }

  const getRiskColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case "low":
        return "green";
      case "moderate":
        return "amber";
      case "high":
        return "red";
      default:
        return "neutral";
    }
  };

  return (
    <Section title="Health Screening Reports">
      <ul className="space-y-3">
        {backendReports.data.map((report) => (
          <Card as="li" key={report.id}>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-primary">AWIS Score: {report.score}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(report.created_at).toLocaleDateString(undefined, {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Pill tone={getRiskColor(report.band) as any}>{report.band || "Unknown Risk"}</Pill>
            </div>

            {/* Vital Signs */}
            {Boolean(report.readings) && Object.keys(report.readings as any).length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {(report.readings as any).blood_pressure && (
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-muted-foreground">Blood Pressure</p>
                    <p className="font-semibold">
                      {(report.readings as any).blood_pressure.value ||
                        (report.readings as any).blood_pressure}
                    </p>
                  </div>
                )}
                {(report.readings as any).heart_rate && (
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-muted-foreground">Heart Rate</p>
                    <p className="font-semibold">
                      {(report.readings as any).heart_rate.value ||
                        (report.readings as any).heart_rate}{" "}
                      bpm
                    </p>
                  </div>
                )}
                {(report.readings as any).weight && (
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-muted-foreground">Weight</p>
                    <p className="font-semibold">
                      {(report.readings as any).weight.value || (report.readings as any).weight} kg
                    </p>
                  </div>
                )}
                {(report.readings as any).bmi && (
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-muted-foreground">BMI</p>
                    <p className="font-semibold">
                      {(report.readings as any).bmi.value || (report.readings as any).bmi}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Conditions */}
            <Conditions conditions={report.suspected_conditions} />

            <div className="mt-3 rounded-lg bg-accent/50 p-2 text-xs text-muted-foreground">
              <Icon name="info" className="mr-1 inline text-[14px]" />
              {report.source === "kiosk"
                ? "Report from Kiosk Health Screening"
                : "Check-up Assessment Report"}
            </div>

            {Boolean(report.report) && (
              <div className="mt-4 border-t pt-4">
                <ReportShare
                  title="My Aaha health report"
                  summary={(report.report as any)?.executive?.overall || report.summary}
                  document={{
                    title: "Guided check-up report",
                    patientName: user?.name || (report.report as any)?.patientName || "Patient",
                    patientAge: user?.age,
                    patientGender: user?.gender,
                    reportId: report.id,
                    date: new Date(report.created_at),
                    score: {
                      value: report.score as number,
                      max: 20,
                      label: (report.report as any)?.risk_label || report.band,
                      description: (report.report as any)?.risk_description,
                    },
                    summary: (report.report as any)?.executive?.overall || report.summary,
                    rawReport: report.report,
                    sections: [
                      {
                        type: "list",
                        title: "Major findings",
                        items: (report.report as any)?.executive?.majorFindings || [],
                      },
                      {
                        type: "list",
                        title: "Positive observations",
                        items: (report.report as any)?.executive?.positives || [],
                      },
                      {
                        type: "list",
                        title: "Areas of concern",
                        items: (report.report as any)?.executive?.concerns || [],
                      },
                      {
                        type: "text",
                        title: "Why are we concerned?",
                        body: (report.report as any)?.reasoning?.why_concerned,
                      },
                      {
                        type: "text",
                        title: "What can you do?",
                        body: (report.report as any)?.reasoning?.what_to_do,
                      },
                      {
                        type: "text",
                        title: "What we need from you",
                        body: (report.report as any)?.reasoning?.what_we_need,
                      },
                      {
                        type: "table",
                        title: "Therapy & wellness",
                        columns: ["Area", "Recommendation"],
                        rows: ((report.report as any)?.therapy || []).map((t: any) => [
                          t.area,
                          t.recommendation,
                        ]),
                      },
                      {
                        type: "list",
                        title: "Follow-up plan",
                        items: [
                          ...((report.report as any)?.guidance?.followUp || []),
                          ...((report.report as any)?.next_steps || []),
                        ],
                      },
                    ].filter((s) => s.items?.length > 0 || s.body || s.rows?.length > 0) as any,
                  }}
                />
              </div>
            )}

            {report.report_pdf_url && (
              <div className="mt-4 flex gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => {
                    window.open(report.report_pdf_url, "_blank", "noopener");
                  }}
                  className="inline-flex w-full justify-center items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Icon name="download" className="text-[18px]" /> View/Download Report
                </button>
              </div>
            )}
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
  const { session } = useAuth();
  const qc = useQueryClient();
  const reports = useQuery({
    queryKey: ["reports"],
    queryFn: listReports,
    enabled: !!session,
  });
  const assessments = useQuery({
    queryKey: ["assessments"],
    queryFn: listAssessments,
    enabled: !!session,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  const remove = useMutation({
    mutationFn: (r: Report) => deleteReport(r),
    onSuccess: () => {
      toast.success("Report removed");
      void qc.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not remove the report"),
  });


  const open = async (r: Report) => {
    const path = r.file_url || r.file_path;
    if (!path) {
      toast.info("No file attached to this report");
      return;
    }

    if (path.startsWith("http")) {
      try {
        const loadingToastId = toast.loading(`Opening ${r.title}...`);
        const response = await fetch(path, { method: "HEAD" });
        toast.dismiss(loadingToastId);
        
        if (response.status === 403 || response.status === 401) {
          toast.info("Link expired. Refreshing...");
          await qc.invalidateQueries({ queryKey: ["reports"] });
          const updatedReports = await listReports();
          const updatedReport = updatedReports.find((x) => x.id === r.id);
          const newPath = updatedReport?.file_url || updatedReport?.file_path;
          if (newPath && newPath.startsWith("http")) {
             window.open(newPath, "_blank", "noopener");
          } else {
             toast.error("File not available", { description: "Could not refresh file link." });
          }
          return;
        }

        if (response.status === 404) {
          toast.error("File not available", { description: "The file was not found (404)." });
          return;
        }
        
        if (!response.ok) {
          toast.error("File not available", { description: `Server returned ${response.status}` });
          return;
        }
        
        window.open(path, "_blank", "noopener");
      } catch (error) {
        toast.dismiss();
        window.open(path, "_blank", "noopener");
      }
      return;
    }

    // Handle local file path (static server)
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v2";
    const staticUrl = apiBaseUrl.replace("/api/v2", "") + (path.startsWith("/") ? path : "/" + path);
    window.open(staticUrl, "_blank", "noopener");
  };

  const share = async (r: Report) => {
    try {
      const path = r.file_url || r.file_path;
      let url = window.location.href;

      if (path) {
        if (path.startsWith("http")) {
          url = path;
        } else {
          toast.error("Cannot share file. No valid URL available.");
          return;
        }
      } else {
        toast.error("No file available to share.");
        return;
      }
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
            <p className="text-xs text-muted-foreground">
              Upload your first lab report to get started.
            </p>
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
                      {new Date(i.report_date || i.created_at || Date.now()).toLocaleDateString(
                        undefined,
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </p>
                  </div>
                  {i.status_label ? (
                    <Pill
                      tone={(i.status_tone as "amber" | "green" | "info" | "neutral") ?? "neutral"}
                    >
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
                      {new Date(a.created_at).toLocaleDateString()} ·{" "}
                      {a.complaint || "Guided check-up"}
                    </p>
                  </div>
                  <Pill
                    tone={a.band === "high" ? "red" : a.band === "moderate" ? "amber" : "green"}
                  >
                    {a.band ?? "Saved"}
                  </Pill>
                </div>
                {a.summary ? (
                  <p className="mt-2 text-xs text-muted-foreground">{a.summary}</p>
                ) : null}

                {a.report_pdf_url && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        window.open(a.report_pdf_url, "_blank", "noopener");
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-2 text-xs font-semibold text-primary"
                    >
                      <Icon name="download" className="text-[16px]" /> View/Download Report
                    </button>
                  </div>
                )}
              </Card>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}

function Conditions({ conditions }: { conditions: any }) {
  if (Array.isArray(conditions) && conditions.length > 0) {
    return (
      <div className="mt-3">
        <p className="text-xs font-semibold text-muted-foreground">Detected Conditions:</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {conditions.map((condition: any, idx: number) => (
            <span
              key={idx}
              className="rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive"
            >
              {String(condition)}
            </span>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

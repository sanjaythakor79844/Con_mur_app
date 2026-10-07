import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, Icon, NextStepCard, Pill, Screen, Section, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { useReadings } from "@/hooks/use-readings";
import { useOverview } from "@/hooks/use-overview";
import { deleteReport, listAssessments, listReports, type Report } from "@/lib/aaha-api";
import { apiService, type Report as BackendReport } from "@/lib/api-service";
import { useAuth } from "@/hooks/use-auth";
import { ReportShare } from "@/components/report-share";
import { useI18n } from "@/lib/i18n";
export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Health | Aaha Companion" },
      { name: "description", content: "Your health score, markers, and reports." },
    ],
  }),
  component: HealthScreen,
});

function HealthScreen() {
  const { t } = useI18n();
  return (
    <RequireAuth message={t("Sign in to view your health data and reports.")}>
      <Screen>
        <div className="flex items-center justify-between px-5 pt-6 pb-4">
          <h1 className="text-[26px] font-bold leading-tight">{t("Health")}</h1>
        </div>
        <div className="px-5 pb-6 flex flex-col gap-4">
          <HealthContent />
        </div>
      </Screen>
    </RequireAuth>
  );
}

function HealthContent() {
  const { t } = useI18n();
  const { session, user } = useAuth();
  const qc = useQueryClient();
  const { latestAssessment, reports, loading } = useOverview();
  const { counts, loading: loadingCounts } = useReadings();
  const assessments = useQuery({ queryKey: ["assessments"], queryFn: listAssessments, enabled: !!session });

  const remove = useMutation({
    mutationFn: (r: Report) => deleteReport(r),
    onSuccess: () => {
      toast.success("Report removed");
      void qc.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not remove the report"),
  });

  const handleFileAction = async (r: any, action: "view" | "download") => {
    const rawPath = r.file_url || r.file_path || r.fileUrl || r.filePath || r.url || r.path || r.signed_url || r.report_pdf_url || "";
    if (!rawPath) {
      toast.error(t("Original file is unavailable"));
      return;
    }

    if (rawPath.startsWith("http")) {
      if (action === "download") {
        try {
          const dToast = toast.loading("Downloading...");
          const res = await fetch(rawPath);
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          toast.dismiss(dToast);
          const a = document.createElement("a");
          a.href = url;
          a.download = r.file_name || r.title || "download";
          a.click();
        } catch (e) {
          toast.dismiss();
          window.open(rawPath, "_blank", "noopener");
        }
      } else {
        window.open(rawPath, "_blank", "noopener");
      }
    } else {
      try {
        const toastId = toast.loading(`${action === "view" ? "Opening" : "Downloading"} report...`);
        const blob = await apiService.getFileBlob(rawPath, Number(r.id));
        const objectUrl = URL.createObjectURL(blob);
        toast.dismiss(toastId);
        
        if (action === "download") {
          const a = document.createElement("a");
          a.href = objectUrl;
          a.download = r.file_name || r.title || "download";
          a.click();
        } else {
          window.open(objectUrl, "_blank", "noopener");
        }
      } catch (err) {
        toast.dismiss();
        toast.error(t("Original file is unavailable"));
      }
    }
  };

  if (loading) {
    return (
      <Card className="flex items-center gap-3 text-sm text-muted-foreground p-4">
        <Icon name="progress_activity" className="animate-spin text-primary" />
        {t("Loading your health data...")}
      </Card>
    );
  }

  return (
    <>
      {/* Score / Trend Section */}
      <section className="bg-card border border-border rounded-[24px] p-5 flex flex-col items-center">
        <div className="w-full flex justify-between items-center text-[12px] text-muted-foreground mb-4">
          <span className="font-bold tracking-widest text-accent-foreground uppercase">{t("Aaha Score")}</span>
          <span>{latestAssessment ? new Date(latestAssessment.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : t("No score")}</span>
        </div>
        
        <div className="relative shrink-0 w-[160px] h-[136px] flex flex-col items-center justify-center pt-2">
           <svg width="160" height="136" viewBox="0 0 200 170" fill="none" aria-hidden="true" className="absolute inset-0 transition-all duration-1000">
             <circle cx="100" cy="100" r="84" stroke="var(--line)" strokeWidth="14" strokeLinecap="round" strokeDasharray="395.8 527.8" transform="rotate(135 100 100)"/>
             {latestAssessment && (
               <circle cx="100" cy="100" r="84" stroke="var(--primary)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${395.8 * (Number(latestAssessment.score || 0) / 100)} 527.8`} transform="rotate(135 100 100)"/>
             )}
           </svg>
           <div className="text-[64px] leading-none font-bold z-10 text-primary">{latestAssessment ? (latestAssessment.score || 0) : "--"}</div>
        </div>
        
        <p className="mt-2 text-[15px] font-semibold text-center leading-snug">
          {latestAssessment?.summary ? t(latestAssessment.summary) : t("Take a check-up to get your score.")}
        </p>
      </section>

      {/* Markers Section */}
      {latestAssessment?.readings && Object.keys(latestAssessment.readings).length > 0 && (
        <section>
          <h2 className="text-[18px] font-bold mb-3 px-1">{t("Health Markers")}</h2>
          <div className="flex flex-col gap-2">
            {Object.entries(latestAssessment.readings).map(([key, val]: [string, any]) => {
              const isDanger = val.status === 'Low' || val.status === 'High';
              return (
                <div key={key} className="bg-card border border-border rounded-[20px] p-4 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[14px] font-bold capitalize">{t(key.replace(/_/g, ' '))}</span>
                    <span className={`text-[12px] font-semibold ${isDanger ? 'text-danger' : 'text-success'}`}>{t(val.status || "Recorded")}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[20px] font-bold leading-none">{val.value || val}</span>
                    <span className="text-[13px] text-muted-foreground ml-1">{val.unit || ""}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Reports Section */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-[18px] font-bold">{t("Lab Reports")}</h2>
        </div>
        {reports.length > 0 ? (
          <div className="flex flex-col gap-2">
            {reports.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-[20px] p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-[15px] font-bold truncate">{r.title}</p>
                    <p className="text-[13px] text-muted-foreground">{new Date(r.report_date || r.created_at || Date.now()).toLocaleDateString()}</p>
                  </div>
                  {r.status_label && (
                    <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-muted text-muted-foreground">
                      {r.status_label}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleFileAction(r, "view")} className="flex-1 min-h-[36px] flex items-center justify-center gap-1.5 rounded-full bg-accent text-primary text-[13px] font-semibold">
                    <Icon name="visibility" className="text-[16px]" /> {t("View")}
                  </button>
                  <button onClick={() => handleFileAction(r, "download")} className="flex-1 min-h-[36px] flex items-center justify-center gap-1.5 rounded-full bg-accent text-primary text-[13px] font-semibold">
                    <Icon name="download" className="text-[16px]" /> {t("Download")}
                  </button>
                  <button onClick={() => remove.mutate(r as any)} className="min-h-[36px] w-[36px] flex items-center justify-center rounded-full bg-accent text-danger">
                    <Icon name="delete" className="text-[16px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-[20px] p-5 text-center text-muted-foreground">
            {t("No lab reports uploaded yet.")}
          </div>
        )}
      </section>

      {assessments.data && assessments.data.length > 0 ? (
        <section className="mt-4">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-[18px] font-bold">{t("Check-up history")}</h2>
          </div>
          <div className="flex flex-col gap-2">
            {assessments.data.map((a) => (
              <div key={a.id} className="bg-card border border-border rounded-[20px] p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-[15px] font-bold truncate">{t("AWIS")} {a.score ?? "—"}</p>
                    <p className="text-[13px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString()} ·{" "}
                      {t(a.complaint || "Guided check-up")}
                    </p>
                  </div>
                  {a.band && (
                    <span className={`shrink-0 text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${a.band === "high" ? "bg-danger/10 text-danger" : a.band === "moderate" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                      {a.band}
                    </span>
                  )}
                </div>
                {a.summary ? (
                  <p className="text-[14px] text-muted-foreground">{a.summary}</p>
                ) : null}

                {a.report_pdf_url && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleFileAction(a, "view")}
                      className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-primary mt-1"
                    >
                      <Icon name="download" className="text-[16px]" /> {t("View/Download Report")}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <Link to="/upload" className="flex items-center justify-center gap-2 min-h-[56px] rounded-full bg-primary text-primary-foreground text-[16px] font-semibold w-full mt-6 shadow-soft">
        <Icon name="upload_file" className="text-[20px]"/> {t("Upload a lab report")}
      </Link>
    </>
  );
}



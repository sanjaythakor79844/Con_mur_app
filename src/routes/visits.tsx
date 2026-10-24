import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Btn, Card, Icon, Pill, Screen, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { useOverview, formatDate } from "@/hooks/use-overview";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { listAssessments, formatReportDate, type Assessment } from "@/lib/aaha-api";

export const Route = createFileRoute("/visits")({
  head: () => ({
    meta: [
      { title: "Kiosk Screening History | Aaha Companion" },
      {
        name: "description",
        content: "View your verified physical health screenings and measurements recorded at AAHA Wellness Kiosks.",
      },
    ],
  }),
  component: VisitsPage,
});

function VisitsPage() {
  const { t } = useI18n();
  return (
    <RequireAuth message={t("Sign in to view your kiosk screening history.")}>
      <VisitsContent />
    </RequireAuth>
  );
}

function VisitsContent() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { userId } = useAuth();
  const { assessments, loading, error, isUnlinked } = useOverview();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Filter for real Kiosk screenings
  const kioskVisits = assessments.filter(
    (a) => a.source === "kiosk" || Boolean(a.kiosk_id),
  );

  const handlePdfAction = async (
    target: Assessment,
    action: "view" | "download" = "view",
    isRetry = false,
  ) => {
    let rawPath = target.report_pdf_url;
    if (!rawPath) {
      if (target.has_storage_path) {
        toast.info(t("PDF document is pending generation by the kiosk server."));
      } else {
        toast.error(t("No PDF report available for this entry."));
      }
      return;
    }

    if (rawPath.startsWith("gs://")) {
      toast.info(t("PDF document is pending signed URL generation by the kiosk server."));
      return;
    }

    if (!rawPath.startsWith("http")) {
      toast.error(t("Invalid PDF URL format."));
      return;
    }

    setDownloadingId(target.id);
    const toastId = toast.loading(
      action === "download" ? t("Preparing download...") : t("Opening report..."),
    );

    try {
      const res = await fetch(rawPath);
      if (res.status === 403 || res.status === 401) {
        toast.dismiss(toastId);
        if (!isRetry) {
          const retryToast = toast.loading(t("Refreshing report link..."));
          await qc.invalidateQueries({ queryKey: ["assessments", userId] });
          const freshAssessments = await listAssessments();
          toast.dismiss(retryToast);
          const freshRecord = freshAssessments.find((item) => String(item.id) === String(target.id));
          if (
            freshRecord?.report_pdf_url &&
            freshRecord.report_pdf_url !== rawPath &&
            freshRecord.report_pdf_url.startsWith("http")
          ) {
            setDownloadingId(null);
            return handlePdfAction(freshRecord, action, true);
          }
        }
        toast.error(t("Report link has expired. Please try again later."));
        setDownloadingId(null);
        return;
      }

      if (!res.ok) throw new Error(`Failed to fetch file (${res.status})`);

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      toast.dismiss(toastId);

      if (action === "download") {
        const a = document.createElement("a");
        a.href = objectUrl;
        const baseName = target.kiosk_id
          ? `Kiosk_Report_${target.kiosk_id}`
          : target.complaint || "Kiosk_Report";
        a.download = baseName.endsWith(".pdf") ? baseName : `${baseName}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      } else {
        window.open(objectUrl, "_blank", "noopener");
      }
    } catch {
      toast.dismiss(toastId);
      window.open(rawPath, "_blank", "noopener");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Screen>
      <TopBar
        title={t("Kiosk Screenings")}
        subtitle={t("Physical kiosk check-ups & vital history")}
      />

      <div className="flex flex-col gap-4 px-5 pb-12 pt-4 sm:px-6">
        {loading ? (
          <div className="space-y-3.5">
            <div className="h-40 w-full animate-pulse rounded-[24px] bg-muted/60" />
            <div className="h-40 w-full animate-pulse rounded-[24px] bg-muted/60" />
          </div>
        ) : error ? (
          <Card className="border-destructive/30 bg-destructive/10 p-5 text-center">
            <p className="text-sm font-semibold text-destructive">
              {t("Failed to load kiosk screening history.")}
            </p>
            <Btn
              onClick={() => void qc.invalidateQueries({ queryKey: ["assessments", userId] })}
              variant="outline"
              size="sm"
              className="mt-3 w-auto"
            >
              {t("common.retry")}
            </Btn>
          </Card>
        ) : kioskVisits.length === 0 ? (
          isUnlinked ? (
            <Card className="p-8 text-center border-border/80 bg-card">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 mb-3">
                <Icon name="link_off" className="text-[28px]" />
              </div>
              <h2 className="text-base font-bold text-foreground">
                {t("Account not linked yet")}
              </h2>
              <p className="mt-1.5 max-w-xs mx-auto text-xs text-muted-foreground leading-relaxed">
                {t(
                  "Your authenticated account is not yet linked to a kiosk patient profile. If you have done a physical kiosk check-up, your clinical reports and vitals will appear once linking completes.",
                )}
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                <Btn
                  onClick={() => void qc.invalidateQueries({ queryKey: ["assessments", userId] })}
                  icon="refresh"
                  size="sm"
                  className="sm:w-auto"
                >
                  {t("Check Sync Status")}
                </Btn>
                <Btn to="/appointments" variant="outline" icon="near_me" size="sm" className="sm:w-auto">
                  {t("Find Nearest Kiosk Centre")}
                </Btn>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center border-border/80 bg-card">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-primary mb-3">
                <Icon name="monitor_heart" className="text-[28px]" />
              </div>
              <h2 className="text-base font-bold text-foreground">
                {t("No kiosk screenings recorded yet")}
              </h2>
              <p className="mt-1.5 max-w-xs mx-auto text-xs text-muted-foreground leading-relaxed">
                {t(
                  "When you visit any AAHA Health Kiosk and enter your phone number, your physical check-up reports, vitals, and doctor-signed PDFs will automatically appear here.",
                )}
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                <Btn to="/appointments" icon="near_me" size="sm" className="sm:w-auto">
                  {t("Find Nearest Kiosk Centre")}
                </Btn>
                <Btn to="/checkup" variant="outline" icon="clinical_notes" size="sm" className="sm:w-auto">
                  {t("Start Online Check-up")}
                </Btn>
              </div>
            </Card>
          )
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {kioskVisits.length} {t("Kiosk Check-up")}{kioskVisits.length > 1 ? "s" : ""}
              </span>
              <Link to="/reports" className="text-xs font-bold text-primary hover:underline">
                {t("All Health Reports")} →
              </Link>
            </div>

            {kioskVisits.map((item) => {
              const readings = (item.readings || {}) as Record<string, any>;
              const vitalsList = Object.entries(readings).slice(0, 4);
              const hasPdf = Boolean(item.report_pdf_url && item.report_pdf_url.startsWith("http"));

              return (
                <Card
                  key={item.id}
                  className="p-4 border-border/80 bg-card flex flex-col gap-3 shadow-soft hover:border-primary/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary mt-0.5">
                        <Icon name="monitor_heart" className="text-[20px]" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-foreground truncate">
                          {item.kiosk_id
                            ? `${t("Kiosk Screening")} #${item.kiosk_id}`
                            : item.complaint || t("Physical Health Screening")}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(item.created_at)} • {t("Kiosk Centre")}
                        </p>
                      </div>
                    </div>

                    {item.band && (
                      <Pill
                        tone={
                          item.band === "high"
                            ? "red"
                            : item.band === "moderate"
                              ? "amber"
                              : "green"
                        }
                      >
                        {item.band}
                      </Pill>
                    )}
                  </div>

                  {item.summary && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {item.summary}
                    </p>
                  )}

                  {/* Vitals Grid */}
                  {vitalsList.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
                      {vitalsList.map(([key, val]) => {
                        const isObj = typeof val === "object" && val !== null;
                        const vVal = isObj ? val.value ?? "" : val;
                        const vUnit = isObj ? val.unit || "" : "";
                        return (
                          <div key={key} className="p-2 rounded-xl bg-muted/40 text-left">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                              {key.replace(/_/g, " ")}
                            </span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className="text-sm font-bold text-foreground">{vVal}</span>
                              {vUnit && (
                                <span className="text-[10px] text-muted-foreground">{vUnit}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                    <Link
                      to="/report/$id"
                      params={{ id: item.id }}
                      className="flex-1 min-h-[38px] flex items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:brightness-105 active:scale-95 transition-all"
                    >
                      <Icon name="visibility" className="text-[16px]" />
                      <span>{t("View Details")}</span>
                    </Link>

                    {hasPdf ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handlePdfAction(item, "view")}
                          disabled={downloadingId === item.id}
                          className="flex-1 min-h-[38px] flex items-center justify-center gap-1.5 rounded-full bg-accent text-primary text-xs font-semibold hover:bg-accent/80 active:scale-95 transition-all"
                        >
                          <Icon name="picture_as_pdf" className="text-[16px]" />
                          <span>{t("Open PDF")}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePdfAction(item, "download")}
                          disabled={downloadingId === item.id}
                          aria-label={t("Download PDF")}
                          className="size-[38px] flex items-center justify-center rounded-full bg-accent text-primary hover:bg-accent/80 active:scale-95 transition-all shrink-0"
                        >
                          <Icon name="download" className="text-[16px]" />
                        </button>
                      </>
                    ) : (
                      <div className="flex-1 min-h-[38px] flex items-center justify-center gap-1.5 rounded-full bg-muted text-muted-foreground text-xs font-medium border border-border/50 px-3 cursor-default">
                        <Icon name="picture_as_pdf" className="text-[16px] text-muted-foreground/60" />
                        <span>{t("PDF not available yet")}</span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Screen>
  );
}

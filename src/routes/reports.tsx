import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Card, Icon, Screen, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { useOverview } from "@/hooks/use-overview";
import { deleteReport, listAssessments, type Report, type Assessment } from "@/lib/aaha-api";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Health Reports & Lab Results | Aaha Companion" },
      { name: "description", content: "Your verified kiosk screenings, laboratory reports, and biomarker explanations." },
    ],
  }),
  component: ReportsScreen,
});

function ReportsScreen() {
  const { t } = useI18n();
  return (
    <RequireAuth message={t("Sign in to view your health data and reports.")}>
      <Screen>
        <ReportsContent />
      </Screen>
    </RequireAuth>
  );
}

function ReportsContent() {
  const { t } = useI18n();
  const { userId } = useAuth();
  const qc = useQueryClient();
  const { assessments, reports, latestAssessment, loading, error } = useOverview();
  const [activeTab, setActiveTab] = useState<"all" | "kiosk" | "lab">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const remove = useMutation({
    mutationFn: (r: Report) => deleteReport(r),
    onSuccess: () => {
      toast.success(t("Report removed"));
      void qc.invalidateQueries({ queryKey: ["reports", userId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("Could not remove the report")),
  });

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    const toastId = toast.loading(t("Refreshing health records..."));
    try {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["assessments", userId] }),
        qc.invalidateQueries({ queryKey: ["reports", userId] }),
        qc.invalidateQueries({ queryKey: ["test-readings", userId] }),
      ]);
      toast.dismiss(toastId);
      toast.success(t("Health records updated"));
    } catch {
      toast.dismiss(toastId);
      toast.error(t("Could not refresh records"));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFileAction = async (
    r: any,
    action: "view" | "download",
    isRetry = false
  ) => {
    let rawPath = r.report_pdf_url || r.file_url || "";
    // Protect against exposing internal storage paths
    if (typeof rawPath === "string" && rawPath.startsWith("gs://")) {
      rawPath = "";
    }

    if (!rawPath || !rawPath.startsWith("http")) {
      toast.info(t("PDF is not available yet"));
      return;
    }

    const toastId = toast.loading(
      action === "download" ? t("Downloading...") : t("Opening report...")
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
          const freshRecord = freshAssessments.find(
            (item) => String(item.id) === String(r.id)
          );
          if (
            freshRecord?.report_pdf_url &&
            freshRecord.report_pdf_url !== rawPath &&
            freshRecord.report_pdf_url.startsWith("http")
          ) {
            return handleFileAction(freshRecord, action, true);
          }
        }
        toast.error(t("Report link has expired. Please try again later."));
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to fetch file (${res.status})`);
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      toast.dismiss(toastId);

      if (action === "download") {
        const a = document.createElement("a");
        a.href = objectUrl;
        const baseName = r.kiosk_id
          ? `Kiosk_Report_${r.kiosk_id}`
          : r.file_name || r.title || "Health_Report";
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
      // Direct window open fallback
      if (action === "view") {
        window.open(rawPath, "_blank", "noopener");
      } else {
        const a = document.createElement("a");
        a.href = rawPath;
        const baseName = r.kiosk_id
          ? `Kiosk_Report_${r.kiosk_id}`
          : r.file_name || r.title || "Health_Report";
        a.download = baseName.endsWith(".pdf") ? baseName : `${baseName}.pdf`;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  };

  const totalReports = assessments.length + reports.length;
  const kioskCount = assessments.length;
  const labCount = reports.length;

  return (
    <div className="px-5 pt-6 pb-12 flex flex-col gap-4">
      {/* Top Header with title, refresh button, and upload shortcut */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold leading-tight">{t("Health Reports")}</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {t("Kiosk screenings & laboratory test results")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            aria-label={t("Refresh reports")}
            className="size-10 rounded-full border border-border bg-card flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all shadow-sm"
          >
            <Icon
              name="refresh"
              className={`text-[20px] text-primary ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
          <Link
            to="/upload"
            className="h-10 px-4 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold flex items-center gap-1.5 shadow-soft hover:brightness-105 active:scale-95 transition-all"
          >
            <Icon name="upload_file" className="text-[18px]" />
            <span>{t("Upload")}</span>
          </Link>
        </div>
      </div>

      {/* Summary Score Banner if verified score exists */}
      {latestAssessment && typeof latestAssessment.score === "number" && latestAssessment.score > 0 ? (
        <section className="bg-card border border-border rounded-[24px] p-4 shadow-soft flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-[20px] font-bold text-primary">{latestAssessment.score}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-foreground truncate">
                  {t("Latest AWIS Score")}
                </span>
                {latestAssessment.band ? (
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      latestAssessment.band === "high"
                        ? "bg-danger/10 text-danger"
                        : latestAssessment.band === "moderate"
                        ? "bg-warning/10 text-warning"
                        : "bg-success/10 text-success"
                    }`}
                  >
                    {latestAssessment.band}
                  </span>
                ) : null}
              </div>
              <p className="text-[12px] text-muted-foreground truncate">
                {latestAssessment.kiosk_id
                  ? `${t("Recorded at")} ${latestAssessment.kiosk_id}`
                  : t("Verified screening")}
                {" · "}
                {new Date(latestAssessment.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
          </div>
          <Link
            to="/report/$id"
            params={{ id: latestAssessment.id }}
            className="text-[13px] font-semibold text-primary hover:underline shrink-0"
          >
            {t("View analysis")} →
          </Link>
        </section>
      ) : null}

      {/* Upload & Sync Records Options */}
      <section className="bg-card border border-border rounded-[22px] p-3.5 shadow-soft flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[12px] font-bold text-foreground flex items-center gap-1.5">
            <Icon name="cloud_upload" className="text-[17px] text-primary" />
            {t("Upload & Sync Options")}
          </span>
          <Link
            to="/my-uploads"
            className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
          >
            {t("My Uploads")} ({reports.length}) <Icon name="chevron_right" className="text-[14px]" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Link
            to="/upload"
            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted hover:border-primary/40 transition-all text-left"
          >
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon name="auto_awesome" className="text-[17px]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-foreground leading-tight truncate">
                {t("Common Upload (AI OCR)")}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {t("Camera, PDF & 16 categories")}
              </p>
            </div>
          </Link>

          <Link
            to="/upload-file"
            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted hover:border-primary/40 transition-all text-left"
          >
            <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
              <Icon name="science" className="text-[17px]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-foreground leading-tight truncate">
                {t("7 Lab Types (Kiosk DB)")}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {t("LH/FSH, TSH, Ferritin, etc.")}
              </p>
            </div>
          </Link>

          <Link
            to="/upload-report"
            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted hover:border-primary/40 transition-all text-left"
          >
            <div className="size-8 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
              <Icon name="monitor_heart" className="text-[17px]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-foreground leading-tight truncate">
                {t("Add to Kiosk Database")}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {t("Screening vitals & AWIS score")}
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* Segmented Filter Tabs */}
      <div className="flex rounded-full bg-muted/60 p-1 border border-border/60">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`flex-1 min-h-[36px] rounded-full text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "all"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>{t("All Reports")}</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-muted font-bold">
            {totalReports}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("kiosk")}
          className={`flex-1 min-h-[36px] rounded-full text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "kiosk"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>{t("Kiosk Check-ups")}</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-muted font-bold">
            {kioskCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("lab")}
          className={`flex-1 min-h-[36px] rounded-full text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "lab"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>{t("Lab Reports")}</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-muted font-bold">
            {labCount}
          </span>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <Card className="flex items-center gap-3 text-sm text-muted-foreground p-5 border border-border">
          <Icon name="progress_activity" className="animate-spin text-primary text-[22px]" />
          <span>{t("Loading your health records...")}</span>
        </Card>
      )}

      {/* Error State with Retry Button */}
      {error && !loading && (
        <div className="bg-danger/10 border border-danger/30 rounded-[20px] p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-danger">
            <Icon name="error" className="text-[20px]" />
            <span className="text-[14px] font-bold">{t("Could not load reports")}</span>
          </div>
          <p className="text-[13px] text-foreground/80">
            {error instanceof Error ? error.message : t("Network error while connecting to health service.")}
          </p>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="self-start mt-1 px-4 py-2 rounded-full bg-danger text-white text-[12px] font-bold hover:brightness-110 active:scale-95 transition-all"
          >
            {t("Retry")}
          </button>
        </div>
      )}

      {/* Content based on Active Tab */}
      {!loading && !error && (
        <div className="flex flex-col gap-4">
          {/* Section: Kiosk Check-up Reports */}
          {(activeTab === "all" || activeTab === "kiosk") && (
            <section className="flex flex-col gap-3">
              {activeTab === "all" && (
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-[16px] font-bold text-foreground">
                    {t("Kiosk Check-up Reports")}
                  </h2>
                  <span className="text-[12px] text-muted-foreground">
                    {kioskCount} {t("recorded")}
                  </span>
                </div>
              )}

              {assessments.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {assessments.map((a: Assessment) => (
                    <KioskReportCard
                      key={`kiosk-${a.id}`}
                      assessment={a}
                      onFileAction={handleFileAction}
                      onRefresh={handleManualRefresh}
                    />
                  ))}
                </div>
              ) : activeTab === "kiosk" ? (
                <div className="bg-card border border-border rounded-[24px] p-8 text-center flex flex-col items-center gap-3 shadow-soft">
                  <div className="size-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Icon name="monitor_heart" className="text-[28px]" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-foreground">
                      {t("No kiosk check-ups yet")}
                    </h3>
                    <p className="text-[13px] text-muted-foreground mt-1 max-w-[280px]">
                      {t("Visit any AAHA Wellness Kiosk to complete a guided health assessment and generate your clinical report.")}
                    </p>
                  </div>
                  <Link
                    to="/checkup"
                    className="mt-1 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold shadow-soft hover:brightness-105 active:scale-95 transition-all"
                  >
                    {t("Start online check-up")}
                  </Link>
                </div>
              ) : null}
            </section>
          )}

          {/* Section: Laboratory Reports */}
          {(activeTab === "all" || activeTab === "lab") && (
            <section className="flex flex-col gap-3">
              {activeTab === "all" && (
                <div className="flex items-center justify-between px-1 pt-2">
                  <h2 className="text-[16px] font-bold text-foreground">
                    {t("Laboratory Reports")}
                  </h2>
                  <span className="text-[12px] text-muted-foreground">
                    {labCount} {t("uploaded")}
                  </span>
                </div>
              )}

              {reports.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {reports.map((r: Report) => (
                    <LabReportCard
                      key={`lab-${r.id}`}
                      report={r}
                      onFileAction={handleFileAction}
                      onDelete={(item) => remove.mutate(item)}
                    />
                  ))}
                </div>
              ) : activeTab === "lab" ? (
                <div className="bg-card border border-border rounded-[24px] p-8 text-center flex flex-col items-center gap-3 shadow-soft">
                  <div className="size-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Icon name="description" className="text-[28px]" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-foreground">
                      {t("No lab reports uploaded yet")}
                    </h3>
                    <p className="text-[13px] text-muted-foreground mt-1 max-w-[280px]">
                      {t("Upload blood tests, thyroid, lipid, or iron reports to receive plain-language biomarker explanations.")}
                    </p>
                  </div>
                  <Link
                    to="/upload"
                    className="mt-1 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold shadow-soft hover:brightness-105 active:scale-95 transition-all"
                  >
                    {t("Upload a lab report")}
                  </Link>
                </div>
              ) : null}
            </section>
          )}

          {/* Combined Empty State */}
          {activeTab === "all" && totalReports === 0 && (
            <div className="bg-card border border-border rounded-[24px] p-8 text-center flex flex-col items-center gap-3 shadow-soft">
              <div className="size-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Icon name="folder_open" className="text-[28px]" />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-foreground">
                  {t("No health records found")}
                </h3>
                <p className="text-[13px] text-muted-foreground mt-1 max-w-[300px]">
                  {t("Complete a check-up at a health kiosk or upload your laboratory reports to start tracking your health journey.")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                <Link
                  to="/upload"
                  className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold shadow-soft hover:brightness-105 active:scale-95 transition-all"
                >
                  {t("Upload Lab Report")}
                </Link>
                <Link
                  to="/checkup"
                  className="px-5 py-2.5 rounded-full border border-primary text-primary text-[13px] font-semibold hover:bg-primary/5 active:scale-95 transition-all"
                >
                  {t("Start Check-up")}
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Card representing a verified Kiosk Assessment Report */
function KioskReportCard({
  assessment,
  onFileAction,
  onRefresh,
}: {
  assessment: Assessment;
  onFileAction: (item: any, action: "view" | "download") => void;
  onRefresh: () => void;
}) {
  const { t } = useI18n();
  const dateFormatted = new Date(assessment.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const readingsMap = (assessment.readings || {}) as Record<string, any>;
  const vitals = Object.entries(readingsMap).slice(0, 3);
  const hasValidPdf = Boolean(
    assessment.report_pdf_url && assessment.report_pdf_url.startsWith("http")
  );

  return (
    <div className="bg-card border border-border rounded-[24px] p-4 flex flex-col gap-3 shadow-soft hover:border-primary/40 transition-all">
      {/* Top Header */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <Icon name="monitor_heart" className="text-[20px]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-foreground truncate">
              {assessment.kiosk_id
                ? `${t("Kiosk Check-up")} #${assessment.kiosk_id}`
                : t(assessment.complaint || "Health Assessment")}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {dateFormatted} · {t("Clinical Screening")}
            </p>
          </div>
        </div>

        {/* Risk Band Pill */}
        {assessment.band ? (
          <span
            className={`shrink-0 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
              assessment.band === "high"
                ? "bg-danger/10 text-danger"
                : assessment.band === "moderate"
                ? "bg-warning/10 text-warning"
                : "bg-success/10 text-success"
            }`}
          >
            {assessment.band}
          </span>
        ) : null}
      </div>

      {/* AWIS Score & Summary */}
      <div className="flex items-center gap-3 bg-muted/40 rounded-2xl p-3 border border-border/40">
        <div className="flex flex-col items-center justify-center bg-card border border-border rounded-xl px-2.5 py-1.5 shrink-0 shadow-sm">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {t("AWIS")}
          </span>
          <span className="text-[18px] font-bold text-primary leading-tight">
            {assessment.score > 0 ? assessment.score : "—"}
          </span>
        </div>
        <p className="text-[13px] text-foreground/90 leading-snug line-clamp-2">
          {assessment.summary ? t(assessment.summary) : t("Comprehensive health assessment recorded.")}
        </p>
      </div>

      {/* Vitals Badges Preview if present */}
      {vitals.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {vitals.map(([key, val]) => {
            const displayVal = typeof val === "object" && val !== null ? val.value : val;
            const unit = typeof val === "object" && val !== null ? val.unit : "";
            return (
              <span
                key={key}
                className="text-[11px] px-2.5 py-1 rounded-full bg-accent text-accent-foreground font-medium flex items-center gap-1"
              >
                <span className="capitalize text-muted-foreground">{key}:</span>
                <span className="font-bold text-foreground">
                  {displayVal} {unit}
                </span>
              </span>
            );
          })}
        </div>
      )}

      {/* Action Row */}
      <div className="flex flex-col gap-2 pt-1 border-t border-border/40">
        <div className="flex gap-2">
          <Link
            to="/report/$id"
            params={{ id: assessment.id }}
            className="flex-1 min-h-[38px] flex items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold hover:brightness-105 active:scale-95 transition-all shadow-sm"
          >
            <Icon name="visibility" className="text-[16px]" />
            <span>{t("View Details")}</span>
          </Link>

          {hasValidPdf ? (
            <>
              <button
                type="button"
                onClick={() => onFileAction(assessment, "view")}
                className="flex-1 min-h-[38px] flex items-center justify-center gap-1.5 rounded-full bg-accent text-primary text-[13px] font-semibold hover:bg-accent/80 active:scale-95 transition-all"
              >
                <Icon name="picture_as_pdf" className="text-[16px]" />
                <span>{t("Open PDF")}</span>
              </button>
              <button
                type="button"
                onClick={() => onFileAction(assessment, "download")}
                aria-label={t("Download PDF")}
                className="size-[38px] flex items-center justify-center rounded-full bg-accent text-primary hover:bg-accent/80 active:scale-95 transition-all shrink-0"
              >
                <Icon name="download" className="text-[16px]" />
              </button>
            </>
          ) : null}
        </div>

        {/* Clear status note if PDF is not available yet */}
        {!hasValidPdf && (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <Icon name="info" className="text-[14px]" />
              <span>
                {assessment.has_storage_path
                  ? t("PDF document is pending generation by kiosk.")
                  : t("Digital checkup summary recorded.")}
              </span>
            </span>
            <button
              type="button"
              onClick={onRefresh}
              className="text-primary font-semibold hover:underline inline-flex items-center gap-0.5"
            >
              <Icon name="refresh" className="text-[13px]" />
              <span>{t("Check status")}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Card representing an Uploaded Laboratory Report */
function LabReportCard({
  report,
  onFileAction,
  onDelete,
}: {
  report: Report;
  onFileAction: (item: any, action: "view" | "download") => void;
  onDelete: (item: Report) => void;
}) {
  const { t } = useI18n();
  const dateFormatted = new Date(
    report.report_date || report.created_at || Date.now()
  ).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const extractedCount = Array.isArray(report.extracted_values)
    ? report.extracted_values.length
    : 0;

  const hasFile = Boolean(report.file_url && report.file_url.startsWith("http"));

  return (
    <div className="bg-card border border-border rounded-[24px] p-4 flex flex-col gap-3 shadow-soft hover:border-primary/40 transition-all">
      {/* Top Header */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="size-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
            <Icon name="science" className="text-[20px]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-foreground truncate">{report.title}</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {dateFormatted} · {report.category || t("Lab report")}
            </p>
          </div>
        </div>

        {report.status_label && (
          <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {report.status_label}
          </span>
        )}
      </div>

      {/* Extracted Biomarkers Summary */}
      <div className="bg-muted/40 rounded-2xl p-3 border border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="biotech" className="text-[18px] text-primary" />
          <span className="text-[13px] font-medium text-foreground">
            {extractedCount > 0
              ? `${extractedCount} ${t("biomarkers read from report")}`
              : t("Document uploaded · Ready for explanation")}
          </span>
        </div>
      </div>

      {/* Action Row */}
      <div className="flex items-center gap-2 pt-1 border-t border-border/40">
        <Link
          to="/report/$id"
          params={{ id: report.id }}
          className="flex-1 min-h-[38px] flex items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold hover:brightness-105 active:scale-95 transition-all shadow-sm"
        >
          <Icon name="auto_awesome" className="text-[16px]" />
          <span>{t("View Explanation")}</span>
        </Link>

        {hasFile && (
          <button
            type="button"
            onClick={() => onFileAction(report, "view")}
            aria-label={t("View original file")}
            className="size-[38px] flex items-center justify-center rounded-full bg-accent text-primary hover:bg-accent/80 active:scale-95 transition-all shrink-0"
          >
            <Icon name="visibility" className="text-[16px]" />
          </button>
        )}

        <button
          type="button"
          onClick={() => onDelete(report)}
          aria-label={t("Delete report")}
          className="size-[38px] flex items-center justify-center rounded-full bg-accent text-danger hover:bg-danger/10 active:scale-95 transition-all shrink-0"
        >
          <Icon name="delete" className="text-[16px]" />
        </button>
      </div>
    </div>
  );
}

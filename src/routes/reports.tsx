import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, Icon, Screen } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { useOverview } from "@/hooks/use-overview";
import { deleteReport, listAssessments, formatReportDate, type Report, type Assessment } from "@/lib/aaha-api";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/reports")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: "all" | "kiosk" | "app" | "lab" } => {
    const t = search.tab;
    if (t === "all" || t === "kiosk" || t === "app" || t === "lab") {
      return { tab: t };
    }
    return { tab: "all" };
  },
  head: () => ({
    meta: [
      { title: "Health Reports & Lab Results | Aaha Companion" },
      {
        name: "description",
        content:
          "Your verified kiosk screenings, laboratory reports, and biomarker explanations.",
      },
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
  const search = Route.useSearch();
  const { userId } = useAuth();
  const qc = useQueryClient();
  const { assessments, reports, latestAssessment, loading, error, isUnlinked } = useOverview();
  const [activeTab, setActiveTab] = useState<"all" | "kiosk" | "app" | "lab">(search.tab || "all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync tab with search parameter if changed
  useEffect(() => {
    if (search.tab && (search.tab === "all" || search.tab === "kiosk" || search.tab === "app" || search.tab === "lab")) {
      setActiveTab(search.tab);
    }
  }, [search.tab]);

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
    isRetry = false,
  ) => {
    let rawPath = r.report_pdf_url || r.file_url || "";
    // Protect against exposing internal storage paths without signing
    if (typeof rawPath === "string" && rawPath.startsWith("gs://")) {
      rawPath = "";
    }

    if (!rawPath || !rawPath.startsWith("http")) {
      toast.info(t("PDF is not available yet"));
      return;
    }

    const toastId = toast.loading(
      action === "download" ? t("Downloading...") : t("Opening report..."),
    );

    try {
      // Direct fetch without Authorization header so GCS signed URL signatures match
      const res = await fetch(rawPath);
      if (res.status === 403 || res.status === 401) {
        toast.dismiss(toastId);
        if (!isRetry) {
          const retryToast = toast.loading(t("Refreshing report link..."));
          await qc.invalidateQueries({ queryKey: ["assessments", userId] });
          const freshAssessments = await listAssessments();
          toast.dismiss(retryToast);
          const freshRecord = freshAssessments.find(
            (item) => String(item.id) === String(r.id),
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
  const kioskAssessments = assessments.filter((a) => a.source === "kiosk");
  const appAssessments = assessments.filter((a) => a.source === "consumer_app");
  const otherAssessments = assessments.filter(
    (a) => a.source !== "kiosk" && a.source !== "consumer_app",
  );
  const kioskCount = kioskAssessments.length;
  const appCount = appAssessments.length;
  const labCount = reports.length;

  return (
    <div className="px-5 pt-6 pb-12 flex flex-col gap-4">
      {/* Top Header */}
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
      {latestAssessment &&
      typeof latestAssessment.score === "number" &&
      latestAssessment.score > 0 ? (
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
                {formatReportDate(latestAssessment.created_at, {
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

      {/* Segmented Filter Tabs: All, Kiosk, App, Lab */}
      <div className="flex rounded-full bg-muted/60 p-1 border border-border/60">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`flex-1 min-h-[36px] rounded-full text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "all"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>{t("All")}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-bold">
            {totalReports}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("kiosk")}
          className={`flex-1 min-h-[36px] rounded-full text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "kiosk"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>{t("Kiosk")}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-bold">
            {kioskCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("app")}
          className={`flex-1 min-h-[36px] rounded-full text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "app"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>{t("App")}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-bold">
            {appCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("lab")}
          className={`flex-1 min-h-[36px] rounded-full text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "lab"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>{t("Lab")}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-bold">
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
            <Icon name={(error as any)?.status === 401 ? "schedule" : "error"} className="text-[20px]" />
            <span className="text-[14px] font-bold">
              {(error as any)?.status === 401 ? t("Session Expired") : t("Could not load reports")}
            </span>
          </div>
          <p className="text-[13px] text-foreground/80">
            {(error as any)?.status === 401
              ? t("Your authentication session has expired. Please sign in again.")
              : error instanceof Error
              ? error.message
              : t("Network error while connecting to health service.")}
          </p>
          {(error as any)?.status === 401 ? (
            <Link
              to="/login"
              className="self-start mt-1 px-4 py-2 rounded-full bg-primary text-primary-foreground text-[12px] font-bold hover:brightness-105 active:scale-95 transition-all"
            >
              {t("Sign in again")}
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleManualRefresh}
              className="self-start mt-1 px-4 py-2 rounded-full bg-danger text-white text-[12px] font-bold hover:brightness-110 active:scale-95 transition-all"
            >
              {t("Retry")}
            </button>
          )}
        </div>
      )}

      {/* Content based on Active Tab */}
      {!loading && !error && (
        <div className="flex flex-col gap-4">
          {/* Account Not Linked Banner */}
          {isUnlinked && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-[20px] p-4 flex items-start gap-3">
              <div className="size-8 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Icon name="link_off" className="text-[18px]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-amber-700 dark:text-amber-300">
                  {t("Kiosk Account Linking Pending")}
                </p>
                <p className="text-[12px] text-foreground/80 mt-0.5 leading-relaxed">
                  {t("Your phone number is authenticated. Kiosk screening reports and clinical AWIS scores will appear automatically once linked to your profile.")}
                </p>
              </div>
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="text-[11px] font-bold text-primary hover:underline shrink-0"
              >
                {t("Refresh")}
              </button>
            </div>
          )}

          {/* Section: Physical Kiosk Screenings */}
          {((activeTab === "all" && kioskAssessments.length > 0) || activeTab === "kiosk") && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1 pt-1">
                <h2 className="text-[16px] font-bold text-foreground">
                  {t("Kiosk Screening Reports")}
                </h2>
                <div className="flex items-center gap-3">
                  <Link
                    to="/visits"
                    className="text-[12px] font-semibold text-primary hover:underline flex items-center gap-0.5"
                  >
                    <span>{t("Full Kiosk History")}</span>
                    <Icon name="chevron_right" className="text-[14px]" />
                  </Link>
                  <span className="text-[12px] text-muted-foreground">
                    {kioskCount} {t("recorded")}
                  </span>
                </div>
              </div>

              {kioskAssessments.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {kioskAssessments.map((a: Assessment) => (
                    <KioskReportCard
                      key={`kiosk-${a.id}`}
                      assessment={a}
                      onFileAction={handleFileAction}
                      onRefresh={handleManualRefresh}
                    />
                  ))}
                </div>
              ) : isUnlinked ? (
                <div className="rounded-[20px] border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
                  <div className="size-8 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon name="link_off" className="text-[18px]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-amber-700 dark:text-amber-300">
                      {t("Kiosk screening records not linked yet")}
                    </p>
                    <p className="text-[12px] text-foreground/80 mt-0.5 leading-relaxed">
                      {t("If you took a health assessment at a kiosk, reports will automatically appear here once linking synchronization completes.")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="text-[11px] font-bold text-primary hover:underline shrink-0"
                  >
                    {t("Check status")}
                  </button>
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
                      {t("Visit any AAHA Wellness Kiosk to complete a physical health assessment and generate your clinical report.")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    <Link
                      to="/appointments"
                      className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold shadow-soft hover:brightness-105 active:scale-95 transition-all"
                    >
                      {t("Find Nearest Kiosk Centre")}
                    </Link>
                    <Link
                      to="/checkup"
                      className="px-5 py-2.5 rounded-full border border-primary text-primary text-[13px] font-semibold hover:bg-primary/5 active:scale-95 transition-all"
                    >
                      {t("Start online check-up")}
                    </Link>
                  </div>
                </div>
              ) : null}
            </section>
          )}

          {/* Section: App Guided Check-up Reports */}
          {((activeTab === "all" && appAssessments.length > 0) || activeTab === "app") && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1 pt-1">
                <h2 className="text-[16px] font-bold text-foreground">
                  {t("Guided Check-up Reports")}
                </h2>
                <span className="text-[12px] text-muted-foreground">
                  {appCount} {t("recorded")}
                </span>
              </div>

              {appAssessments.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {appAssessments.map((a: Assessment) => (
                    <KioskReportCard
                      key={`app-${a.id}`}
                      assessment={a}
                      onFileAction={handleFileAction}
                      onRefresh={handleManualRefresh}
                    />
                  ))}
                </div>
              ) : activeTab === "app" ? (
                <div className="bg-card border border-border rounded-[24px] p-8 text-center flex flex-col items-center gap-3 shadow-soft">
                  <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Icon name="clinical_notes" className="text-[28px]" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-foreground">
                      {t("No guided check-ups yet")}
                    </h3>
                    <p className="text-[13px] text-muted-foreground mt-1 max-w-[280px]">
                      {t("Complete a 5-minute guided health check-up directly inside the app to track your symptoms and AWIS wellness score.")}
                    </p>
                  </div>
                  <Link
                    to="/checkup"
                    className="mt-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold shadow-soft hover:brightness-105 active:scale-95 transition-all"
                  >
                    {t("Start Guided Check-up")}
                  </Link>
                </div>
              ) : null}
            </section>
          )}

          {/* Section: Other Health Records (Neutral fallback) */}
          {activeTab === "all" && otherAssessments.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1 pt-1">
                <h2 className="text-[16px] font-bold text-foreground">
                  {t("Health Records")}
                </h2>
                <span className="text-[12px] text-muted-foreground">
                  {otherAssessments.length} {t("recorded")}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {otherAssessments.map((a: Assessment) => (
                  <KioskReportCard
                    key={`other-${a.id}`}
                    assessment={a}
                    onFileAction={handleFileAction}
                    onRefresh={handleManualRefresh}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Section: Laboratory Reports */}
          {(activeTab === "all" || activeTab === "lab") && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1 pt-2">
                <h2 className="text-[16px] font-bold text-foreground">
                  {t("Laboratory Reports")}
                </h2>
                <div className="flex items-center gap-3">
                  <Link
                    to="/my-uploads"
                    className="text-[12px] font-semibold text-primary hover:underline flex items-center gap-0.5"
                  >
                    <span>{t("My Uploads")}</span>
                    <Icon name="chevron_right" className="text-[14px]" />
                  </Link>
                  <span className="text-[12px] text-muted-foreground">
                    {labCount} {t("uploaded")}
                  </span>
                </div>
              </div>

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
            isUnlinked ? (
              <div className="bg-card border border-border rounded-[24px] p-8 text-center flex flex-col items-center gap-3 shadow-soft">
                <div className="size-14 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Icon name="link_off" className="text-[28px]" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-foreground">
                    {t("Account not linked yet")}
                  </h3>
                  <p className="text-[13px] text-muted-foreground mt-1 max-w-[320px]">
                    {t("Your authenticated account is not yet linked to a kiosk patient profile. If you have done a kiosk screening, your records will appear as soon as linking completes.")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  <button
                    type="button"
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold shadow-soft hover:brightness-105 active:scale-95 transition-all inline-flex items-center gap-1.5"
                  >
                    <Icon name="refresh" className={`text-[16px] ${isRefreshing ? "animate-spin" : ""}`} />
                    <span>{t("Check Sync Status")}</span>
                  </button>
                  <Link
                    to="/upload"
                    className="px-5 py-2.5 rounded-full border border-border bg-card text-foreground text-[13px] font-semibold hover:bg-muted active:scale-95 transition-all"
                  >
                    {t("Upload Lab Report")}
                  </Link>
                </div>
              </div>
            ) : (
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
            )
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
  const dateFormatted = formatReportDate(assessment.created_at);

  const readingsMap = (assessment.readings || {}) as Record<string, any>;
  const vitals = Object.entries(readingsMap).slice(0, 3);
  const hasValidPdf = Boolean(
    assessment.report_pdf_url && assessment.report_pdf_url.startsWith("http")
  );

  const isKiosk = assessment.source === "kiosk";
  const isApp = assessment.source === "consumer_app";
  const displayIcon = isKiosk ? "monitor_heart" : isApp ? "clinical_notes" : "health_metrics";
  const displayTitle = isKiosk
    ? (assessment.kiosk_id ? `${t("Kiosk Check-up")} #${assessment.kiosk_id}` : t("Kiosk Check-up"))
    : isApp
    ? t(assessment.complaint || "Guided Check-up")
    : t(assessment.complaint || "Health Record");
  const displayCategory = isKiosk
    ? t("Kiosk Screening")
    : isApp
    ? t("App Check-up")
    : t("Health Record");

  return (
    <div className="bg-card border border-border rounded-[24px] p-4 flex flex-col gap-3 shadow-soft hover:border-primary/40 transition-all">
      {/* Top Header */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <Icon name={displayIcon} className="text-[20px]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-foreground truncate">
              {displayTitle}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {dateFormatted} · {displayCategory}
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
          ) : (
            <div className="flex-1 min-h-[38px] flex items-center justify-center gap-1.5 rounded-full bg-muted text-muted-foreground text-[12px] font-medium border border-border/50 px-3 cursor-default">
              <Icon name="picture_as_pdf" className="text-[15px] text-muted-foreground/60" />
              <span>{t("PDF not available yet")}</span>
            </div>
          )}
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
  const dateFormatted = formatReportDate(report.report_date || report.created_at);

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

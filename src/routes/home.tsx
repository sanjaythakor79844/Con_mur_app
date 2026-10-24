import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Btn, Card, Icon, Pill, Screen } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { bandLabel, bandTone, formatDate, useDisplayName, useOverview } from "@/hooks/use-overview";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { listAssessments } from "@/lib/aaha-api";
import { toast } from "sonner";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home | Aaha Consumer App" },
      {
        name: "description",
        content:
          "Your health status, appointments, reminders and quick actions — all in one warm, simple dashboard.",
      },
      { property: "og:title", content: "Home | Aaha Consumer App" },
      { property: "og:description", content: "Your health at a glance with Aaha." },
    ],
  }),
  component: HomeScreen,
});

function HomeScreen() {
  return (
    <RequireAuth message="Sign in to see your health dashboard, reports and appointments.">
      <HomeDashboard />
    </RequireAuth>
  );
}

function HomeDashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { patient, userId } = useAuth();
  const { firstName, fullName } = useDisplayName();
  const { latestAssessment, assessments, reports, upcoming, unreadCount, loading, error, isUnlinked } =
    useOverview();

  const displayName = patient?.full_name?.trim() || fullName || firstName || t("Friend");

  const todayStr = new Date()
    .toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
    .toUpperCase();

  interface VitalReading {
    value?: string | number;
    unit?: string;
    status?: string;
  }

  // AWIS score validity (only real scores, no fabrication)
  const hasValidScore =
    latestAssessment && typeof latestAssessment.score === "number" && latestAssessment.score > 0;
  const scoreValue = hasValidScore ? latestAssessment.score : 0;
  const riskTone = bandTone(latestAssessment?.band);
  const riskLabel = bandLabel(latestAssessment);

  // Real verified recorded vitals from backend
  const readingsMap = (latestAssessment?.readings || {}) as Record<
    string,
    VitalReading | string | number
  >;
  const vitalsEntries = Object.entries(readingsMap)
    .filter(([_, val]) => val !== undefined && val !== null)
    .slice(0, 4);

  // Verified condition focus areas
  const conditions = latestAssessment?.suspected_conditions || [];

  // Combine real assessments and uploaded reports for Recent Records
  const allRecords = [
    ...assessments.map((a) => ({
      id: `assessment-${a.id}`,
      title: a.kiosk_id ? `Kiosk Screening #${a.kiosk_id}` : a.complaint || t("Health Screening"),
      category: a.source === "kiosk" || a.kiosk_id ? t("Kiosk Screening") : t("Guided Check-up"),
      date: a.created_at,
      badge: a.score > 0 ? `AWIS ${a.score}` : t("Recorded"),
      icon: a.source === "kiosk" || a.kiosk_id ? "monitor_heart" : "clinical_notes",
      pdfUrl: (a as any).report_pdf_url,
      realId: a.id,
      to: "/reports" as const,
    })),
    ...reports.map((r) => ({
      id: `report-${r.id}`,
      title: r.title || t("Lab Report"),
      category: r.category ? `${r.category}` : t("Lab Report"),
      date: r.created_at,
      badge: r.status_label || t("Completed"),
      icon: "description",
      pdfUrl: r.file_url,
      realId: r.id,
      to: "/reports" as const,
    })),
  ].sort((a, b) => (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0));

  // Deduplicate by URL or unique category+title+date
  const seenRecordKeys = new Set<string>();
  const recentRecords = allRecords
    .filter((item) => {
      const key = item.pdfUrl || `${item.category}-${item.title}-${item.date}`;
      if (seenRecordKeys.has(key)) return false;
      seenRecordKeys.add(key);
      return true;
    })
    .slice(0, 3);

  const QUICK_ACTIONS = [
    {
      to: "/checkup" as const,
      icon: "clinical_notes",
      title: t("Guided Check-up"),
      desc: t("5-min health assessment"),
      highlight: !hasValidScore,
    },
    {
      to: "/assessment" as const,
      icon: "vital_signs",
      title: t("Health Assessment"),
      desc: t("AWIS score & condition risk"),
      highlight: false,
    },
    {
      to: "/upload" as const,
      icon: "upload_file",
      title: t("Upload Lab Report"),
      desc: t("PDF, photo or prescription"),
      highlight: false,
    },
    {
      to: "/appointments" as const,
      icon: "event",
      title: t("Book Consultation"),
      desc: t("Teleconsult or centre visit"),
      highlight: false,
    },
  ];

  const handlePdfAction = async (
    target: { id?: string | number; report_pdf_url?: string; file_url?: string; title?: string; kiosk_id?: string },
    action: "view" | "download" = "view",
    isRetry = false,
  ) => {
    let rawPath = target.report_pdf_url || target.file_url;
    if (!rawPath) {
      toast.error(t("No PDF report available for this entry."));
      return;
    }

    if (typeof rawPath === "string" && rawPath.startsWith("gs://")) {
      toast.info(t("PDF document is pending generation by the kiosk server."));
      return;
    }

    if (!rawPath.startsWith("http")) {
      toast.error(t("No valid PDF report available for this entry."));
      return;
    }

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
            return handlePdfAction(freshRecord, action, true);
          }
        }
        toast.error(t("Report link has expired. Please try again later."));
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
          : target.title || "Health_Report";
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
    }
  };

  return (
    <Screen>
      {/* 1. Header with Personalized Greeting and Date */}
      <header className="px-5 pt-6 pb-3 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <span className="block font-mono text-[11px] font-medium tracking-[0.14em] uppercase text-muted-foreground">
              {todayStr}
            </span>
            <h1 className="mt-1 truncate font-serif text-[28px] font-normal tracking-tight text-foreground sm:text-[32px]">
              {t("Namaste")}, {displayName}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              aria-label="App Selector"
              className="grid size-10 place-items-center rounded-full border border-border/80 bg-card text-foreground transition-all hover:border-line2 active:scale-95"
              title="App Selector"
            >
              <Icon name="apps" className="text-[18px]" />
            </Link>

            <Link
              to="/journey"
              aria-label="Notifications"
              className="relative grid size-10 place-items-center rounded-full border border-border/80 bg-card text-foreground transition-all hover:border-line2 active:scale-95"
            >
              <Icon name="notifications" className="text-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 size-2 rounded-full bg-primary ring-2 ring-card" />
              )}
            </Link>
          </div>
        </div>

        {/* Patient Identity Badge if linked */}
        {patient && patient.patient_id ? (
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 font-mono text-[11px] font-semibold text-primary">
              <Icon name="verified_user" className="text-[14px]" />
              <span>
                {t("Patient ID")}: {patient.patient_id}
              </span>
            </span>
            {patient.age && (
              <span className="rounded-full bg-muted border border-border/80 px-3 py-1 font-mono text-[11px] font-medium text-muted-foreground">
                {t("Age")}: {patient.age}
              </span>
            )}
            {patient.gender && (
              <span className="rounded-full bg-muted border border-border/80 px-3 py-1 font-mono text-[11px] font-medium text-muted-foreground">
                {t(patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1))}
              </span>
            )}
          </div>
        ) : isUnlinked ? (
          <div className="mt-2.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 border border-amber-500/30">
              <Icon name="link_off" className="text-[14px]" />
              <span>{t("Kiosk Profile Linking Pending")}</span>
            </span>
          </div>
        ) : null}
      </header>

      {/* Main Dashboard Canvas */}
      <div className="flex flex-col gap-4 px-5 pb-8 sm:px-6">
        {/* Loading State */}
        {loading ? (
          <div className="space-y-3.5">
            <div className="h-48 w-full animate-pulse rounded-[24px] bg-muted/70" />
            <div className="h-28 w-full animate-pulse rounded-2xl bg-muted/50" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-24 w-full animate-pulse rounded-2xl bg-muted/50" />
              <div className="h-24 w-full animate-pulse rounded-2xl bg-muted/50" />
            </div>
          </div>
        ) : error ? (
          /* Error State */
          <Card className="border-destructive/30 bg-destructive/10 p-5">
            <div className="flex items-center gap-2.5 text-destructive">
              <Icon name={(error as any)?.status === 401 ? "schedule" : "error"} className="text-[22px]" />
              <h2 className="text-base font-bold">
                {(error as any)?.status === 401 ? t("Session Expired") : t("Couldn't load health summary")}
              </h2>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              {(error as any)?.status === 401
                ? t("Your authentication session has expired. Please sign in again.")
                : t("Please check your network connection and try again.")}
            </p>
            {(error as any)?.status === 401 ? (
              <Btn to="/login" size="sm" className="mt-3.5 w-auto">
                {t("Sign in again")}
              </Btn>
            ) : (
              <Btn
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
                className="mt-3.5 w-auto"
              >
                {t("common.retry")}
              </Btn>
            )}
          </Card>
        ) : (
          <>
            {/* 2. Prominent AWIS Score Card (Styled as Liv Inverted Hero Card) */}
            {hasValidScore ? (
              <section className="relative overflow-hidden rounded-[26px] bg-[#F5F5F1] p-6 text-[#0A0A0B] shadow-lifted">
                <div className="flex items-center justify-between text-xs text-[#55554F]">
                  <span className="font-mono text-[11px] font-semibold tracking-[0.14em] uppercase text-[#55554F]">
                    {t("AAHA WELLNESS SCORE")}
                  </span>
                  <span className="font-mono text-[11px] font-medium text-[#55554F]">
                    {formatDate(latestAssessment?.created_at)}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1">
                      <span className="font-serif text-6xl font-normal leading-none text-[#0A0A0B] sm:text-7xl">
                        {scoreValue}
                      </span>
                      <span className="font-mono text-xs font-medium text-[#55554F]">
                        {t("/ 100")}
                      </span>
                    </div>

                    <div className="mt-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider",
                          riskTone === "green" &&
                            "border border-emerald-600/30 bg-emerald-600/15 text-emerald-800",
                          riskTone === "amber" &&
                            "border border-amber-600/30 bg-amber-600/15 text-amber-800",
                          riskTone === "red" &&
                            "border border-rose-600/30 bg-rose-600/15 text-rose-800",
                          riskTone === "neutral" && "bg-[#0A0A0B]/10 text-[#0A0A0B]",
                        )}
                      >
                        <Icon name="shield" className="text-[13px]" />
                        <span>{riskLabel || t("Recorded")}</span>
                      </span>
                    </div>
                  </div>

                  {/* Circular Radial Gauge */}
                  <div className="relative flex size-24 shrink-0 items-center justify-center">
                    <svg className="size-24 -rotate-90" viewBox="0 0 96 96">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-[#0A0A0B]/10"
                        fill="transparent"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="#0A0A0B"
                        strokeWidth="8"
                        strokeDasharray={2 * Math.PI * 40}
                        strokeDashoffset={2 * Math.PI * 40 * (1 - scoreValue / 100)}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Icon name="favorite" className="text-[22px] text-[#0A0A0B]" />
                    </div>
                  </div>
                </div>

                {/* Clinical Summary */}
                <p className="mt-4 text-[13.5px] leading-relaxed text-[#55554F]">
                  {latestAssessment?.summary ||
                    t("Your wellness score is calculated from your verified vitals and symptoms.")}
                </p>

                {/* Action button */}
                <div className="mt-5 pt-3.5 border-t border-[#0A0A0B]/10 flex items-center justify-between">
                  <Link
                    to="/assessment"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A0A0B] hover:opacity-80 transition-opacity"
                  >
                    <span>{t("View full assessment")}</span>
                    <Icon name="arrow_forward" className="text-[16px]" />
                  </Link>

                  {latestAssessment?.source === "kiosk" && (
                    <span className="rounded-full bg-[#0A0A0B] px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase text-[#F5F5F1]">
                      {t("Kiosk Verified")}
                    </span>
                  )}
                </div>
              </section>
            ) : isUnlinked ? (
              <section className="rounded-[26px] border border-amber-500/30 bg-amber-500/5 p-5 text-center shadow-soft">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <Icon name="link_off" className="text-[28px]" />
                </div>
                <h2 className="mt-3 text-lg font-bold text-foreground">{t("Kiosk Account Linking Pending")}</h2>
                <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
                  {t(
                    "Your authenticated account is awaiting link synchronization with your kiosk profile. Your AWIS score and vitals will sync once linked.",
                  )}
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Btn
                    onClick={() => void qc.invalidateQueries({ queryKey: ["assessments", userId] })}
                    icon="refresh"
                    size="sm"
                    className="sm:w-auto"
                  >
                    {t("Check Sync Status")}
                  </Btn>
                  <Btn to="/reports" variant="outline" icon="description" size="sm" className="sm:w-auto">
                    {t("View Reports")}
                  </Btn>
                </div>
              </section>
            ) : (
              /* Honest Empty State for AWIS (Styled as Liv Inverted Hero Card) */
              <section className="relative overflow-hidden rounded-[26px] bg-[#F5F5F1] p-6 text-[#0A0A0B] shadow-lifted">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold tracking-[0.14em] uppercase text-[#55554F]">
                    {t("WELLNESS INTELLIGENCE")}
                  </span>
                  <span className="grid size-9 place-items-center rounded-full bg-[#0A0A0B]/5 text-[#0A0A0B]">
                    <Icon name="clinical_notes" className="text-[19px]" />
                  </span>
                </div>

                <h2 className="mt-3 font-serif text-[26px] font-normal leading-[1.15] text-[#0A0A0B]">
                  {t("No AWIS score yet")}
                </h2>

                <p className="mt-2 text-[13.5px] leading-relaxed text-[#55554F]">
                  {t(
                    "Your Aaha Wellness Intelligence Score (AWIS) will appear here after you complete a guided check-up or visit an Aaha Health Kiosk.",
                  )}
                </p>

                <div className="mt-5">
                  <Link
                    to="/checkup"
                    className="inline-flex w-full min-h-[52px] items-center justify-center gap-2.5 rounded-full bg-[#0A0A0B] px-6 text-[15px] font-semibold text-[#F5F5F1] transition-transform active:scale-[0.985] shadow-sm hover:bg-[#1D1D1F]"
                  >
                    <Icon name="clinical_notes" className="text-[18px]" />
                    <span>{t("Start Guided Check-up")}</span>
                  </Link>
                </div>
              </section>
            )}

            {/* 3. Verified Health Vitals (Shown only if actual backend data exists) */}
            {vitalsEntries.length > 0 && (
              <section>
                <div className="mb-2.5 flex items-center justify-between px-1">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {t("Recorded Vitals")}
                  </h2>
                  <Link to="/screening" className="text-xs font-bold text-primary hover:underline">
                    {t("Details")}
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {vitalsEntries.map(([key, val]) => {
                    const isObj = typeof val === "object" && val !== null;
                    const readingVal = isObj ? ((val as VitalReading).value ?? "") : val;
                    const readingUnit = isObj ? (val as VitalReading).unit || "" : "";
                    const readingStatus = isObj
                      ? (val as VitalReading).status || "Recorded"
                      : "Recorded";
                    const isAbnormal =
                      readingStatus === "High" ||
                      readingStatus === "Low" ||
                      readingStatus === "Attention";

                    return (
                      <Card key={key} className="p-3 border-border/80 bg-card">
                        <span className="block truncate text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          {key.replace(/_/g, " ")}
                        </span>
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="text-lg font-bold text-foreground truncate">
                            {readingVal}
                          </span>
                          {readingUnit && (
                            <span className="text-[11px] text-muted-foreground font-medium">
                              {readingUnit}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              isAbnormal ? "bg-danger" : "bg-success",
                            )}
                          />
                          <span
                            className={cn(
                              "font-semibold",
                              isAbnormal ? "text-danger" : "text-success",
                            )}
                          >
                            {t(readingStatus)}
                          </span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Verified Focus Conditions if present */}
            {conditions.length > 0 && (
              <section className="rounded-2xl border border-border/80 bg-card p-3.5">
                <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {t("Focus Areas")}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {conditions.map((c) => (
                    <Pill key={c} tone="brand" icon="health_and_safety">
                      {c}
                    </Pill>
                  ))}
                </div>
              </section>
            )}

            {/* 4. Clear Next Step Card (Rendered when patient has an actual upcoming appointment) */}
            {upcoming ? (
              <section className="rounded-2xl border border-primary/30 bg-accent/30 p-4">
                <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
                  <Icon name="event_available" className="text-[18px]" />
                  <span>{t("Upcoming Visit")}</span>
                </div>
                <h3 className="mt-1 text-base font-bold text-foreground">
                  {formatDate(upcoming.scheduled_for)}, {upcoming.slot_label}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  {upcoming.doctor_name || upcoming.speciality} • {upcoming.mode}
                  {upcoming.centre ? ` • ${upcoming.centre}` : ""}
                </p>
                <div className="mt-3">
                  <Btn to="/appointments" variant="outline" size="sm">
                    {t("View Appointment")}
                  </Btn>
                </div>
              </section>
            ) : null}

            {/* 5. Quick Actions Horizontal Row */}
            <section>
              <h2 className="mb-2.5 px-1 font-mono text-[11px] font-medium tracking-[0.14em] uppercase text-muted-foreground">
                {t("Quick actions")}
              </h2>
              <div
                tabIndex={0}
                aria-label={t("Quick actions")}
                className="-mx-5 sm:-mx-6 flex gap-3 overflow-x-auto px-5 sm:px-6 pb-2 pt-0.5 scroll-smooth snap-x snap-mandatory overscroll-x-contain focus:outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {QUICK_ACTIONS.map((q) => (
                  <Link
                    key={q.to}
                    to={q.to}
                    className={cn(
                      "group flex w-[152px] sm:w-[160px] h-[156px] shrink-0 snap-start flex-col justify-between rounded-[22px] border p-4 transition-all duration-150 active:scale-[0.98]",
                      q.highlight
                        ? "border-primary/50 bg-accent/30 ring-1 ring-primary/20 hover:border-primary"
                        : "border-border/80 bg-card hover:border-line2",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "grid size-10 place-items-center rounded-xl border transition-colors",
                          q.highlight
                            ? "border-primary/30 bg-primary/15 text-primary"
                            : "border-border/80 bg-accent/60 text-primary group-hover:border-primary/40",
                        )}
                      >
                        <Icon name={q.icon} className="text-[20px]" />
                      </span>
                      <Icon
                        name="chevron_right"
                        className="text-[16px] text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-foreground"
                      />
                    </div>
                    <div className="mt-3 min-w-0">
                      <span className="block text-[13.5px] font-semibold text-foreground leading-snug">
                        {q.title}
                      </span>
                      <span className="block text-[11px] text-muted-foreground font-normal mt-1 leading-snug line-clamp-2">
                        {q.desc}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* 6. Recent Reports & Kiosk Screenings Section */}
            <section>
              <div className="mb-2.5 flex items-center justify-between px-1">
                <h2 className="font-mono text-[11px] font-medium tracking-[0.14em] uppercase text-muted-foreground">
                  {t("Recent Health Records")}
                </h2>
                <Link to="/reports" className="font-mono text-[11px] font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground">
                  {t("View All Reports")}
                </Link>
              </div>

              {recentRecords.length > 0 ? (
                <div className="space-y-2.5">
                  {recentRecords.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3.5 rounded-[22px] border border-border/80 bg-card p-3.5 transition-all duration-150 hover:border-line2 active:scale-[0.99]"
                    >
                      <Link to={item.to} className="flex items-center gap-3.5 flex-1 min-w-0">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground border border-border/80">
                          <Icon name={item.icon} className="text-[20px]" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="block truncate text-[14px] font-semibold text-foreground">
                            {item.title}
                          </span>
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{item.category}</span>
                            <span>•</span>
                            <span>{formatDate(item.date)}</span>
                          </div>
                        </div>
                      </Link>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.pdfUrl && item.pdfUrl.startsWith("http") ? (
                          <button
                            type="button"
                            onClick={() =>
                              handlePdfAction(
                                { id: item.realId, file_url: item.pdfUrl, title: item.title },
                                "view",
                              )
                            }
                            className="grid size-8 place-items-center rounded-lg border border-border/80 bg-muted text-primary hover:border-primary/40 transition-colors"
                            title={t("Open PDF")}
                          >
                            <Icon name="picture_as_pdf" className="text-[17px]" />
                          </button>
                        ) : (
                          <span className="font-mono text-[9.5px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted/60 border border-border/80">
                            {t("PDF not available yet")}
                          </span>
                        )}

                        <span className="font-mono text-[10.5px] uppercase tracking-wider rounded-full bg-muted border border-line2 px-2.5 py-1 font-medium text-foreground">
                          {item.badge}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : isUnlinked ? (
                <Card className="p-5 text-center border-amber-500/30 bg-amber-500/5">
                  <div className="mx-auto grid size-10 place-items-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 mb-2">
                    <Icon name="link_off" className="text-[20px]" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    {t("Account not linked yet")}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    {t("If you completed a kiosk check-up, your clinical reports will appear here once account linking is synchronized.")}
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <Btn
                      onClick={() => void qc.invalidateQueries({ queryKey: ["assessments", userId] })}
                      size="sm"
                      icon="refresh"
                    >
                      {t("Check Sync Status")}
                    </Btn>
                    <Btn to="/upload" variant="outline" size="sm" icon="upload_file">
                      {t("Upload Lab Report")}
                    </Btn>
                  </div>
                </Card>
              ) : (
                <Card className="p-4 text-center border-border/80 bg-card">
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "No reports yet. Upload a lab report or sync records from an Aaha Health Kiosk.",
                    )}
                  </p>
                </Card>
              )}
            </section>

            {/* 7. Ask Aaha Banner */}
            <Link
              to="/aaha"
              search={{ report: undefined }}
              className="flex items-center justify-between rounded-[22px] border border-border/80 bg-card px-4 py-3.5 text-foreground transition-all duration-150 hover:border-line2 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-[#F5F5F1] text-[#0A0A0B] shadow-sm">
                  <Icon name="favorite" className="text-[18px]" />
                </span>
                <span className="text-[13.5px] font-semibold text-foreground">
                  {t("Ask Aaha about your results")}
                </span>
              </div>
              <span className="grid size-9 place-items-center rounded-full border border-border/80 bg-muted text-foreground">
                <Icon name="mic" className="text-[18px]" />
              </span>
            </Link>
          </>
        )}
      </div>
    </Screen>
  );
}

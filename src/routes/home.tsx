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
  const { latestAssessment, assessments, reports, upcoming, unreadCount, loading, error } =
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
  const recentRecords = [
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
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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

    if (rawPath.startsWith("gs://")) {
      rawPath = rawPath.replace("gs://", "https://storage.googleapis.com/");
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
            <span className="block text-xs font-bold tracking-widest uppercase text-muted-foreground">
              {todayStr}
            </span>
            <h1 className="mt-0.5 truncate text-2xl font-bold tracking-tight text-foreground sm:text-[26px]">
              {t("Namaste")}, {displayName}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick App Switcher to Liv */}
            <Link
              to="/liv"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/20 bg-accent/60 text-xs font-semibold text-primary hover:bg-accent transition-colors"
              title={t("Switch to Liv Longevity Companion")}
            >
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Liv App</span>
            </Link>

            <Link
              to="/"
              aria-label="App Selector"
              className="grid size-9 place-items-center rounded-xl border border-border/80 bg-card text-foreground transition-colors hover:bg-muted/60"
              title="App Selector"
            >
              <Icon name="apps" className="text-[18px]" />
            </Link>

            <Link
              to="/journey"
              aria-label="Notifications"
              className="relative grid size-9 place-items-center rounded-xl border border-border/80 bg-card text-foreground transition-colors hover:bg-muted/60"
            >
              <Icon name="notifications" className="text-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger ring-2 ring-card" />
              )}
            </Link>
          </div>
        </div>

        {/* Patient Identity Badge if linked */}
        {patient && (
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-primary">
              <Icon name="verified_user" className="text-[14px]" />
              <span>
                {t("Patient ID")}: {patient.patient_id}
              </span>
            </span>
            {patient.age && (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {t("Age")}: {patient.age}
              </span>
            )}
            {patient.gender && (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {t(patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1))}
              </span>
            )}
          </div>
        )}
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
              <Icon name="error" className="text-[22px]" />
              <h2 className="text-base font-bold">{t("Couldn't load health summary")}</h2>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              {t("Please check your network connection and try again.")}
            </p>
            <Btn
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="mt-3.5 w-auto"
            >
              {t("common.retry")}
            </Btn>
          </Card>
        ) : (
          <>
            {/* 2. Prominent AWIS Score Card */}
            {hasValidScore ? (
              <section className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#0B4F50] to-[#083D3E] p-5 text-white shadow-lifted">
                {/* Background decorative soft glow */}
                <div className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-[#2DD4BF]/10 blur-2xl" />

                <div className="flex items-center justify-between text-xs text-emerald-100/80">
                  <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#2DD4BF]">
                    <Icon name="verified" className="text-[16px]" />
                    <span>{t("Aaha Wellness Score")}</span>
                  </span>
                  <span className="text-[11px] font-medium text-white/70">
                    {formatDate(latestAssessment?.created_at)}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-extrabold leading-none tracking-tight text-white sm:text-6xl">
                        {scoreValue}
                      </span>
                      <span className="text-sm font-semibold text-emerald-100/70">
                        {t("out of 100")}
                      </span>
                    </div>

                    <div className="mt-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-2xs",
                          riskTone === "green" &&
                            "border border-emerald-400/30 bg-emerald-500/25 text-emerald-200",
                          riskTone === "amber" &&
                            "border border-amber-400/30 bg-amber-500/25 text-amber-200",
                          riskTone === "red" &&
                            "border border-rose-400/30 bg-rose-500/25 text-rose-200",
                          riskTone === "neutral" && "border border-white/20 bg-white/15 text-white",
                        )}
                      >
                        <Icon name="shield" className="text-[14px]" />
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
                        className="text-white/15"
                        fill="transparent"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="#2DD4BF"
                        strokeWidth="8"
                        strokeDasharray={2 * Math.PI * 40}
                        strokeDashoffset={2 * Math.PI * 40 * (1 - scoreValue / 100)}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Icon name="favorite" className="text-[22px] text-[#2DD4BF]" />
                    </div>
                  </div>
                </div>

                {/* Clinical Summary */}
                <p className="mt-4 text-xs leading-relaxed text-emerald-50/90 sm:text-[13px]">
                  {latestAssessment?.summary ||
                    t("Your wellness score is calculated from your verified vitals and symptoms.")}
                </p>

                {/* Action button */}
                <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between">
                  <Link
                    to="/assessment"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2DD4BF] hover:text-white transition-colors"
                  >
                    <span>{t("View full assessment")}</span>
                    <Icon name="arrow_forward" className="text-[16px]" />
                  </Link>

                  {latestAssessment?.source === "kiosk" && (
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white/80">
                      {t("Kiosk Verified")}
                    </span>
                  )}
                </div>
              </section>
            ) : (
              /* Honest Empty State for AWIS (No score fabricated) */
              <section className="rounded-[26px] border border-border/80 bg-gradient-to-b from-card to-muted/40 p-5 text-center shadow-soft">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-primary">
                  <Icon name="clinical_notes" className="text-[28px]" />
                </div>
                <h2 className="mt-3 text-lg font-bold text-foreground">{t("No AWIS score yet")}</h2>
                <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
                  {t(
                    "Your Aaha Wellness Intelligence Score (AWIS) will appear here after you complete a guided check-up or visit an Aaha Health Kiosk.",
                  )}
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Btn to="/checkup" icon="clinical_notes" size="sm" className="sm:w-auto">
                    {t("Start Guided Check-up")}
                  </Btn>
                  <Btn
                    to="/upload"
                    variant="outline"
                    icon="upload_file"
                    size="sm"
                    className="sm:w-auto"
                  >
                    {t("Upload Lab Report")}
                  </Btn>
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

            {/* 4. Clear Next Step Card */}
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
            ) : !hasValidScore ? (
              <section className="rounded-2xl border border-border/80 bg-card p-4">
                <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
                  <Icon name="recommend" className="text-[18px]" />
                  <span>{t("Recommended Next Step")}</span>
                </div>
                <h3 className="mt-1 text-base font-bold text-foreground">
                  {t("Start a guided check-up")}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  {t("Answer 5 quick questions to calculate your initial AWIS wellness score.")}
                </p>
                <div className="mt-3">
                  <Btn to="/checkup" icon="clinical_notes" size="sm">
                    {t("Start Guided Check-up")}
                  </Btn>
                </div>
              </section>
            ) : reports.length === 0 ? (
              <section className="rounded-2xl border border-border/80 bg-card p-4">
                <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
                  <Icon name="recommend" className="text-[18px]" />
                  <span>{t("Recommended Next Step")}</span>
                </div>
                <h3 className="mt-1 text-base font-bold text-foreground">
                  {t("Add your lab report")}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  {t(
                    "Upload recent blood tests or lab results so Aaha can extract your markers and explain them.",
                  )}
                </p>
                <div className="mt-3">
                  <Btn to="/upload" icon="upload_file" size="sm">
                    {t("Upload Lab Report")}
                  </Btn>
                </div>
              </section>
            ) : (
              <section className="rounded-2xl border border-border/80 bg-card p-4">
                <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
                  <Icon name="recommend" className="text-[18px]" />
                  <span>{t("Recommended Next Step")}</span>
                </div>
                <h3 className="mt-1 text-base font-bold text-foreground">
                  {t("Review your results with a doctor")}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  {t(
                    "Consult with a specialist at an Aaha Health Centre or via video to discuss your health plan.",
                  )}
                </p>
                <div className="mt-3">
                  <Btn to="/appointments" icon="event" size="sm">
                    {t("Book a consultation")}
                  </Btn>
                </div>
              </section>
            )}

            {/* 5. Quick Actions Grid */}
            <section>
              <h2 className="mb-2.5 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("Quick actions")}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {QUICK_ACTIONS.map((q) => (
                  <Link
                    key={q.to}
                    to={q.to}
                    className={cn(
                      "group flex flex-col justify-between rounded-2xl border p-3.5 transition-all active:scale-[0.98] hover:border-primary/40",
                      q.highlight
                        ? "border-primary/40 bg-accent/30 ring-1 ring-primary/20"
                        : "border-border/80 bg-card",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="grid size-11 place-items-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <Icon name={q.icon} className="text-[22px]" />
                      </span>
                      <Icon
                        name="chevron_right"
                        className="text-[18px] text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      />
                    </div>
                    <div className="mt-3 min-w-0">
                      <span className="block text-sm font-bold text-foreground leading-snug">
                        {q.title}
                      </span>
                      <span className="block text-[11px] text-muted-foreground font-medium mt-0.5">
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
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("Recent Health Records")}
                </h2>
                <Link to="/reports" className="text-xs font-bold text-primary hover:underline">
                  {t("View All Reports")}
                </Link>
              </div>

              {recentRecords.length > 0 ? (
                <div className="space-y-2.5">
                  {recentRecords.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3.5 rounded-2xl border border-border/80 bg-card p-3.5 transition-all hover:border-primary/40 active:scale-[0.99]"
                    >
                      <Link to={item.to} className="flex items-center gap-3.5 flex-1 min-w-0">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                          <Icon name={item.icon} className="text-[20px]" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="block truncate text-sm font-bold text-foreground">
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
                            className="p-1.5 rounded-lg text-primary hover:bg-accent transition-colors"
                            title={t("Open PDF")}
                          >
                            <Icon name="picture_as_pdf" className="text-[18px]" />
                          </button>
                        ) : null}

                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                          {item.badge}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Card className="p-4 text-center border-border/80 bg-card">
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "No reports yet. Upload a lab report or sync records from an Aaha Health Kiosk.",
                    )}
                  </p>
                  <div className="mt-2.5">
                    <Btn to="/upload" variant="outline" size="sm">
                      {t("Upload Lab Report")}
                    </Btn>
                  </div>
                </Card>
              )}
            </section>

            {/* 7. Ask Aaha Banner */}
            <Link
              to="/aaha"
              search={{ report: undefined }}
              className="flex items-center justify-between rounded-2xl border border-primary/25 bg-accent/40 px-4 py-3 text-muted-foreground transition-all hover:border-primary hover:bg-accent/60 active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-2xs">
                  <Icon name="favorite" className="text-[18px]" />
                </span>
                <span className="text-xs font-bold text-foreground">
                  {t("Ask Aaha about your results")}
                </span>
              </div>
              <span className="grid size-8 place-items-center rounded-full bg-card text-primary border border-border/60 shadow-2xs">
                <Icon name="mic" className="text-[18px]" />
              </span>
            </Link>
          </>
        )}
      </div>
    </Screen>
  );
}

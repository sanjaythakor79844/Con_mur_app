import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Icon, Pill } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import {
  bandLabel,
  bandTone,
  formatDate,
  useDisplayName,
  useOverview,
} from "@/hooks/use-overview";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { listAssessments, type Assessment, type Report } from "@/lib/aaha-api";
import { cn } from "@/lib/utils";
import {
  LivScope,
  LivCard,
  LivHeading,
  LivLabel,
  LivNumber,
  LivUnit,
  LivSubtext,
  LivPill,
  LivProgressRing,
  LivButton,
  LivMark,
} from "@/components/liv";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home | Aaha Companion & Liv Living Lab" },
      {
        name: "description",
        content:
          "Your verified health status, AWIS score, kiosk screenings, vitals and appointments — all in one calm, monochrome dashboard.",
      },
      { property: "og:title", content: "Home | Aaha Companion & Liv Living Lab" },
      { property: "og:description", content: "Longevity and wellness measured at a glance." },
    ],
  }),
  component: HomeScreen,
});

function HomeScreen() {
  const { t } = useI18n();
  return (
    <RequireAuth message={t("Sign in to see your health dashboard, reports and appointments.")}>
      <HomeDashboard />
    </RequireAuth>
  );
}

interface VitalReading {
  value?: string | number;
  unit?: string;
  status?: string;
}

function HomeDashboard() {
  const { t } = useI18n();
  const { patient, user, userId } = useAuth();
  const { firstName, fullName } = useDisplayName();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const {
    latestAssessment,
    assessments,
    reports,
    upcoming,
    unreadCount,
    loading,
    error,
  } = useOverview();

  // Liv theme toggle: dark or light
  const [livTheme, setLivTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("liv.theme");
      if (saved === "light" || saved === "dark") return saved;
    }
    return "dark";
  });

  const toggleLivTheme = () => {
    const next = livTheme === "dark" ? "light" : "dark";
    setLivTheme(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("liv.theme", next);
    }
  };

  const displayName = patient?.full_name?.trim() || fullName || firstName || t("Member");

  // Time of day salutation
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t("Good morning")
      : hour < 17
        ? t("Good afternoon")
        : t("Good evening");

  const todayStr = new Date()
    .toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();

  // AWIS score validity (only real scores, no fabrication)
  const hasValidScore =
    latestAssessment &&
    typeof latestAssessment.score === "number" &&
    latestAssessment.score > 0;
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

  // Find latest kiosk assessment
  const latestKiosk = assessments.find(
    (a) => a.source === "kiosk" || Boolean(a.kiosk_id),
  );

  // Combine real assessments and uploaded reports for Recent Records
  const recentRecords = [
    ...assessments.map((a) => ({
      id: `assessment-${a.id}`,
      realId: a.id,
      title: a.kiosk_id ? `Kiosk Screening #${a.kiosk_id}` : a.complaint || t("Health Screening"),
      category: a.source === "kiosk" || a.kiosk_id ? t("Kiosk Screening") : t("Guided Check-up"),
      date: a.created_at,
      badge: a.score > 0 ? `AWIS ${a.score}` : t("Recorded"),
      icon: a.source === "kiosk" || a.kiosk_id ? "monitor_heart" : "clinical_notes",
      pdfUrl: a.report_pdf_url,
      to: "/reports" as const,
    })),
    ...reports.map((r) => ({
      id: `report-${r.id}`,
      realId: r.id,
      title: r.title || t("Lab Report"),
      category: r.category ? `${r.category}` : t("Lab Report"),
      date: r.created_at,
      badge: r.status_label || t("Completed"),
      icon: "description",
      pdfUrl: r.file_url,
      to: "/reports" as const,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  // Safe PDF Handler (no gs:// exposure, handles 401/403 with query refresh)
  const handlePdfAction = async (
    target: { id: string; report_pdf_url?: string; file_url?: string; kiosk_id?: string; title?: string },
    action: "view" | "download" = "view",
    isRetry = false,
  ) => {
    let rawPath = target.report_pdf_url || target.file_url || "";
    // Never expose internal gs:// paths to user
    if (typeof rawPath === "string" && rawPath.startsWith("gs://")) {
      rawPath = "";
    }

    if (!rawPath || !rawPath.startsWith("http")) {
      toast.info(t("PDF is not available yet"));
      return;
    }

    const toastId = toast.loading(
      action === "download" ? t("Downloading report...") : t("Opening report..."),
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

      if (!res.ok) {
        throw new Error(`Failed to fetch file (${res.status})`);
      }

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
      // Fallback direct window open
      window.open(rawPath, "_blank", "noopener");
    }
  };

  const QUICK_ACTIONS = [
    {
      icon: "clinical_notes",
      title: t("Guided Check-up"),
      desc: t("5-minute screening"),
      to: "/checkup" as const,
      highlight: !hasValidScore,
    },
    {
      icon: "science",
      title: t("Biomarkers & Reports"),
      desc: t("Kiosk & lab panels"),
      to: "/reports" as const,
      search: { tab: "markers" as const },
      highlight: false,
    },
    {
      icon: "upload_file",
      title: t("Upload Lab Report"),
      desc: t("PDF, image or camera"),
      to: "/upload" as const,
      search: undefined,
      highlight: false,
    },
    {
      icon: "calendar_month",
      title: t("Book Appointment"),
      desc: t("Kiosk or doctor"),
      to: "/appointments" as const,
      search: undefined,
      highlight: false,
    },
  ];

  return (
    <LivScope theme={livTheme} className="min-h-screen pb-16 flex flex-col items-center">
      {/* Centred responsive shell simulating the Liv phone or tablet layout */}
      <div className="w-full max-w-[430px] min-h-screen flex flex-col bg-[var(--liv-bg)] text-[var(--liv-text)] relative sm:my-4 sm:rounded-[36px] sm:border sm:border-[var(--liv-line)] sm:shadow-xl sm:overflow-hidden">

        {/* 1. Header with Liv Brand, Salutation, Date & Profile */}
        <header className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LivMark size={24} />
              <span className="liv-wm text-[12px] tracking-[0.3em]">Liv</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Theme Toggle (Dark / Light) */}
              <button
                type="button"
                onClick={toggleLivTheme}
                title={livTheme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
                aria-label={livTheme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
                className="size-9 rounded-full border border-[var(--liv-line)] bg-[var(--liv-surf)] flex items-center justify-center text-[var(--liv-text)] hover:border-[var(--liv-text)] transition-colors"
              >
                <Icon name={livTheme === "dark" ? "light_mode" : "dark_mode"} className="text-[17px]" />
              </button>

              {/* Notifications */}
              <Link
                to="/journey"
                aria-label="Notifications"
                className="relative size-9 rounded-full border border-[var(--liv-line)] bg-[var(--liv-surf)] flex items-center justify-center text-[var(--liv-text)] hover:border-[var(--liv-text)] transition-colors"
              >
                <Icon name="notifications" className="text-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 size-2 rounded-full bg-[var(--liv-text)] ring-2 ring-[var(--liv-surf)]" />
                )}
              </Link>
            </div>
          </div>

          {/* Salutation & Date */}
          <div className="mt-4">
            <LivLabel className="block">{todayStr}</LivLabel>
            <LivHeading level={1} className="mt-1">
              {greeting}, {firstName || displayName}
            </LivHeading>
          </div>

          {/* Patient Identity Badge if linked */}
          {patient && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--liv-line2)] bg-[var(--liv-surf)] px-2.5 py-0.5 text-[11px] font-mono font-medium text-[var(--liv-text)]">
                <Icon name="verified_user" className="text-[13px]" />
                <span>ID: {patient.patient_id}</span>
              </span>
              {patient.age && (
                <span className="rounded-full border border-[var(--liv-line)] bg-[var(--liv-surf2)] px-2.5 py-0.5 text-[11px] font-mono text-[var(--liv-muted)]">
                  {patient.age} {t("yrs")}
                </span>
              )}
              {patient.gender && (
                <span className="rounded-full border border-[var(--liv-line)] bg-[var(--liv-surf2)] px-2.5 py-0.5 text-[11px] font-mono text-[var(--liv-muted)]">
                  {patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}
                </span>
              )}
            </div>
          )}
        </header>

        {/* Main Dashboard Body */}
        <div className="flex flex-col gap-4 px-5 pb-8">
          {/* Loading State */}
          {loading ? (
            <div className="space-y-3.5 py-2">
              <div className="h-44 w-full animate-pulse rounded-[24px] bg-[var(--liv-surf)] border border-[var(--liv-line)]" />
              <div className="h-28 w-full animate-pulse rounded-[22px] bg-[var(--liv-surf)] border border-[var(--liv-line)]" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-24 w-full animate-pulse rounded-2xl bg-[var(--liv-surf)] border border-[var(--liv-line)]" />
                <div className="h-24 w-full animate-pulse rounded-2xl bg-[var(--liv-surf)] border border-[var(--liv-line)]" />
              </div>
            </div>
          ) : error ? (
            /* Error State with Retry */
            <LivCard className="border-dashed border-[var(--liv-line2)] p-5 text-center">
              <div className="mx-auto size-11 rounded-full border border-[var(--liv-line2)] flex items-center justify-center text-[var(--liv-text)] mb-2">
                <Icon name="error_outline" className="text-[22px]" />
              </div>
              <LivHeading level={2}>{t("Couldn't load health summary")}</LivHeading>
              <LivSubtext className="mt-1">
                {t("Please check your network connection and try again.")}
              </LivSubtext>
              <div className="mt-4 flex justify-center">
                <LivButton
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="sm:w-auto"
                >
                  {t("common.retry")}
                </LivButton>
              </div>
            </LivCard>
          ) : (
            <>
              {/* 2. Prominent AWIS Score Card (Liv Inverted Card) */}
              {hasValidScore ? (
                <LivCard variant="inverted" className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between text-xs">
                    <LivLabel className="text-[var(--liv-inv-muted)]">
                      {t("Active Integrated Wellness Score")}
                    </LivLabel>
                    <span className="font-mono text-[11px] text-[var(--liv-inv-muted)]">
                      {formatDate(latestAssessment?.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <LivNumber size="xl" className="text-[var(--liv-inv-fg)]">
                          {scoreValue}
                        </LivNumber>
                        <LivUnit className="text-[var(--liv-inv-muted)] text-[14px]">
                          / 100
                        </LivUnit>
                      </div>

                      <div className="mt-2.5">
                        <LivPill
                          tone={
                            riskTone === "green"
                              ? "optimal"
                              : riskTone === "amber"
                                ? "borderline"
                                : "priority"
                          }
                        >
                          {riskLabel || t("Recorded")}
                        </LivPill>
                      </div>
                    </div>

                    {/* Circular Radial Gauge */}
                    <div className="shrink-0">
                      <LivProgressRing
                        size={104}
                        strokeWidth={7.5}
                        progress={scoreValue / 100}
                        onBg={false}
                      >
                        <Icon name="favorite" className="text-[22px] text-[var(--liv-inv-fg)]" />
                      </LivProgressRing>
                    </div>
                  </div>

                  {/* Clinical Summary from Ambika Engine */}
                  <p className="text-[13px] leading-relaxed text-[var(--liv-inv-muted)]">
                    {latestAssessment?.summary ||
                      t("Your wellness score is calculated from your verified vitals and symptoms.")}
                  </p>

                  {/* Actions */}
                  <div className="pt-3 border-t border-[var(--liv-inv-line)] flex items-center justify-between text-[12px]">
                    <Link
                      to="/assessment"
                      className="font-semibold text-[var(--liv-inv-fg)] hover:underline flex items-center gap-1"
                    >
                      <span>{t("View full assessment")}</span>
                      <span>→</span>
                    </Link>

                    {latestAssessment?.source === "kiosk" && (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--liv-inv-muted)]">
                        {t("Kiosk Verified")}
                      </span>
                    )}
                  </div>
                </LivCard>
              ) : (
                /* Honest Empty State for AWIS (No score fabricated) */
                <LivCard variant="empty" className="p-5 text-center">
                  <div className="mx-auto size-12 rounded-full border border-[var(--liv-line2)] bg-[var(--liv-surf2)] flex items-center justify-center text-[var(--liv-text)] mb-1">
                    <Icon name="clinical_notes" className="text-[24px]" />
                  </div>
                  <LivHeading level={2}>{t("No AWIS score yet")}</LivHeading>
                  <LivSubtext className="mt-1.5 max-w-[280px] mx-auto">
                    {t(
                      "Your Aaha Wellness Intelligence Score (AWIS) will appear here after you complete a guided check-up or visit an Aaha Health Kiosk.",
                    )}
                  </LivSubtext>
                  <div className="mt-4 flex flex-col gap-2 w-full max-w-[280px]">
                    <LivButton size="sm" onClick={() => navigate({ to: "/checkup" })}>
                      {t("Start Guided Check-up")}
                    </LivButton>
                    <LivButton
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate({ to: "/upload" })}
                    >
                      {t("Upload Lab Report")}
                    </LivButton>
                  </div>
                </LivCard>
              )}

              {/* 3. Recent Kiosk Screening Card / Honest Empty State */}
              {latestKiosk ? (
                <LivCard className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <LivLabel>{t("Living Lab Kiosk Screening")}</LivLabel>
                    <span className="font-mono text-[11px] text-[var(--liv-muted)]">
                      {formatDate(latestKiosk.created_at)}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-serif text-[18px] font-medium text-[var(--liv-text)] leading-tight">
                      {latestKiosk.kiosk_id
                        ? `Aaha Health Kiosk #${latestKiosk.kiosk_id}`
                        : latestKiosk.complaint || t("Verified Kiosk Check-up")}
                    </h3>
                    <p className="text-[12px] text-[var(--liv-muted)] mt-0.5">
                      {latestKiosk.report_pdf_url
                        ? t("Official diagnostic PDF ready")
                        : t("Kiosk biometric screening recorded")}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    {latestKiosk.report_pdf_url ? (
                      <>
                        <LivButton
                          size="sm"
                          variant="primary"
                          onClick={() => handlePdfAction(latestKiosk, "view")}
                          className="flex-1"
                        >
                          <Icon name="visibility" className="text-[16px]" />
                          <span>{t("View PDF")}</span>
                        </LivButton>
                        <LivButton
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePdfAction(latestKiosk, "download")}
                          className="shrink-0 px-3"
                          aria-label={t("Download PDF")}
                        >
                          <Icon name="download" className="text-[16px]" />
                        </LivButton>
                      </>
                    ) : (
                      <Link
                        to="/report/$id"
                        params={{ id: latestKiosk.id }}
                        className="flex-1 min-h-[40px] rounded-full border border-[var(--liv-line2)] bg-[var(--liv-surf)] text-[var(--liv-text)] text-[13px] font-semibold flex items-center justify-center gap-1.5 hover:border-[var(--liv-text)] transition-colors"
                      >
                        <span>{t("View Readings")}</span>
                        <span>→</span>
                      </Link>
                    )}
                  </div>
                </LivCard>
              ) : (
                /* Honest Empty State for Kiosk Screening */
                <LivCard className="p-4 border-dashed space-y-2">
                  <div className="flex items-center justify-between">
                    <LivLabel>{t("Living Lab Kiosk Sync")}</LivLabel>
                    <span className="font-mono text-[10px] text-[var(--liv-faint)]">
                      {patient?.mobile_number ? `+91 ${patient.mobile_number.slice(-10)}` : "Mobile Sync"}
                    </span>
                  </div>

                  <h3 className="font-serif text-[18px] font-medium text-[var(--liv-text)]">
                    {t("No kiosk screening found yet")}
                  </h3>
                  <LivSubtext>
                    {t(
                      "Looking for a screening linked to your verified mobile number. When you visit an Aaha Health Kiosk, your report and AWIS score sync here automatically.",
                    )}
                  </LivSubtext>

                  <div className="pt-2">
                    <LivButton
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate({ to: "/appointments" })}
                    >
                      <Icon name="calendar_month" className="text-[16px]" />
                      <span>{t("Book a Kiosk Screening")}</span>
                    </LivButton>
                  </div>
                </LivCard>
              )}

              {/* 4. Verified Health Vitals (Shown only if actual backend data exists) */}
              {vitalsEntries.length > 0 && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <LivLabel>{t("Recorded Vitals")}</LivLabel>
                    <Link
                      to="/reports"
                      search={{ tab: "markers" }}
                      className="text-[12px] font-mono text-[var(--liv-text)] underline underline-offset-4 hover:opacity-80"
                    >
                      {t("All biomarkers")} →
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {vitalsEntries.map(([key, val]) => {
                      const isObj = typeof val === "object" && val !== null;
                      const readingVal = isObj ? ((val as VitalReading).value ?? "") : val;
                      const readingUnit = isObj ? (val as VitalReading).unit || "" : "";
                      const readingStatus = isObj
                        ? (val as VitalReading).status || "Normal"
                        : "Normal";
                      const isAbnormal =
                        readingStatus === "High" ||
                        readingStatus === "Low" ||
                        readingStatus === "Attention";

                      return (
                        <LivCard key={key} className="p-3 gap-1.5">
                          <LivLabel className="block truncate text-[10px]">
                            {key.replace(/_/g, " ")}
                          </LivLabel>
                          <div className="flex items-baseline gap-1 truncate">
                            <LivNumber size="sm" className="truncate">
                              {readingVal}
                            </LivNumber>
                            {readingUnit && (
                              <LivUnit className="truncate">{readingUnit}</LivUnit>
                            )}
                          </div>
                          <div className="pt-1 flex items-center gap-1.5 text-[11px]">
                            <LivPill
                              tone={isAbnormal ? "priority" : "optimal"}
                              className="text-[9px] h-5 px-1.5"
                            >
                              {t(readingStatus)}
                            </LivPill>
                          </div>
                        </LivCard>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Verified Focus Conditions if present */}
              {conditions.length > 0 && (
                <LivCard className="p-3.5 space-y-2">
                  <LivLabel>{t("Clinical Focus Areas")}</LivLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {conditions.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--liv-line2)] bg-[var(--liv-surf2)] px-2.5 py-1 text-[11px] font-medium text-[var(--liv-text)]"
                      >
                        <Icon name="shield" className="text-[13px] text-[var(--liv-muted)]" />
                        <span>{c}</span>
                      </span>
                    ))}
                  </div>
                </LivCard>
              )}

              {/* 5. Clear Next Step / Upcoming Appointment */}
              {upcoming ? (
                <LivCard className="p-4 space-y-2.5 border-[var(--liv-line2)]">
                  <div className="flex items-center justify-between">
                    <LivLabel className="flex items-center gap-1.5">
                      <Icon name="event_available" className="text-[15px]" />
                      <span>{t("Upcoming Appointment")}</span>
                    </LivLabel>
                    <LivPill tone="optimal">{upcoming.status}</LivPill>
                  </div>

                  <div>
                    <h3 className="font-serif text-[18px] font-medium text-[var(--liv-text)] leading-tight">
                      {formatDate(upcoming.scheduled_for || upcoming.appointment_date)}, {upcoming.slot_label}
                    </h3>
                    <p className="text-[12px] text-[var(--liv-muted)] mt-0.5">
                      {upcoming.doctor_name || upcoming.speciality} · {upcoming.mode}
                      {upcoming.centre ? ` · ${upcoming.centre}` : ""}
                    </p>
                  </div>

                  <div className="pt-1">
                    <LivButton
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate({ to: "/appointments" })}
                    >
                      {t("Manage Appointment")} →
                    </LivButton>
                  </div>
                </LivCard>
              ) : !hasValidScore ? (
                <LivCard className="p-4 space-y-2">
                  <LivLabel>{t("Recommended Next Step")}</LivLabel>
                  <h3 className="font-serif text-[18px] font-medium text-[var(--liv-text)]">
                    {t("Start a guided check-up")}
                  </h3>
                  <LivSubtext>
                    {t("Answer 5 quick clinical questions to calculate your initial AWIS wellness score.")}
                  </LivSubtext>
                  <div className="pt-1">
                    <LivButton
                      size="sm"
                      onClick={() => navigate({ to: "/checkup" })}
                    >
                      {t("Start Guided Check-up")}
                    </LivButton>
                  </div>
                </LivCard>
              ) : reports.length === 0 ? (
                <LivCard className="p-4 space-y-2">
                  <LivLabel>{t("Recommended Next Step")}</LivLabel>
                  <h3 className="font-serif text-[18px] font-medium text-[var(--liv-text)]">
                    {t("Add your lab report")}
                  </h3>
                  <LivSubtext>
                    {t(
                      "Upload recent blood tests or lab results so Aaha can extract your biomarkers and explain them.",
                    )}
                  </LivSubtext>
                  <div className="pt-1">
                    <LivButton
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate({ to: "/upload" })}
                    >
                      {t("Upload Lab Report")}
                    </LivButton>
                  </div>
                </LivCard>
              ) : (
                <LivCard className="p-4 space-y-2">
                  <LivLabel>{t("Recommended Next Step")}</LivLabel>
                  <h3 className="font-serif text-[18px] font-medium text-[var(--liv-text)]">
                    {t("Review your results with a doctor")}
                  </h3>
                  <LivSubtext>
                    {t(
                      "Consult with a specialist at an Aaha Health Centre or via video to discuss your health plan.",
                    )}
                  </LivSubtext>
                  <div className="pt-1">
                    <LivButton
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate({ to: "/appointments" })}
                    >
                      {t("Book a consultation")}
                    </LivButton>
                  </div>
                </LivCard>
              )}

              {/* 6. Quick Actions Grid */}
              <section className="space-y-2.5">
                <LivLabel className="px-1 block">{t("Quick Actions")}</LivLabel>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {QUICK_ACTIONS.map((q) => (
                    <Link
                      key={q.title}
                      to={q.to}
                      search={q.search}
                      className={cn(
                        "group flex flex-col justify-between rounded-2xl border p-3.5 transition-all active:scale-[0.98]",
                        q.highlight
                          ? "border-[var(--liv-text)] bg-[var(--liv-surf2)]"
                          : "border-[var(--liv-line)] bg-[var(--liv-surf)] hover:border-[var(--liv-line2)]",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="grid size-9 place-items-center rounded-xl bg-[var(--liv-surf2)] border border-[var(--liv-line2)] text-[var(--liv-text)]">
                          <Icon name={q.icon} className="text-[19px]" />
                        </span>
                        <Icon
                          name="chevron_right"
                          className="text-[16px] text-[var(--liv-muted)] transition-transform group-hover:translate-x-0.5"
                        />
                      </div>
                      <div className="mt-3 min-w-0">
                        <span className="block text-[13px] font-semibold text-[var(--liv-text)] leading-snug">
                          {q.title}
                        </span>
                        <span className="block text-[10.5px] text-[var(--liv-muted)] font-mono mt-0.5 truncate">
                          {q.desc}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              {/* 7. Recent Health Records Section */}
              <section className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <LivLabel>{t("Recent Health Records")}</LivLabel>
                  <Link
                    to="/reports"
                    className="text-[12px] font-mono text-[var(--liv-text)] underline underline-offset-4 hover:opacity-80"
                  >
                    {t("View all")} →
                  </Link>
                </div>

                {recentRecords.length > 0 ? (
                  <div className="space-y-2">
                    {recentRecords.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-2xl border border-[var(--liv-line)] bg-[var(--liv-surf)] p-3 transition-colors hover:border-[var(--liv-line2)]"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--liv-surf2)] border border-[var(--liv-line2)] text-[var(--liv-text)]">
                          <Icon name={item.icon} className="text-[18px]" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <Link
                            to="/report/$id"
                            params={{ id: item.realId }}
                            className="block truncate text-[13px] font-semibold text-[var(--liv-text)] hover:underline"
                          >
                            {item.title}
                          </Link>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-mono text-[var(--liv-muted)]">
                            <span>{item.category}</span>
                            <span>·</span>
                            <span>{formatDate(item.date)}</span>
                          </div>
                        </div>

                        {item.pdfUrl && item.pdfUrl.startsWith("http") ? (
                          <button
                            type="button"
                            onClick={() =>
                              handlePdfAction(
                                { id: item.realId, file_url: item.pdfUrl, title: item.title },
                                "view",
                              )
                            }
                            className="shrink-0 p-1.5 rounded-lg text-[var(--liv-text)] hover:bg-[var(--liv-surf2)]"
                            title={t("Open PDF")}
                          >
                            <Icon name="picture_as_pdf" className="text-[18px]" />
                          </button>
                        ) : null}

                        <span className="shrink-0 font-mono text-[10.5px] px-2 py-0.5 rounded-full border border-[var(--liv-line2)] text-[var(--liv-text)]">
                          {item.badge}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <LivCard variant="empty" className="p-4 text-center">
                    <LivSubtext>
                      {t("No reports yet. Upload a lab report or sync records from an Aaha Health Kiosk.")}
                    </LivSubtext>
                    <div className="mt-2.5">
                      <LivButton
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate({ to: "/upload" })}
                      >
                        {t("Upload Lab Report")}
                      </LivButton>
                    </div>
                  </LivCard>
                )}
              </section>

              {/* 8. Ask Liv Assistant Banner */}
              <Link
                to="/aaha"
                search={{ report: undefined }}
                className="flex items-center justify-between rounded-2xl border border-[var(--liv-line)] bg-[var(--liv-surf)] px-4 py-3 text-[var(--liv-muted)] transition-all hover:border-[var(--liv-text)] active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-full bg-[var(--liv-inv)] text-[var(--liv-inv-fg)]">
                    <Icon name="favorite" className="text-[16px]" />
                  </span>
                  <span className="text-[13px] font-semibold text-[var(--liv-text)]">
                    {t("Ask Liv about your results")}
                  </span>
                </div>
                <span className="grid size-8 place-items-center rounded-full border border-[var(--liv-line2)] text-[var(--liv-text)]">
                  <Icon name="mic" className="text-[16px]" />
                </span>
              </Link>
            </>
          )}
        </div>
      </div>
    </LivScope>
  );
}

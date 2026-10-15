import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Btn, Card, Icon, Screen, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { formatDate, useOverview } from "@/hooks/use-overview";
import { useAuth } from "@/hooks/use-auth";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getPreferences,
  listCarePlans,
  updateCarePlan,
  type Notification,
  type CarePlan,
} from "@/lib/aaha-api";
import { useI18n } from "@/lib/i18n";
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
  LivButton,
  LivProgressRing,
  LivSegmented,
  LivMark,
} from "@/components/liv";

export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { title: "Plan, Habits & Care Journeys | Aaha Companion" },
      {
        name: "description",
        content:
          "Your doctor-assigned longevity programme, daily habits, clinical journeys and care timeline.",
      },
    ],
  }),
  component: JourneyScreen,
});

function JourneyScreen() {
  const { t } = useI18n();
  return (
    <RequireAuth message={t("Sign in to see your health plan and care journey.")}>
      <PlanPage />
    </RequireAuth>
  );
}

function PlanPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { user, userId, patient } = useAuth();
  const {
    latestAssessment,
    assessments,
    reports,
    appointments,
    upcoming,
    loading: overviewLoading,
  } = useOverview();

  // Active top-level tab: 'plan' (Liv Experience), 'reminders' (Existing Notifications), or 'timeline' (Care Progress)
  const [activeTab, setActiveTab] = useState<"plan" | "reminders" | "timeline">("plan");

  // Notifications query (preserved)
  const notifsQuery = useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    queryFn: listNotifications,
  });

  // User preferences query (preserved)
  const prefsQuery = useQuery({
    queryKey: ["preferences"],
    queryFn: getPreferences,
  });
  const prefs = prefsQuery.data;

  // Care plans query from backend
  const carePlansQuery = useQuery({
    queryKey: ["care-plans", userId],
    enabled: !!userId,
    queryFn: listCarePlans,
  });

  const carePlans = carePlansQuery.data || [];
  // Use most recent approved or active doctor care plan, if present
  const activeDoctorPlan = carePlans[0] ?? null;

  // Mutation to persist task/habit updates to the verified backend
  const updateTaskMutation = useMutation({
    mutationFn: async ({
      planId,
      updatedLifestyle,
    }: {
      planId: string;
      updatedLifestyle: any[];
    }) => {
      const res = await updateCarePlan(planId, { lifestyle_management: updatedLifestyle });
      if (!res) throw new Error("Failed to persist task update");
      return res;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["care-plans", userId] });
      toast.success(t("Task progress saved to your care plan"));
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("Could not save task progress"));
    },
  });

  // Notification mutations (preserved)
  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      toast.success(t("All notifications marked as read"));
      void qc.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  const notifications = notifsQuery.data || [];
  const unreadNotifs = notifications.filter((n) => !n.is_read);

  // Derived smart reminders (preserved)
  const reminders: Array<{
    id: string;
    title: string;
    desc: string;
    icon: string;
    tone: "brand" | "amber" | "emerald";
    to: string;
    actionLabel: string;
  }> = [];

  if ((prefs?.appointment_reminders ?? true) && upcoming) {
    const isToday =
      upcoming.appointment_date === new Date().toISOString().split("T")[0] ||
      upcoming.scheduled_for === new Date().toISOString().split("T")[0];

    reminders.push({
      id: "reminder-upcoming-appt",
      title: isToday ? t("Appointment Today") : t("Upcoming Appointment"),
      desc: `${formatDate(upcoming.scheduled_for || upcoming.appointment_date)}, ${upcoming.slot_label || upcoming.appointment_time} • ${upcoming.doctor_name || upcoming.speciality || "Consultation"} (${upcoming.mode})`,
      icon: "event_available",
      tone: "brand",
      to: "/appointments",
      actionLabel: t("View Appointment"),
    });
  }

  if ((prefs?.checkup_reminders ?? true) && !latestAssessment) {
    reminders.push({
      id: "reminder-checkup",
      title: t("Complete Your Guided Check-up"),
      desc: t("Answer 5 quick health questions to calculate your personalized AWIS Wellness Score."),
      icon: "clinical_notes",
      tone: "amber",
      to: "/checkup",
      actionLabel: t("Start Check-up"),
    });
  }

  const recommendedTests = latestAssessment?.report
    ? (latestAssessment as any).report?.prediction?.recommended_tests || []
    : [];
  if ((prefs?.checkup_reminders ?? true) && recommendedTests.length > 0 && reports.length === 0) {
    reminders.push({
      id: "reminder-lab-tests",
      title: t("Recommended Health Tests"),
      desc: `${t("Follow up on suggested tests")}: ${recommendedTests.slice(0, 2).join(", ")}. ${t("Upload your report once ready.")}`,
      icon: "upload_file",
      tone: "amber",
      to: "/upload",
      actionLabel: t("Upload Report"),
    });
  }

  // Clinical Journey Determination: Only assign if supported by verified patient data
  const conditions = useMemo(() => {
    const condList: string[] = [];
    if (latestAssessment?.suspected_conditions) {
      condList.push(...latestAssessment.suspected_conditions);
    }
    const rData = latestAssessment?._raw?.report_data;
    if (rData?.conditions_found) {
      condList.push(...rData.conditions_found);
    }
    return condList.map((c) => String(c).toLowerCase());
  }, [latestAssessment]);

  const assignedJourneys = useMemo(() => {
    const list: Array<{
      id: "hm" | "inf" | "dh";
      title: string;
      tagline: string;
      clinicalGoal: string;
      assignedReason: string;
      markers: string[];
      steps: Array<{ title: string; timeline: string; ctaLabel?: string; ctaTo?: string }>;
    }> = [];

    // 1. Metabolic Journey (Blood sugar, Insulin, ApoB, Lipid, BMI)
    const hasMetabolic = conditions.some(
      (c) =>
        c.includes("diabet") ||
        c.includes("metabolic") ||
        c.includes("sugar") ||
        c.includes("pressure") ||
        c.includes("hypertension") ||
        c.includes("pcos") ||
        c.includes("weight") ||
        c.includes("bmi"),
    );
    if (hasMetabolic) {
      list.push({
        id: "hm",
        title: t("Metabolic Reset"),
        tagline: t("Cardiovascular and glycaemic health management."),
        clinicalGoal: t("HbA1c ≤ 5.7% · Fasting Insulin < 9 µIU/mL · ApoB < 90 mg/dL"),
        assignedReason: t("Flagged in your clinical screening markers for blood glucose or lipid attention."),
        markers: ["HbA1c", "Fasting Glucose", "Blood Pressure", "BMI"],
        steps: [
          { title: t("Physician consultation on glycaemic health"), timeline: t("Week 1"), ctaLabel: t("Book Consultation"), ctaTo: "/appointments" },
          { title: t("Dietary guidance & post-meal activity tracking"), timeline: t("Daily") },
          { title: t("Repeat metabolic panel at 90 days"), timeline: t("Day 90"), ctaLabel: t("Upload Report"), ctaTo: "/upload" },
        ],
      });
    }

    // 2. Inflammation Journey (hs-CRP, Liver, Kidney, Autoimmune)
    const hasInflammation = conditions.some(
      (c) =>
        c.includes("inflam") ||
        c.includes("crp") ||
        c.includes("arthrit") ||
        c.includes("liver") ||
        c.includes("kidney") ||
        c.includes("thyroid") ||
        c.includes("tsh"),
    );
    if (hasInflammation) {
      list.push({
        id: "inf",
        title: t("Inflammation & Recovery"),
        tagline: t("Cellular inflammation control and organ resilience."),
        clinicalGoal: t("hs-CRP < 1.0 mg/L · Normal liver & renal enzymes"),
        assignedReason: t("Identified from reported inflammatory markers or clinical symptoms."),
        markers: ["hs-CRP", "ESR", "ALT / AST", "Vitamin D"],
        steps: [
          { title: t("Doctor review of systemic inflammatory indicators"), timeline: t("Week 1"), ctaLabel: t("Consult Doctor"), ctaTo: "/appointments" },
          { title: t("Anti-inflammatory nutrition & restorative sleep"), timeline: t("Daily") },
          { title: t("Follow-up biomarker reassessment"), timeline: t("Day 60–90"), ctaLabel: t("Upload Test"), ctaTo: "/upload" },
        ],
      });
    }

    // 3. Derma & Hair Renewal (Skin, Scalp, Hair fall, Ferritin, Iron, B12)
    const hasDermaHair = conditions.some(
      (c) =>
        c.includes("hair") ||
        c.includes("skin") ||
        c.includes("derma") ||
        c.includes("anaemia") ||
        c.includes("iron") ||
        c.includes("ferritin") ||
        c.includes("alopecia"),
    );
    if (hasDermaHair) {
      list.push({
        id: "dh",
        title: t("Skin & Hair Renewal"),
        tagline: t("Nutrient repletion and dermatological vitality."),
        clinicalGoal: t("Ferritin > 50 ng/mL · Vitamin D > 40 ng/mL · Normal B12"),
        assignedReason: t("Assigned based on low iron/micronutrient markers or scalp health findings."),
        markers: ["Ferritin", "Vitamin D3", "Vitamin B12", "Haemoglobin"],
        steps: [
          { title: t("Clinical evaluation of micronutrient stores"), timeline: t("Week 1"), ctaLabel: t("Book Visit"), ctaTo: "/appointments" },
          { title: t("Prescribed micronutrient replenishment"), timeline: t("Daily") },
          { title: t("Day-90 skin and ferritin re-check"), timeline: t("Day 90"), ctaLabel: t("Upload Labs"), ctaTo: "/upload" },
        ],
      });
    }

    return list;
  }, [conditions, t]);

  // Tasks / Habits derived strictly from doctor care plan or kiosk assessment
  const verifiedTasks = useMemo(() => {
    if (activeDoctorPlan?.lifestyle_management && activeDoctorPlan.lifestyle_management.length > 0) {
      return activeDoctorPlan.lifestyle_management.map((item: any) => ({
        id: item.title,
        title: item.title,
        detail: item.detail || "",
        done: Boolean(item.done),
        source: "doctor" as const,
      }));
    }

    const tasks: Array<{ id: string; title: string; detail: string; done: boolean; source: "kiosk" }> = [];
    if (Array.isArray(latestAssessment?.nutrition_plans)) {
      latestAssessment.nutrition_plans.forEach((np: any, idx: number) => {
        if (Array.isArray(np.points)) {
          np.points.slice(0, 2).forEach((pt: string, pIdx: number) => {
            tasks.push({
              id: `nutri-${idx}-${pIdx}`,
              title: pt,
              detail: np.title || t("Nutrition Guidance"),
              done: false,
              source: "kiosk",
            });
          });
        }
      });
    }

    if (Array.isArray(latestAssessment?.therapy_plan)) {
      latestAssessment.therapy_plan.slice(0, 2).forEach((tp: string, idx: number) => {
        tasks.push({
          id: `ther-${idx}`,
          title: tp,
          detail: t("Lifestyle & Activity Guidance"),
          done: false,
          source: "kiosk",
        });
      });
    }

    return tasks;
  }, [activeDoctorPlan, latestAssessment, t]);

  // Handle task toggling
  const handleToggleTask = (task: (typeof verifiedTasks)[number]) => {
    if (task.source === "doctor" && activeDoctorPlan?._id) {
      const currentList = activeDoctorPlan.lifestyle_management || [];
      const nextList = currentList.map((item: any) =>
        item.title === task.title ? { ...item, done: !item.done } : item,
      );
      updateTaskMutation.mutate({
        planId: activeDoctorPlan._id,
        updatedLifestyle: nextList,
      });
    } else {
      toast.info(
        t(
          "This task is from your verified kiosk check-up. Daily completion tracking is enabled when prescribed by your treating doctor.",
        ),
      );
    }
  };

  // Milestone timeline calculation from actual clinical data
  const hasAssessment = assessments.length > 0;
  const hasReport = reports.length > 0;
  const hasAppointment = appointments.length > 0;
  const hasDoctorPlan = Boolean(activeDoctorPlan);

  const clinicalMilestones = [
    {
      title: t("Clinical Check-up Baseline"),
      desc: hasAssessment
        ? `${formatDate(latestAssessment!.created_at)} · AWIS ${latestAssessment!.score || "—"}`
        : t("Complete kiosk screening or symptom evaluation"),
      done: hasAssessment,
      current: !hasAssessment,
      action: hasAssessment ? undefined : { to: "/checkup", label: t("Start Check-up") },
    },
    {
      title: t("Laboratory Diagnostics"),
      desc: hasReport
        ? `${reports.length} ${t("report(s) saved")} · ${t("latest")} ${formatDate(reports[0]?.created_at)}`
        : t("Upload blood tests to extract clinical biomarkers"),
      done: hasReport,
      current: hasAssessment && !hasReport,
      action: hasReport ? undefined : { to: "/upload", label: t("Upload Labs") },
    },
    {
      title: t("Physician Plan & Consultation"),
      desc: hasDoctorPlan
        ? `${t("Approved plan")} · ${formatDate(activeDoctorPlan!.approved_at || activeDoctorPlan!.createdAt)}`
        : hasAppointment
        ? `${t("Consultation booked")} · ${formatDate(upcoming?.scheduled_for || upcoming?.appointment_date || appointments[0]?.created_at)}`
        : t("Review findings and obtain physician-directed care plan"),
      done: hasDoctorPlan || appointments.some((a) => a.status === "completed"),
      current: (hasAssessment || hasReport) && !hasDoctorPlan && !hasAppointment,
      action: hasDoctorPlan || hasAppointment ? undefined : { to: "/appointments", label: t("Book Visit") },
    },
    {
      title: t("Day-90 Healthspan Re-test"),
      desc: t("Follow-up evaluation to monitor biomarker improvements"),
      done: false,
      current: hasDoctorPlan || hasAppointment,
      action: undefined,
    },
  ];

  const milestonesDone = clinicalMilestones.filter((m) => m.done).length;

  // Badges grounded in verified clinical events
  const verifiedBadges = [
    {
      title: t("Screening Complete"),
      detail: t("Kiosk baseline registered"),
      unlocked: hasAssessment,
    },
    {
      title: t("Biomarkers Saved"),
      detail: t("Diagnostic labs uploaded"),
      unlocked: hasReport,
    },
    {
      title: t("Doctor Consultation"),
      detail: t("Care team review"),
      unlocked: hasAppointment || hasDoctorPlan,
    },
    {
      title: t("Day-90 Re-test"),
      detail: t("Milestone re-evaluation"),
      unlocked: false,
    },
  ];

  // Existing care journey timeline steps (preserved for Timeline tab)
  const legacyTimelineSteps = [
    {
      t: t("Guided Health Check-up"),
      d: hasAssessment
        ? `${formatDate(latestAssessment!.created_at)} • AWIS-C ${latestAssessment!.score ?? "—"}`
        : t("Complete a quick symptom check-up or visit an Aaha Kiosk"),
      s: hasAssessment ? ("done" as const) : ("next" as const),
      i: "clinical_notes",
      to: "/checkup",
    },
    {
      t: t("Lab Report Upload"),
      d: hasReport
        ? `${reports.length} ${t("report(s) saved")} • ${t("latest")} ${formatDate(reports[0]?.created_at)}`
        : t("Upload blood tests so Aaha can extract and explain the markers"),
      s: hasReport ? ("done" as const) : hasAssessment ? ("next" as const) : ("todo" as const),
      i: "upload_file",
      to: "/upload",
    },
    {
      t: t("Doctor Consultation"),
      d: upcoming
        ? `${formatDate(upcoming.scheduled_for || upcoming.appointment_date)} • ${upcoming.doctor_name || t("Doctor")}`
        : hasAppointment
          ? t("Consultation booked / completed")
          : t("Review your biomarkers and health plan with an Aaha specialist"),
      s: hasAppointment
        ? ("done" as const)
        : hasAssessment || hasReport
          ? ("next" as const)
          : ("todo" as const),
      i: "stethoscope",
      to: "/appointments",
    },
    {
      t: t("Therapy & Lifestyle Guidance"),
      d: t("Personalized nutrition, lifestyle habits and preventive care tips"),
      s: hasAppointment ? ("next" as const) : ("todo" as const),
      i: "spa",
      to: "/therapies",
    },
    {
      t: t("Periodic Follow-up"),
      d: t("Repeat flagged test markers in 3–6 months to monitor your progress"),
      s: "todo" as const,
      i: "event_repeat",
      to: "/progress",
    },
  ];
  const legacyStepsDone = legacyTimelineSteps.filter((s) => s.s === "done").length;

  return (
    <Screen nav={true}>
      <TopBar title={t("Care Journey & Plan")} subtitle={t("Longevity plan, habits & timeline")} back={true} />

      <div className="px-4 sm:px-6 pt-3 pb-24 flex flex-col gap-5">
        {/* Navigation Tabs: Plan (Liv) | Reminders | Care Timeline */}
        <div className="h-11 p-1 rounded-2xl bg-muted/70 border border-border/80 grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("plan")}
            className={cn(
              "rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
              activeTab === "plan"
                ? "bg-card text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon name="assignment" className="text-[16px]" />
            <span>{t("Plan")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("reminders")}
            className={cn(
              "rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
              activeTab === "reminders"
                ? "bg-card text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon name="notifications" className="text-[16px]" />
            <span>{t("Reminders")}</span>
            {(unreadNotifs.length > 0 || reminders.length > 0) && (
              <span className="size-4 rounded-full bg-primary text-primary-foreground text-[9px] font-extrabold grid place-items-center">
                {unreadNotifs.length + reminders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("timeline")}
            className={cn(
              "rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
              activeTab === "timeline"
                ? "bg-card text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon name="timeline" className="text-[16px]" />
            <span>{t("Timeline")}</span>
          </button>
        </div>

        {/* ─── TAB 1: LIV PLAN, HABITS & CARE JOURNEYS ──────────────────────── */}
        {activeTab === "plan" && (
          <LivScope theme="dark" className="flex flex-col gap-4">
            {/* 1. Hero Programme Card */}
            {activeDoctorPlan ? (
              <LivCard variant="inverted" className="p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <LivLabel className="text-[var(--liv-inv-muted)]">
                      {t("Doctor-Assigned Care Plan")} · {formatDate(activeDoctorPlan.approved_at || activeDoctorPlan.createdAt)}
                    </LivLabel>
                    <LivHeading level={2} className="text-[22px] mt-1 text-[var(--liv-inv-fg)]">
                      {activeDoctorPlan.consultation_summary || t("Personalized Longevity Programme")}
                    </LivHeading>
                  </div>
                  {activeDoctorPlan.status && (
                    <LivPill tone="optimal">{activeDoctorPlan.status}</LivPill>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-2 border-t border-[var(--liv-inv-line)]">
                  <LivProgressRing
                    size={68}
                    strokeWidth={5}
                    progress={milestonesDone / clinicalMilestones.length}
                    onBg={true}
                  >
                    <span className="font-serif text-[18px] font-medium text-[var(--liv-inv-fg)]">
                      {milestonesDone}/{clinicalMilestones.length}
                    </span>
                  </LivProgressRing>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-[var(--liv-inv-fg)] font-semibold block">
                      {t("Programme Milestones Active")}
                    </span>
                    <span className="text-[11px] text-[var(--liv-inv-muted)] block mt-0.5 leading-relaxed">
                      {activeDoctorPlan.approved_by
                        ? `${t("Supervised by Dr.")} ${activeDoctorPlan.approved_by}`
                        : t("Prescribed by treating physician")}
                    </span>
                  </div>
                </div>
              </LivCard>
            ) : latestAssessment ? (
              <LivCard variant="inverted" className="p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <LivLabel className="text-[var(--liv-inv-muted)]">
                      {latestAssessment.source === "kiosk"
                        ? `Living Lab Kiosk #${latestAssessment.kiosk_id || "Screening"}`
                        : t("Screening Assessment")}{" "}
                      · {formatDate(latestAssessment.created_at)}
                    </LivLabel>
                    <LivHeading level={2} className="text-[22px] mt-1 text-[var(--liv-inv-fg)]">
                      {latestAssessment.complaint || t("Verified Clinical Health Plan")}
                    </LivHeading>
                  </div>
                  {latestAssessment.band && (
                    <LivPill tone={latestAssessment.band.toLowerCase().includes("low") ? "optimal" : "borderline"}>
                      {latestAssessment.band}
                    </LivPill>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-2 border-t border-[var(--liv-inv-line)]">
                  <LivProgressRing
                    size={68}
                    strokeWidth={5}
                    progress={(latestAssessment.score || 0) / 100}
                    onBg={true}
                  >
                    <span className="font-serif text-[20px] font-medium text-[var(--liv-inv-fg)]">
                      {latestAssessment.score || "—"}
                    </span>
                  </LivProgressRing>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-[var(--liv-inv-fg)] font-semibold block">
                      {t("AWIS · Active Wellness Index Score")}
                    </span>
                    <span className="text-[11px] text-[var(--liv-inv-muted)] block mt-0.5 leading-relaxed">
                      {latestAssessment.summary || t("Screening results registered at kiosk.")}
                    </span>
                  </div>
                </div>

                <div className="pt-1 flex gap-2">
                  <LivButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      window.location.href = `/report/${latestAssessment.id}`;
                    }}
                    className="flex-1 border-[var(--liv-inv-line)] text-[var(--liv-inv-fg)] hover:bg-white/10"
                    icon={<Icon name="visibility" className="text-[15px]" />}
                  >
                    {t("View Longevity Report")}
                  </LivButton>
                </div>
              </LivCard>
            ) : (
              /* No Active Plan State */
              <LivCard variant="empty">
                <div className="size-11 rounded-full border border-[var(--liv-line2)] grid place-items-center mb-2.5 text-[var(--liv-text)]">
                  <Icon name="assignment_late" className="text-[22px]" />
                </div>
                <LivHeading level={2} className="text-[19px] mb-1">
                  {t("No Active Programme Yet")}
                </LivHeading>
                <LivSubtext className="text-xs max-w-xs mb-4 text-[var(--liv-muted)]">
                  {t(
                    "Your doctor-assigned longevity programme, daily habits, and milestones will appear here following a clinical kiosk check-up or physician consultation.",
                  )}
                </LivSubtext>
                <div className="flex flex-wrap gap-2 justify-center">
                  <LivButton size="sm" onClick={() => (window.location.href = "/checkup")}>
                    {t("Start Guided Check-up")}
                  </LivButton>
                  <LivButton variant="ghost" size="sm" onClick={() => (window.location.href = "/appointments")}>
                    {t("Book Consultation")}
                  </LivButton>
                </div>
              </LivCard>
            )}

            {/* 2. Today's Tasks & Habits Section */}
            {verifiedTasks.length > 0 && (
              <LivCard variant="default" className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--liv-line)]">
                  <div>
                    <LivHeading level={3} className="text-sm font-semibold">
                      {t("Verified Daily Habits & Tasks")}
                    </LivHeading>
                    <LivSubtext className="text-[11px] text-[var(--liv-muted)] mt-0.5">
                      {t("Derived from your approved clinical care guidance")}
                    </LivSubtext>
                  </div>
                  <span className="text-xs font-mono text-[var(--liv-muted)]">
                    {verifiedTasks.filter((t) => t.done).length}/{verifiedTasks.length} {t("done")}
                  </span>
                </div>

                <div className="divide-y divide-[var(--liv-line)]">
                  {verifiedTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => handleToggleTask(task)}
                      className="liv-habit text-left group"
                      aria-label={`${task.title} - ${task.done ? t("completed") : t("pending")}`}
                    >
                      <span className={cn("box", task.done && "on")}>
                        {task.done ? "✓" : ""}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className={cn("text-xs font-medium block truncate text-[var(--liv-text)]", task.done && "line-through opacity-70")}>
                          {task.title}
                        </span>
                        {task.detail && (
                          <span className="text-[11px] text-[var(--liv-muted)] block truncate mt-0.5">
                            {task.detail}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </LivCard>
            )}

            {/* 3. Three Clinical Journeys Section */}
            <div className="flex flex-col gap-2.5">
              <div className="px-1 flex items-center justify-between">
                <div>
                  <LivLabel>{t("Clinical Focus Areas")}</LivLabel>
                  <LivHeading level={3} className="text-base font-semibold mt-0.5">
                    {t("Your Clinical Journeys")}
                  </LivHeading>
                </div>
                <span className="text-[11px] font-mono text-[var(--liv-muted)]">
                  {assignedJourneys.length} {t("assigned")}
                </span>
              </div>

              {assignedJourneys.length > 0 ? (
                assignedJourneys.map((journey) => (
                  <LivCard key={journey.id} variant="default" className="p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-[var(--liv-text)] block">
                          {journey.title}
                        </span>
                        <span className="text-[11px] text-[var(--liv-muted)] block mt-0.5">
                          {journey.tagline}
                        </span>
                      </div>
                      <LivPill tone="priority">{t("Active Track")}</LivPill>
                    </div>

                    <div className="p-2.5 rounded-xl border border-[var(--liv-line)] bg-[var(--liv-surf2)] text-[11px]">
                      <span className="font-mono text-[var(--liv-muted)] block mb-0.5 uppercase tracking-wider text-[10px]">
                        {t("Clinical Target")}
                      </span>
                      <span className="font-medium text-[var(--liv-text)] block">
                        {journey.clinicalGoal}
                      </span>
                    </div>

                    {/* Report markers linked to this journey */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--liv-muted)]">
                        {t("Screening Markers Tracked")}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {journey.markers.map((m) => (
                          <span
                            key={m}
                            className="px-2 py-0.5 rounded-md border border-[var(--liv-line)] bg-[var(--liv-surf)] text-[11px] font-mono text-[var(--liv-text)]"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Step Timeline for this Journey */}
                    <div className="space-y-2 pt-1 border-t border-[var(--liv-line)]">
                      {journey.steps.map((st, sIdx) => (
                        <div key={sIdx} className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="size-1.5 rounded-full bg-[var(--liv-text)] shrink-0" />
                            <span className="truncate text-[var(--liv-text)]">{st.title}</span>
                            <span className="text-[10px] font-mono text-[var(--liv-muted)] shrink-0">
                              ({st.timeline})
                            </span>
                          </div>
                          {st.ctaTo && st.ctaLabel && (
                            <Link
                              to={st.ctaTo}
                              className="text-[10px] font-mono font-bold text-[var(--liv-text)] underline shrink-0 hover:opacity-80"
                            >
                              {st.ctaLabel} →
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </LivCard>
                ))
              ) : (
                <div className="p-4 rounded-2xl border border-dashed border-[var(--liv-line)] text-center text-xs text-[var(--liv-muted)]">
                  {t(
                    "No specialized clinical journeys (Metabolic, Inflammation, Derma/Hair) currently flagged. General wellness targets are active.",
                  )}
                </div>
              )}
            </div>

            {/* 4. Programme Milestone Timeline & Achievements */}
            <LivCard variant="default" className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--liv-line)]">
                <div>
                  <LivHeading level={3} className="text-sm font-semibold">
                    {t("Care Milestone Timeline")}
                  </LivHeading>
                  <LivSubtext className="text-[11px] text-[var(--liv-muted)] mt-0.5">
                    {t("Grounded in your verified clinical records")}
                  </LivSubtext>
                </div>
                <span className="text-xs font-mono text-[var(--liv-muted)]">
                  {milestonesDone}/{clinicalMilestones.length}
                </span>
              </div>

              <div className="space-y-3 pt-1">
                {clinicalMilestones.map((ms, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <span
                      className={cn(
                        "size-6 rounded-full border grid place-items-center shrink-0 mt-0.5 text-[11px] font-mono",
                        ms.done
                          ? "bg-[var(--liv-inv)] border-[var(--liv-inv)] text-[var(--liv-inv-fg)] font-bold"
                          : ms.current
                          ? "border-[var(--liv-text)] text-[var(--liv-text)] ring-2 ring-[var(--liv-line2)]"
                          : "border-[var(--liv-line2)] text-[var(--liv-muted)]",
                      )}
                    >
                      {ms.done ? "✓" : idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("font-medium text-[var(--liv-text)] truncate", ms.done && "line-through opacity-80")}>
                          {ms.title}
                        </span>
                        {ms.done && (
                          <span className="text-[10px] font-mono text-[var(--liv-muted)] shrink-0">
                            {t("Verified")}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--liv-muted)] mt-0.5 leading-relaxed">
                        {ms.desc}
                      </p>
                      {ms.action && (
                        <div className="pt-1.5">
                          <Link
                            to={ms.action.to}
                            className="inline-block text-[11px] font-mono font-bold text-[var(--liv-text)] underline"
                          >
                            {ms.action.label} →
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Verified Achievements Row */}
              <div className="pt-3 border-t border-[var(--liv-line)]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--liv-muted)] block mb-2">
                  {t("Verified Clinical Badges")}
                </span>
                <div className="liv-badges">
                  {verifiedBadges.map((bd, idx) => (
                    <div key={idx} className={cn("liv-bd", !bd.unlocked && "lock")}>
                      <span className="ico">{bd.unlocked ? "✓" : "🔒"}</span>
                      <b className="truncate text-xs">{bd.title}</b>
                      <small className="truncate text-[10px] text-[var(--liv-muted)]">
                        {bd.detail}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
            </LivCard>

            {/* 5. Care Actions & Quick Links */}
            <div className="p-4 rounded-2xl border border-[var(--liv-line)] bg-[var(--liv-surf)] flex flex-col gap-2.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--liv-muted)]">
                {t("Care Navigation")}
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  to="/appointments"
                  className="p-3 rounded-xl border border-[var(--liv-line)] bg-[var(--liv-surf2)] text-[var(--liv-text)] hover:opacity-80 transition-opacity flex items-center gap-2 font-medium"
                >
                  <Icon name="event" className="text-[16px]" />
                  <span>{t("Appointments")}</span>
                </Link>
                <Link
                  to="/reports"
                  className="p-3 rounded-xl border border-[var(--liv-line)] bg-[var(--liv-surf2)] text-[var(--liv-text)] hover:opacity-80 transition-opacity flex items-center gap-2 font-medium"
                >
                  <Icon name="folder_open" className="text-[16px]" />
                  <span>{t("Reports & Labs")}</span>
                </Link>
                <Link
                  to="/upload"
                  className="p-3 rounded-xl border border-[var(--liv-line)] bg-[var(--liv-surf2)] text-[var(--liv-text)] hover:opacity-80 transition-opacity flex items-center gap-2 font-medium"
                >
                  <Icon name="upload_file" className="text-[16px]" />
                  <span>{t("Upload Lab Test")}</span>
                </Link>
                <Link
                  to="/aaha"
                  search={{ report: undefined }}
                  className="p-3 rounded-xl border border-[var(--liv-line)] bg-[var(--liv-surf2)] text-[var(--liv-text)] hover:opacity-80 transition-opacity flex items-center gap-2 font-medium"
                >
                  <Icon name="chat" className="text-[16px]" />
                  <span>{t("Ask Aaha AI")}</span>
                </Link>
              </div>
            </div>
          </LivScope>
        )}

        {/* ─── TAB 2: REMINDERS & NOTIFICATIONS (PRESERVED) ────────────────── */}
        {activeTab === "reminders" && (
          <div className="flex flex-col gap-4">
            {unreadNotifs.length > 0 && (
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("Active Alerts")} ({unreadNotifs.length})
                </span>
                <button
                  type="button"
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                  className="text-xs font-bold text-primary hover:underline transition-colors"
                >
                  {t("Mark all as read")}
                </button>
              </div>
            )}

            {reminders.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                  {t("Care Reminders")}
                </span>
                {reminders.map((rem) => (
                  <div
                    key={rem.id}
                    className="p-4 rounded-2xl border border-primary/20 bg-accent/30 shadow-soft flex flex-col gap-2.5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="size-9 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                        <Icon name={rem.icon} className="text-lg" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-foreground">{rem.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                          {rem.desc}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <Btn to={rem.to} size="sm" variant="outline" className="w-auto text-xs h-8 px-3">
                        {rem.actionLabel}
                      </Btn>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                {t("System Notifications")}
              </span>

              {notifsQuery.isLoading ? (
                <div className="space-y-2">
                  <div className="h-20 w-full animate-pulse rounded-2xl bg-muted/60" />
                  <div className="h-20 w-full animate-pulse rounded-2xl bg-muted/60" />
                </div>
              ) : notifications.length === 0 && reminders.length === 0 ? (
                <div className="p-8 text-center rounded-3xl border border-border/80 bg-card my-2 shadow-soft">
                  <div className="size-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center mx-auto mb-3">
                    <Icon name="check_circle" className="text-3xl" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">
                    {t("You're all caught up!")}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1 leading-relaxed">
                    {t(
                      "No pending alerts or notifications. You will receive updates here for upcoming visits and test results.",
                    )}
                  </p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center rounded-2xl border border-border/60 bg-muted/30 text-xs text-muted-foreground">
                  {t("No additional system messages.")}
                </div>
              ) : (
                notifications.map((n: Notification) => (
                  <div
                    key={n.id || n._id}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all flex items-start gap-3",
                      n.is_read
                        ? "bg-card/70 border-border/60 opacity-80"
                        : "bg-card border-primary/30 shadow-xs ring-1 ring-primary/10",
                    )}
                  >
                    <span
                      className={cn(
                        "size-9 rounded-xl grid place-items-center shrink-0 text-base",
                        n.is_read
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      <Icon name={n.kind === "alert" ? "warning" : "info"} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-foreground truncate">{n.title}</h4>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatDate(n.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>

                      <div className="mt-2 flex items-center justify-between">
                        {n.link ? (
                          <Link
                            to={n.link}
                            className="text-[11px] font-bold text-primary hover:underline"
                          >
                            {t("View Details")} →
                          </Link>
                        ) : (
                          <span />
                        )}
                        {!n.is_read && (
                          <button
                            type="button"
                            onClick={() => markReadMutation.mutate(n.id || n._id || "")}
                            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {t("Mark as read")}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 3: CARE TIMELINE (PRESERVED) ────────────────────────────── */}
        {activeTab === "timeline" && (
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-accent/40 border border-primary/20 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-primary block">
                  {legacyStepsDone === 0
                    ? t("Your care journey starts here")
                    : `${legacyStepsDone} of ${legacyTimelineSteps.length} ${t("steps completed")}`}
                </span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  {t("Step-by-step guidance to achieve your healthiest self.")}
                </span>
              </div>
              <span className="text-xl font-extrabold text-primary">
                {Math.round((legacyStepsDone / legacyTimelineSteps.length) * 100)}%
              </span>
            </div>

            <ol className="relative space-y-4 pl-1">
              {legacyTimelineSteps.map((s, i) => (
                <li key={s.t} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "size-10 rounded-full grid place-items-center text-lg shrink-0",
                        s.s === "done" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold",
                        s.s === "next" && "bg-primary text-primary-foreground font-bold shadow-sm",
                        s.s === "todo" && "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon name={s.s === "done" ? "check" : s.i} />
                    </span>
                    {i < legacyTimelineSteps.length - 1 && (
                      <span className="mt-1 w-0.5 flex-1 bg-border/80" />
                    )}
                  </div>

                  <div className="p-3.5 rounded-2xl border border-border/80 bg-card flex flex-col gap-1 min-w-0 shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-foreground truncate">{s.t}</h4>
                      {s.s === "next" && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                          {t("Next Step")}
                        </span>
                      )}
                      {s.s === "done" && (
                        <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                          ✓ {t("Completed")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{s.d}</p>
                    {s.s === "next" && (
                      <div className="pt-2">
                        <Btn to={s.to} size="sm" variant="outline" className="w-auto text-xs h-8 px-3">
                          {t("Continue")} →
                        </Btn>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </Screen>
  );
}

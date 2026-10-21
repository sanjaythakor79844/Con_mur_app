import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Icon, Screen, Card, Btn, Pill, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { formatDate, useOverview } from "@/hooks/use-overview";
import { useAuth } from "@/hooks/use-auth";
import {
  listNotifications,
  markAllNotificationsRead,
  getPreferences,
  listCarePlans,
  updateCarePlan,
  type CarePlan,
} from "@/lib/aaha-api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { title: "Care Journey & Wellness Plan | Aaha Companion" },
      {
        name: "description",
        content:
          "Your personalized Aaha care journey, doctor-prescribed care plan, daily wellness habits, and clinical milestone timeline.",
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

const DEFAULT_HABITS = [
  {
    id: "habit_water",
    title: "Morning Hydration",
    detail: "Start your morning with 500ml water to kickstart metabolic clearance.",
    icon: "water_drop",
  },
  {
    id: "habit_walk",
    title: "Post-Meal Gentle Walk",
    detail: "10–15 minutes of easy walking after main meals aids postprandial glucose.",
    icon: "directions_walk",
  },
  {
    id: "habit_nutrition",
    title: "Protein & Fiber-Forward Plate",
    detail: "Incorporate whole grains, legumes, vegetables, and balanced protein.",
    icon: "restaurant",
  },
  {
    id: "habit_sleep",
    title: "Restful Sleep Consistency",
    detail: "Protect a regular 7–8 hour sleep schedule to support cellular repair.",
    icon: "bedtime",
  },
];

function PlanPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { userId, patient } = useAuth();
  const {
    latestAssessment,
    assessments,
    reports,
    appointments,
    upcoming,
    loading: overviewLoading,
  } = useOverview();

  // Active top-level navigation: 'plan' | 'reminders' | 'timeline'
  const [activeTab, setActiveTab] = useState<"plan" | "reminders" | "timeline">("plan");

  // Fetch real Doctor Care Plans from backend
  const { data: carePlans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ["carePlans", userId],
    queryFn: listCarePlans,
    enabled: Boolean(userId),
  });

  const activeCarePlan = useMemo(() => {
    return carePlans.find((cp) => cp.status === "approved") || carePlans[0] || null;
  }, [carePlans]);

  // Mutation to persist habit completion to verified Doctor CarePlan if exists
  const carePlanMutation = useMutation({
    mutationFn: async (updatedPlan: Partial<CarePlan>) => {
      if (!activeCarePlan?._id && !activeCarePlan?.id) return null;
      const planId = (activeCarePlan._id || activeCarePlan.id)!;
      return await updateCarePlan(planId, updatedPlan);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["carePlans", userId] });
      toast.success(t("Care plan progress saved"));
    },
    onError: () => {
      toast.error(t("Could not save to doctor care plan. Saved locally."));
    },
  });

  // Daily habits state
  const [habitsState, setHabitsState] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("aaha_habits_state");
      return saved ? JSON.parse(saved) : { habit_water: true, habit_walk: false, habit_nutrition: false, habit_sleep: false };
    } catch {
      return { habit_water: true, habit_walk: false, habit_nutrition: false, habit_sleep: false };
    }
  });

  const toggleHabit = (id: string) => {
    const next = { ...habitsState, [id]: !habitsState[id] };
    setHabitsState(next);
    try {
      localStorage.setItem("aaha_habits_state", JSON.stringify(next));
    } catch {}

    if (activeCarePlan && (activeCarePlan._id || activeCarePlan.id)) {
      const updatedLife = (activeCarePlan.lifestyle_management || []).map((item, idx) => {
        if (`life_${idx}` === id) return { ...item, done: next[id] };
        return item;
      });
      carePlanMutation.mutate({ lifestyle_management: updatedLife });
    }
  };

  // Compile habits list: doctor prescribed if available, else standard clinical guidelines
  const displayHabits = useMemo(() => {
    if (activeCarePlan) {
      const items: Array<{ id: string; title: string; detail: string; icon: string; source: "doctor" | "clinical" }> = [];
      if (activeCarePlan.medication && activeCarePlan.medication.length > 0) {
        activeCarePlan.medication.forEach((m, idx) => {
          items.push({
            id: `med_${idx}`,
            title: m.name,
            detail: `${m.dosage || ""} · ${m.frequency || "Daily"}${m.notes ? ` (${m.notes})` : ""}`.trim(),
            icon: "medication",
            source: "doctor",
          });
        });
      }
      if (activeCarePlan.lifestyle_management && activeCarePlan.lifestyle_management.length > 0) {
        activeCarePlan.lifestyle_management.forEach((l, idx) => {
          items.push({
            id: `life_${idx}`,
            title: l.title,
            detail: l.detail || t("Doctor-prescribed lifestyle goal"),
            icon: "self_improvement",
            source: "doctor",
          });
        });
      }
      if (activeCarePlan.nutrition && activeCarePlan.nutrition.length > 0) {
        activeCarePlan.nutrition.forEach((n, idx) => {
          items.push({
            id: `nutr_${idx}`,
            title: n.title,
            detail: n.detail || t("Doctor-approved nutrition target"),
            icon: "restaurant",
            source: "doctor",
          });
        });
      }
      if (items.length > 0) return items;
    }

    return DEFAULT_HABITS.map((h) => ({ ...h, source: "clinical" as const }));
  }, [activeCarePlan, t]);

  const habitsDoneCount = displayHabits.filter((h) => habitsState[h.id]).length;

  // Backend queries for Notifications & Reminders
  const notifsQuery = useQuery({
    queryKey: ["notifications", userId],
    enabled: Boolean(userId),
    queryFn: listNotifications,
  });

  const prefsQuery = useQuery({
    queryKey: ["preferences"],
    queryFn: getPreferences,
  });
  const prefs = prefsQuery.data;

  const notifications = notifsQuery.data || [];
  const unreadNotifs = notifications.filter((n) => !n.is_read);

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      toast.success(t("All notifications marked as read"));
      void qc.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  const now = new Date();
  const reminders: Array<{
    id: string;
    title: string;
    desc: string;
    icon: string;
    to: string;
    actionLabel: string;
  }> = [];

  if ((prefs?.appointment_reminders ?? true) && upcoming) {
    const isToday =
      upcoming.appointment_date === now.toISOString().split("T")[0] ||
      upcoming.scheduled_for === now.toISOString().split("T")[0];

    reminders.push({
      id: "reminder-upcoming-appt",
      title: isToday ? t("Appointment Today") : t("Upcoming Appointment"),
      desc: `${formatDate(upcoming.scheduled_for || upcoming.appointment_date)}, ${upcoming.slot_label || upcoming.appointment_time} • ${upcoming.doctor_name || upcoming.speciality || "Consultation"} (${upcoming.mode})`,
      icon: "event_available",
      to: "/appointments",
      actionLabel: t("View Appointment"),
    });
  }

  // Combine chronological records for Timeline
  const timelineItems = useMemo(() => {
    const items: Array<{
      id: string;
      date: string;
      title: string;
      desc: string;
      icon: string;
      to?: string;
      badge?: string;
    }> = [];

    assessments.forEach((a) => {
      const readings = (a.readings as Record<string, any>) || {};
      const hr = readings.heart_rate || readings.pulse || "";
      const bp = readings.bp_systolic ? `${readings.bp_systolic}/${readings.bp_diastolic}` : readings.bp || "";
      const scoreStr = a.score != null ? String(a.score) : "Recorded";
      const vitalsSummary = [hr ? `Heart Rate: ${hr} bpm` : "", bp ? `BP: ${bp}` : ""].filter(Boolean).join(" • ");

      items.push({
        id: `assessment_${a.id || a.created_at}`,
        date: a.created_at || "",
        title: t("Kiosk Health Assessment"),
        desc: `AWIS Wellness Score: ${scoreStr}${vitalsSummary ? ` • ${vitalsSummary}` : ""}`,
        icon: "health_metrics",
        to: `/assessment?id=${a.id}`,
        badge: t("Kiosk Evaluation"),
      });
    });

    reports.forEach((r) => {
      items.push({
        id: `report_${r.id || r.created_at}`,
        date: r.created_at || r.report_date || "",
        title: r.title || r.category || t("Laboratory Diagnostic Report"),
        desc: r.status_label || t("Diagnostic lab report analyzed and explained."),
        icon: "description",
        to: `/report/${r.id}`,
        badge: t("Lab Report"),
      });
    });

    appointments.forEach((apt) => {
      items.push({
        id: `appt_${apt.appointment_id || apt.id}`,
        date: apt.appointment_date || apt.scheduled_for || "",
        title: apt.appointment_type || t("Doctor Consultation"),
        desc: `${apt.doctor_name ? `${apt.doctor_name} • ` : ""}${apt.centre || "Aaha Health Centre"} (${apt.status})`,
        icon: "calendar_month",
        to: "/appointments",
        badge: t("Clinical Visit"),
      });
    });

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items;
  }, [assessments, reports, appointments, t]);

  return (
    <Screen nav={true}>
      <div className="min-h-screen px-4 pb-28 pt-4 sm:px-6 max-w-lg mx-auto w-full">
        {/* Top Header */}
        <header className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="size-8 rounded-full bg-primary/10 text-primary grid place-items-center">
                <Icon name="assignment" className="text-[18px]" />
              </span>
              <div>
                <h1 className="text-lg font-bold text-foreground leading-tight">
                  {t("Aaha Care Journey")}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {t("Doctor plans, healthy habits, and clinical milestones")}
                </p>
              </div>
            </div>

            <Btn
              variant="outline"
              size="sm"
              className="w-auto h-8 px-3 text-xs"
              onClick={() => navigate({ to: "/appointments" })}
              icon="calendar_month"
            >
              {t("Book Visit")}
            </Btn>
          </div>

          {/* 3-Tab Segmented Switcher */}
          <div className="h-11 p-1 rounded-2xl bg-muted/60 border border-border/80 grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("plan")}
              className={cn(
                "rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                activeTab === "plan"
                  ? "bg-card text-foreground shadow-soft border border-border/60"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon name="assignment" className="text-[15px]" />
              <span>{t("Care Plan")}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("reminders")}
              className={cn(
                "rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                activeTab === "reminders"
                  ? "bg-card text-foreground shadow-soft border border-border/60"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon name="notifications" className="text-[15px]" />
              <span>{t("Reminders")}</span>
              {unreadNotifs.length + reminders.length > 0 && (
                <span className="size-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">
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
                  ? "bg-card text-foreground shadow-soft border border-border/60"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon name="timeline" className="text-[15px]" />
              <span>{t("Timeline")}</span>
            </button>
          </div>
        </header>

        {/* ─── TAB 1: CARE PLAN & HABITS ─── */}
        {activeTab === "plan" && (
          <div className="space-y-4">
            {/* Real Doctor Care Plan Card */}
            {activeCarePlan ? (
              <Card className="p-4 space-y-3 border-primary/30 shadow-soft">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-6 rounded-full bg-primary/10 text-primary grid place-items-center">
                      <Icon name="medical_services" className="text-[14px]" />
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {t("Doctor-Approved Care Plan")}
                    </span>
                  </div>
                  <Pill tone="green" icon="check_circle">
                    {activeCarePlan.status || t("Active")}
                  </Pill>
                </div>

                {activeCarePlan.consultation_summary && (
                  <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-2.5 rounded-xl border border-border/40">
                    {activeCarePlan.consultation_summary}
                  </p>
                )}

                <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/40">
                  <span>
                    {activeCarePlan.approved_by
                      ? `${t("Prescribed by")} ${activeCarePlan.approved_by}`
                      : t("Verified Aaha Medical Care Plan")}
                  </span>
                  <span>
                    {activeCarePlan.approved_at || activeCarePlan.createdAt
                      ? formatDate(activeCarePlan.approved_at || activeCarePlan.createdAt)
                      : ""}
                  </span>
                </div>
              </Card>
            ) : (
              <Card className="p-4 space-y-3 bg-muted/20 border-border/80 shadow-soft">
                <div className="flex items-start gap-3">
                  <span className="size-9 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0 mt-0.5">
                    <Icon name="clinical_notes" className="text-[20px]" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">
                      {t("No Doctor Care Plan Prescribed Yet")}
                    </h2>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      {t(
                        "Complete your clinical Kiosk screening or upload your diagnostic lab reports. Your supervising Aaha doctor will review your biomarkers and formulate your personalized care plan.",
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Btn
                    variant="primary"
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => navigate({ to: "/checkup" })}
                    icon="play_arrow"
                  >
                    {t("Start Check-up")}
                  </Btn>
                  <Btn
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => navigate({ to: "/appointments" })}
                    icon="calendar_month"
                  >
                    {t("Book Doctor Visit")}
                  </Btn>
                </div>
              </Card>
            )}

            {/* Daily Habits & Progress */}
            <Card className="p-4 space-y-3 shadow-soft border-border/80">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <div>
                  <h2 className="text-sm font-bold text-foreground">{t("Today's Health Habits")}</h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {t("Consistent daily lifestyle practices support long-term wellness")}
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-primary">
                  {habitsDoneCount}/{displayHabits.length} {t("done")}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-2 rounded-full bg-primary transition-all duration-300"
                  style={{
                    width: `${displayHabits.length > 0 ? (habitsDoneCount / displayHabits.length) * 100 : 0}%`,
                  }}
                />
              </div>

              {/* Habit rows */}
              <div className="divide-y divide-border/40">
                {displayHabits.map((h) => {
                  const isDone = Boolean(habitsState[h.id]);
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => toggleHabit(h.id)}
                      className="w-full flex items-center gap-3 py-2.5 text-left transition-colors hover:bg-muted/30 rounded-xl px-1"
                    >
                      <span
                        className={cn(
                          "size-5 rounded-md border flex items-center justify-center text-[12px] font-bold transition-all shrink-0",
                          isDone
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border bg-card text-transparent",
                        )}
                      >
                        ✓
                      </span>
                      <div className="flex-1 min-w-0">
                        <span
                          className={cn(
                            "text-xs font-semibold block text-foreground transition-all truncate",
                            isDone && "line-through text-muted-foreground",
                          )}
                        >
                          {h.title}
                        </span>
                        <span className="text-[11px] text-muted-foreground block truncate mt-0.5">
                          {h.detail}
                        </span>
                      </div>
                      <Icon name={h.icon} className="text-[18px] text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Clinical Transparency & Care Boundary */}
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-3.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-foreground font-semibold text-xs mb-1">
                <Icon name="verified_user" className="text-[16px] text-primary" />
                <span>{t("Clinical Transparency & Care Boundary")}</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed m-0">
                {t(
                  "Aaha wellness habits and trackers support daily lifestyle routine consistency. Completing daily items does not alter medical diagnoses or replace doctor care. Real health improvement is verified through physician consultations and periodic biomarker evaluations at an Aaha Health Centre.",
                )}
              </p>
            </div>
          </div>
        )}

        {/* ─── TAB 2: REMINDERS & NOTIFICATIONS ─── */}
        {activeTab === "reminders" && (
          <div className="space-y-4">
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
              <div className="space-y-2.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground px-1 block">
                  {t("Care Reminders")}
                </span>
                {reminders.map((rem) => (
                  <Card key={rem.id} className="p-4 space-y-2 border-primary/40 shadow-soft">
                    <div className="flex items-center gap-2">
                      <Icon name={rem.icon} className="text-[18px] text-primary" />
                      <span className="text-xs font-bold text-foreground">{rem.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed m-0">{rem.desc}</p>
                    <div className="pt-1 flex justify-end">
                      <Link
                        to={rem.to}
                        className="text-xs font-semibold text-primary underline"
                      >
                        {rem.actionLabel} →
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {notifications.length > 0 ? (
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground px-1 block">
                  {t("Notifications Log")}
                </span>
                <Card className="divide-y divide-border/40 p-0 overflow-hidden shadow-soft">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-3.5 flex items-start gap-3 text-xs">
                      <span
                        className={cn(
                          "size-2 rounded-full mt-1.5 shrink-0",
                          n.is_read ? "bg-muted-foreground/40" : "bg-primary",
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-foreground block">{n.title}</span>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed m-0">
                          {n.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </Card>
              </div>
            ) : (
              reminders.length === 0 && (
                <Card className="p-8 text-center space-y-2 shadow-soft">
                  <Icon name="notifications_off" className="text-3xl text-muted-foreground mx-auto" />
                  <h2 className="text-sm font-bold text-foreground">{t("No active alerts")}</h2>
                  <p className="text-xs text-muted-foreground">
                    {t("You are fully up to date with your care reminders and notifications.")}
                  </p>
                </Card>
              )
            )}
          </div>
        )}

        {/* ─── TAB 3: CARE TIMELINE & HISTORY ─── */}
        {activeTab === "timeline" && (
          <div className="space-y-4">
            {/* Longitudinal Care Plan Steps */}
            <Card className="p-4 space-y-3 shadow-soft border-border/80">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  {t("Longitudinal Care Journey")}
                </span>
                <h2 className="text-base font-bold text-foreground mt-0.5">
                  {t("Clinical Milestones")}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                  {t("Your care progression grounded in verified kiosk screening readings and clinical doctor reviews.")}
                </p>
              </div>

              <div className="space-y-3 pt-2 border-t border-border/40">
                {[
                  {
                    step: "1",
                    title: t("Guided Health Check-up"),
                    desc: t("Full vital screening with AWIS wellness score calculation."),
                    status: latestAssessment ? t("Completed") : t("Next Step"),
                    isDone: Boolean(latestAssessment),
                    to: "/checkup",
                  },
                  {
                    step: "2",
                    title: t("Diagnostic Lab Upload"),
                    desc: t("Blood chemistry and diagnostic panels analyzed and explained."),
                    status: reports.length > 0 ? t("Completed") : t("Upcoming"),
                    isDone: reports.length > 0,
                    to: "/upload",
                  },
                  {
                    step: "3",
                    title: t("Doctor Consultation & Care Plan"),
                    desc: t("Physician consultation to review biomarkers and establish your targets."),
                    status: activeCarePlan ? t("Active Plan") : appointments.length > 0 ? t("Booked") : t("Upcoming"),
                    isDone: Boolean(activeCarePlan),
                    to: "/appointments",
                  },
                  {
                    step: "4",
                    title: t("Day-90 Milestone Re-Test"),
                    desc: t("Biomarker and body composition re-measurement at the Aaha kiosk."),
                    status: t("Upcoming"),
                    isDone: false,
                    to: "/appointments",
                  },
                ].map((s) => (
                  <div key={s.step} className="flex items-start gap-3 text-xs">
                    <span
                      className={cn(
                        "size-6 rounded-full font-mono text-[11px] font-bold grid place-items-center shrink-0 mt-0.5",
                        s.isDone
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-muted/60 text-muted-foreground",
                      )}
                    >
                      {s.isDone ? "✓" : s.step}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground">{s.title}</span>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">
                          {s.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed m-0">
                        {s.desc}
                      </p>
                      <div className="pt-1">
                        <Link to={s.to} className="text-[11px] font-semibold text-primary underline">
                          {t("Open")} →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Real Recorded History */}
            {timelineItems.length > 0 ? (
              <div className="space-y-2.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground px-1 block">
                  {t("Recorded Health Events")} ({timelineItems.length})
                </span>
                <div className="space-y-2">
                  {timelineItems.map((item) => (
                    <Card key={item.id} className="p-3.5 space-y-1.5 shadow-soft hover:border-primary/40 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="size-7 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                            <Icon name={item.icon} className="text-[16px]" />
                          </span>
                          <span className="font-bold text-xs text-foreground truncate">{item.title}</span>
                        </div>
                        {item.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-muted text-muted-foreground shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed pl-9 m-0">
                        {item.desc}
                      </p>
                      <div className="flex items-center justify-between pl-9 pt-1 text-[11px]">
                        <span className="text-muted-foreground font-mono">
                          {formatDate(item.date)}
                        </span>
                        {item.to && (
                          <Link to={item.to} className="text-primary font-semibold underline">
                            {t("View Details")} →
                          </Link>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <Card className="p-6 text-center space-y-2 shadow-soft">
                <Icon name="history" className="text-3xl text-muted-foreground mx-auto" />
                <h2 className="text-sm font-bold text-foreground">{t("No health records recorded yet")}</h2>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  {t("Screenings from the Aaha Kiosk and diagnostic lab report uploads will form your chronological medical history here.")}
                </p>
              </Card>
            )}
          </div>
        )}
      </div>
    </Screen>
  );
}

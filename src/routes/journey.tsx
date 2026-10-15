import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Btn,
  Icon,
  Screen,
  TopBar,
} from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { formatDate, useOverview } from "@/hooks/use-overview";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getPreferences,
  type Notification,
} from "@/lib/aaha-api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { title: "Notifications & Journey | Aaha Companion" },
      {
        name: "description",
        content:
          "Your health alerts, appointment reminders, and step-by-step care journey timeline.",
      },
    ],
  }),
  component: JourneyScreen,
});

function JourneyScreen() {
  return (
    <RequireAuth message="Sign in to see your health reminders and care journey.">
      <JourneyPage />
    </RequireAuth>
  );
}

function JourneyPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { latestAssessment, reports, appointments, upcoming, loading: overviewLoading } =
    useOverview();

  const [activeTab, setActiveTab] = useState<"reminders" | "timeline">("reminders");

  // Notifications query
  const notifsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: listNotifications,
  });

  // User preferences
  const prefsQuery = useQuery({
    queryKey: ["preferences"],
    queryFn: getPreferences,
  });

  const prefs = prefsQuery.data;

  // Mark single notification read
  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Mark all notifications read
  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      toast.success(t("All notifications marked as read"));
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications = notifsQuery.data || [];
  const unreadNotifs = notifications.filter((n) => !n.is_read);

  // Derive dynamic reminders
  const reminders: Array<{
    id: string;
    title: string;
    desc: string;
    icon: string;
    tone: "brand" | "amber" | "emerald";
    to: string;
    actionLabel: string;
  }> = [];

  // 1. Upcoming appointment reminder (if user hasn't disabled appointment_reminders)
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

  // 2. Unfinished checkup reminder (if user has no assessments)
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

  // 3. Recommended lab tests follow-up reminder
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

  // Journey steps timeline
  const hasReport = reports.length > 0;
  const hasAssessment = Boolean(latestAssessment);
  const hasAppointment = appointments.length > 0;

  const timelineSteps = [
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

  const stepsDone = timelineSteps.filter((s) => s.s === "done").length;

  return (
    <Screen nav={true}>
      <TopBar title="Care Journey" subtitle="Reminders, alerts and timeline" back={true} />

      <div className="px-5 pt-3 pb-24 sm:px-6 flex flex-col gap-4">
        {/* Segmented control: Reminders vs Timeline */}
        <div className="h-11 p-1 rounded-2xl bg-muted/70 border border-border/80 grid grid-cols-2 gap-1">
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
            <Icon name="notifications" className="text-[17px]" />
            <span>{t("Reminders & Alerts")}</span>
            {(unreadNotifs.length > 0 || reminders.length > 0) && (
              <span className="size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-extrabold grid place-items-center">
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
            <Icon name="timeline" className="text-[17px]" />
            <span>{t("Care Timeline")}</span>
            <span className="text-[10px] font-semibold text-muted-foreground">
              ({stepsDone}/{timelineSteps.length})
            </span>
          </button>
        </div>

        {/* TAB 1: REMINDERS & ALERTS */}
        {activeTab === "reminders" && (
          <div className="flex flex-col gap-4">
            {/* Header action if unread notifications exist */}
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

            {/* Smart Reminders Section */}
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

            {/* Backend Notifications List */}
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
                /* All caught up */
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

        {/* TAB 2: HEALTH TIMELINE */}
        {activeTab === "timeline" && (
          <div className="flex flex-col gap-4">
            {/* Status overview banner */}
            <div className="p-4 rounded-2xl bg-accent/40 border border-primary/20 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-primary block">
                  {stepsDone === 0
                    ? t("Your care journey starts here")
                    : `${stepsDone} of ${timelineSteps.length} ${t("steps completed")}`}
                </span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  {t("Step-by-step guidance to achieve your healthiest self.")}
                </span>
              </div>
              <span className="text-xl font-extrabold text-primary">
                {Math.round((stepsDone / timelineSteps.length) * 100)}%
              </span>
            </div>

            {/* Ordered Timeline */}
            <ol className="relative space-y-4 pl-1">
              {timelineSteps.map((s, i) => (
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
                    {i < timelineSteps.length - 1 && (
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

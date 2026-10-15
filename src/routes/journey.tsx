import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Icon, Screen, TopBar } from "@/components/aaha";
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
  LivMark,
} from "@/components/liv";

export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { title: "Your 90-Day Plan & Care Journeys | Aaha Companion & Liv" },
      {
        name: "description",
        content:
          "Your personalized 90-day longevity programme, clinical journeys, daily habits, lifestyle trackers, and care timeline.",
      },
    ],
  }),
  component: JourneyScreen,
});

/* ─── 7-Day Rhythm Schedule (from Liv Prototype) ─── */
const WEEK_SCHEDULE = [
  { day: "Sun", title: "Rest day", detail: "Dance, rest, family. Fully off" },
  { day: "Mon", title: "Strength session", detail: "45 min · programmed with Coach Ritu" },
  { day: "Tue", title: "Post-dinner walk", detail: "Easy pace, 20 minutes" },
  { day: "Wed", title: "Strength session", detail: "45 min · programmed with Coach Ritu" },
  { day: "Thu", title: "Long walk", detail: "45 minutes at an easy pace" },
  { day: "Fri", title: "Strength session", detail: "45 min · programmed with Coach Ritu" },
  { day: "Sat", title: "Recovery session", detail: "At the centre, as prescribed" },
];

/* ─── Clinical Care Packages ─── */
export interface CarePackage {
  id: "hm" | "inf" | "dh";
  name: string;
  duration: string;
  focus: string;
  inclusions: string[];
}

const CARE_PACKAGES: Record<string, CarePackage> = {
  hm: {
    id: "hm",
    name: "Metabolic Reset",
    duration: "12 weeks",
    focus: "For HbA1c, insulin, and ApoB",
    inclusions: [
      "2 physician reviews with Dr. Meera Joshi",
      "14-day continuous glucose sensor",
      "36 strength sessions with Coach Ritu",
      "18 infrared sauna sessions at the centre",
      "2 nutrition sessions for glucose management",
      "Metabolic & Hormonal Health Drip, if prescribed",
      "Day-90 re-test at the Living Lab kiosk",
    ],
  },
  inf: {
    id: "inf",
    name: "Inflammation Care",
    duration: "12 weeks",
    focus: "For hs-CRP and vitamin D",
    inclusions: [
      "Physician-led vitamin D replacement",
      "12 photobiomodulation (red-light) sessions",
      "10-session hyperbaric oxygen block",
      "1 clinical nutrition session for fibre-forward plates",
      "Day-30 and Day-90 blood tests at the centre",
    ],
  },
  dh: {
    id: "dh",
    name: "Skin & Hair Renewal",
    duration: "12 weeks",
    focus: "For ferritin, vitamin D, and B12",
    inclusions: [
      "2 skin and hair scans at the Living Lab kiosk",
      "Physician-led iron and vitamin D replacement",
      "3 HydraFacial clinical sessions",
      "3 hair growth therapy (GFC) sessions",
      "Anti-Hairfall Drip, if prescribed",
      "Day-90 re-scan and re-test at the centre",
    ],
  },
};

/* ─── The Three Clinical Journeys (from Liv Prototype) ─── */
export interface JourneyStep {
  weeks: [number, number];
  when: string;
  tag: string;
  title: string;
  desc: string;
  cta?: [string, string]; // [Button Label, Destination / booking type]
  open?: boolean;
}

export interface ClinicalJourney {
  id: "hm" | "inf" | "dh";
  name: string;
  shortSummary: string;
  clinicalFinding: string;
  markers: Array<{ id: string; name: string; value: string; status: "p" | "b" | "o" }>;
  day90Goal: string;
  dailyGuidelines: string[];
  steps: JourneyStep[];
}

const CLINICAL_JOURNEYS: ClinicalJourney[] = [
  {
    id: "hm",
    name: "Hormonal and Metabolic",
    shortSummary: "Blood sugar is in the early-warning band. Thyroid is ideal.",
    clinicalFinding:
      "HbA1c 5.9% and fasting insulin 11.2 sit in the early-warning band, and ApoB is raised. Your thyroid is in the ideal zone. This is the best moment to act.",
    markers: [
      { id: "hba1c", name: "HbA1c", value: "5.9%", status: "b" },
      { id: "ins", name: "Fasting Insulin", value: "11.2", status: "b" },
      { id: "tg", name: "Triglycerides", value: "142", status: "b" },
      { id: "apob", name: "ApoB", value: "102", status: "p" },
      { id: "tsh", name: "TSH (thyroid)", value: "2.4", status: "o" },
    ],
    day90Goal: "HbA1c ≤ 5.7% · insulin < 9 · ApoB < 90",
    dailyGuidelines: [
      "Walk for 10 minutes after each main meal",
      "Front-load carbs earlier in the day and eat dinner earlier",
      "Protein at every meal and three strength sessions a week",
      "Protect a 7-hour night. Short nights raise next-day glucose",
    ],
    steps: [
      {
        weeks: [1, 1],
        when: "Week 1",
        tag: "Review",
        title: "Physician review",
        desc: "Dr. Meera Joshi confirms your plan against your labs.",
      },
      {
        weeks: [1, 2],
        when: "Weeks 1 to 2",
        tag: "Test",
        title: "14-day glucose sensor",
        desc: "Finds the specific foods that spike your blood sugar.",
      },
      {
        weeks: [1, 12],
        when: "Every day",
        tag: "Habit",
        title: "Walk after meals, eat dinner earlier",
        desc: "Tracked in your daily plan.",
      },
      {
        weeks: [3, 8],
        when: "Weeks 3 to 8",
        tag: "Training",
        title: "Strength sessions, three a week",
        desc: "Programmed by Coach Ritu. Muscle is where glucose goes.",
        cta: ["Book a session", "/appointments"],
      },
      {
        weeks: [3, 8],
        when: "Weeks 3 to 8",
        tag: "Therapy",
        title: "Infrared sauna, three a week",
        desc: "20 minutes at 55 to 60°C. Evidence: established.",
        cta: ["Book a session", "/appointments"],
      },
      {
        weeks: [4, 8],
        when: "Weeks 4 to 8",
        tag: "Therapy",
        title: "Metabolic and Hormonal Health Drip",
        desc: "Only if Dr. Meera Joshi prescribes it against your labs.",
        cta: ["Book, for sign-off", "/appointments"],
        open: true,
      },
      {
        weeks: [13, 13],
        when: "Day 90",
        tag: "Test",
        title: "Re-test at the kiosk",
        desc: "HbA1c, insulin, lipids and ApoB, checked against your targets.",
      },
    ],
  },
  {
    id: "inf",
    name: "Inflammation",
    shortSummary: "hs-CRP is mildly raised and vitamin D is low.",
    clinicalFinding:
      "hs-CRP of 2.1 shows mild silent inflammation, and vitamin D is deficient at 16. Both are expected to settle with the plan.",
    markers: [
      { id: "crp", name: "hs-CRP", value: "2.1", status: "b" },
      { id: "vitd", name: "Vitamin D", value: "16", status: "p" },
      { id: "vf", name: "Visceral Fat", value: "11", status: "b" },
    ],
    day90Goal: "hs-CRP < 1.0 · vitamin D > 40",
    dailyGuidelines: [
      "Fibre-forward plates: oats, legumes, isabgol and nuts",
      "Protect a 7-hour night. Short nights raise systemic inflammation",
      "Move every day. Strength and easy cardio are both in your plan",
    ],
    steps: [
      {
        weeks: [1, 1],
        when: "Week 1",
        tag: "Supplement",
        title: "Start vitamin D replacement",
        desc: "Dose prescribed by Dr. Meera Joshi.",
      },
      {
        weeks: [1, 12],
        when: "Every day",
        tag: "Habit",
        title: "Fibre-forward plates and a 7-hour night",
        desc: "Tracked in your daily plan.",
      },
      {
        weeks: [3, 8],
        when: "Weeks 3 to 8",
        tag: "Therapy",
        title: "Red-light session after training",
        desc: "20 minutes of red and near-infrared light. Evidence: strong emerging.",
        cta: ["Book a session", "/appointments"],
      },
      {
        weeks: [5, 5],
        when: "Day 30",
        tag: "Test",
        title: "Vitamin D and ferritin check",
        desc: "Confirms the oral replacement is working.",
        cta: ["Book the test", "/appointments"],
      },
      {
        weeks: [5, 10],
        when: "Weeks 5 to 10",
        tag: "Therapy",
        title: "Hyperbaric oxygen, introductory block",
        desc: "Ten 60-minute sessions after a safety screen. Evidence: emerging.",
        cta: ["Book a session", "/appointments"],
      },
      {
        weeks: [13, 13],
        when: "Day 90",
        tag: "Test",
        title: "Re-test at the kiosk",
        desc: "hs-CRP and vitamin D, checked against your targets.",
      },
    ],
  },
  {
    id: "dh",
    name: "Derma and Hair",
    shortSummary: "Refill iron and vitamin D first. Skin and hair scan pending.",
    clinicalFinding:
      "Ferritin is 18 and vitamin D is 16. Low iron stores and low vitamin D are commonly linked with hair shedding and dull skin, so we refill them before any treatment.",
    markers: [
      { id: "fer", name: "Ferritin", value: "18", status: "p" },
      { id: "vitd", name: "Vitamin D", value: "16", status: "p" },
      { id: "b12", name: "Vitamin B12", value: "260", status: "b" },
      { id: "hb", name: "Haemoglobin", value: "12.4", status: "b" },
    ],
    day90Goal: "Ferritin > 50 · vitamin D > 40 · B12 > 400",
    dailyGuidelines: [
      "Take iron and vitamin D exactly as prescribed by Dr. Meera Joshi",
      "Protein at every meal. Hair keratin is built from it",
      "Sunscreen SPF 30 or higher, every morning without fail",
    ],
    steps: [
      {
        weeks: [1, 1],
        when: "Week 1",
        tag: "Supplement",
        title: "Start iron and vitamin D",
        desc: "Doses prescribed by Dr. Meera Joshi.",
      },
      {
        weeks: [1, 4],
        when: "This week",
        tag: "Test",
        title: "Skin and hair scan at the kiosk",
        desc: "The smart camera sets your baseline for skin and scalp.",
        cta: ["Book the scan", "/appointments"],
        open: true,
      },
      {
        weeks: [2, 10],
        when: "Weeks 2 to 10",
        tag: "Therapy",
        title: "HydraFacial, once a month",
        desc: "Three sessions: cleanse, extract and hydrate.",
        cta: ["Book a session", "/appointments"],
      },
      {
        weeks: [4, 12],
        when: "Weeks 4 to 12",
        tag: "Therapy",
        title: "Hair growth therapy (GFC)",
        desc: "Three sessions, one month apart, after a doctor consult.",
        cta: ["Book, for sign-off", "/appointments"],
      },
      {
        weeks: [4, 8],
        when: "Weeks 4 to 8",
        tag: "Therapy",
        title: "Anti-Hairfall Drip",
        desc: "Only if prescribed against your labs.",
        cta: ["Book, for sign-off", "/appointments"],
        open: true,
      },
      {
        weeks: [13, 13],
        when: "Day 90",
        tag: "Test",
        title: "Re-scan and re-test",
        desc: "Skin and hair scan, ferritin, vitamin D and B12.",
      },
    ],
  },
];

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
  const navigate = useNavigate();
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

  // Active top-level navigation: 'plan' | 'reminders' | 'timeline'
  const [activeTab, setActiveTab] = useState<"plan" | "reminders" | "timeline">("plan");

  // Track viewer modal state
  const [selectedJourney, setSelectedJourney] = useState<ClinicalJourney | null>(null);

  // Care package sheet state
  const [inspectedPackage, setInspectedPackage] = useState<CarePackage | null>(null);
  const [requestedPackages, setRequestedPackages] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("liv_requested_packages");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Fetch real Doctor Care Plans
  const { data: carePlans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ["carePlans", userId],
    queryFn: listCarePlans,
    enabled: Boolean(userId),
  });

  const activeCarePlan = useMemo(() => {
    return carePlans.find((cp) => cp.status === "approved") || carePlans[0] || null;
  }, [carePlans]);

  // Programme Day & Dates Calculation
  const now = new Date();
  const currentDow = now.getDay(); // 0 is Sunday
  const planLength = 90;

  // Real startDate from Doctor Care Plan or Latest Kiosk Assessment
  const startDateStr = activeCarePlan?.approved_at || activeCarePlan?.createdAt || latestAssessment?.created_at;
  const dayNo = useMemo(() => {
    if (!startDateStr) return 1;
    const start = new Date(startDateStr).getTime();
    const diff = Math.floor((now.getTime() - start) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, Math.min(planLength, diff));
  }, [startDateStr, now]);

  const currentWeek = Math.ceil(dayNo / 7);
  const currentPhaseIndex = dayNo <= 14 ? 0 : dayNo <= 56 ? 1 : 2;

  // Re-measure date (approx 90 days from start)
  const retestDate = useMemo(() => {
    const base = startDateStr ? new Date(startDateStr) : new Date(now);
    base.setDate(base.getDate() + 90);
    return base;
  }, [startDateStr, now]);

  // Mutation to persist habit completion to verified Doctor CarePlan
  const carePlanMutation = useMutation({
    mutationFn: async (updatedPlan: Partial<CarePlan>) => {
      if (!activeCarePlan?._id && !activeCarePlan?.id) return null;
      const planId = (activeCarePlan._id || activeCarePlan.id)!;
      return await updateCarePlan(planId, updatedPlan);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["carePlans", userId] });
      toast.success(t("Doctor care plan progress saved"));
    },
    onError: () => {
      toast.error(t("Could not save to doctor care plan. Kept locally."));
    },
  });

  // Today's Habits state
  const [habitsState, setHabitsState] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("liv_habits_state");
      return saved ? JSON.parse(saved) : { h0: true, h1: false, h2: true, h3: false };
    } catch {
      return { h0: true, h1: false, h2: true, h3: false };
    }
  });

  // Steps completion state across journeys
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("liv_completed_steps");
      return saved ? JSON.parse(saved) : { "hm:0": true, "inf:0": true, "dh:0": true };
    } catch {
      return { "hm:0": true, "inf:0": true, "dh:0": true };
    }
  });

  // Lifestyle Interactive Dot Trackers
  const [proteinMealsCount, setProteinMealsCount] = useState<number>(() => {
    try {
      return Number(localStorage.getItem("liv_protein_meals") || 2);
    } catch {
      return 2;
    }
  });

  const [walksCount, setWalksCount] = useState<number>(() => {
    try {
      return Number(localStorage.getItem("liv_walks_count") || 1);
    } catch {
      return 1;
    }
  });

  // Save changes and persist to backend if activeCarePlan exists
  const toggleHabit = (id: string) => {
    const next = { ...habitsState, [id]: !habitsState[id] };
    setHabitsState(next);
    try {
      localStorage.setItem("liv_habits_state", JSON.stringify(next));
    } catch {}

    if (activeCarePlan && (activeCarePlan._id || activeCarePlan.id)) {
      const updatedLife = (activeCarePlan.lifestyle_management || []).map((item, idx) => {
        if (`life_${idx}` === id) return { ...item, done: next[id] };
        return item;
      });
      carePlanMutation.mutate({ lifestyle_management: updatedLife });
    }
  };

  const toggleStepDone = (key: string) => {
    setCompletedSteps((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem("liv_completed_steps", JSON.stringify(next));
      } catch {}
      return next;
    });
    toast.success(t("Step progress updated"));
  };

  const handleToggleProteinMeals = (count: number) => {
    const newVal = proteinMealsCount === count ? count - 1 : count;
    setProteinMealsCount(newVal);
    try {
      localStorage.setItem("liv_protein_meals", String(newVal));
    } catch {}
  };

  const handleToggleWalks = (count: number) => {
    const newVal = walksCount === count ? count - 1 : count;
    setWalksCount(newVal);
    try {
      localStorage.setItem("liv_walks_count", String(newVal));
    } catch {}
  };

  const handleRequestPackage = (pkgId: string) => {
    setRequestedPackages((prev) => {
      const next = { ...prev, [pkgId]: true };
      try {
        localStorage.setItem("liv_requested_packages", JSON.stringify(next));
      } catch {}
      return next;
    });
    toast.success(t("Care package requested! The Aaha centre will contact you."));
  };

  // Build Today's Habits list from real doctor care plan if present, else verified clinical schedule
  const todaysHabitsList = useMemo(() => {
    if (activeCarePlan) {
      const items: Array<{ id: string; title: string; detail: string; source: "doctor" | "clinical" }> = [];
      if (activeCarePlan.medication && activeCarePlan.medication.length > 0) {
        activeCarePlan.medication.forEach((m, idx) => {
          items.push({
            id: `med_${idx}`,
            title: m.name,
            detail: `${m.dosage || ""} · ${m.frequency || "Daily"}${m.notes ? ` (${m.notes})` : ""}`.trim(),
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
            source: "doctor",
          });
        });
      }
      if (items.length > 0) return items;
    }

    return [
      {
        id: "h0",
        title: WEEK_SCHEDULE[currentDow].title,
        detail: WEEK_SCHEDULE[currentDow].detail,
        source: "clinical" as const,
      },
      {
        id: "h1",
        title: t("Protein-forward nutrition"),
        detail: t("Balanced daily protein intake · 1.2–1.4 g/kg target"),
        source: "clinical" as const,
      },
      {
        id: "h2",
        title: t("Hydration & movement recovery"),
        detail: t("Daily hydration and gentle mobility routine"),
        source: "clinical" as const,
      },
      {
        id: "h3",
        title: t("Sleep schedule consistency"),
        detail: t("Protected 7–8 hours restful sleep window"),
        source: "clinical" as const,
      },
    ];
  }, [activeCarePlan, currentDow, t]);

  const habitsDoneCount = todaysHabitsList.filter((h) => habitsState[h.id]).length;

  // Compute step status for a journey
  const getStepStatus = (journeyId: string, index: number, step: JourneyStep): "done" | "now" | "up" => {
    const key = `${journeyId}:${index}`;
    if (completedSteps[key]) return "done";
    if (step.open) return step.weeks[0] <= currentWeek ? "now" : "up";
    if (step.weeks[1] < currentWeek) return "done";
    return step.weeks[0] <= currentWeek ? "now" : "up";
  };

  const getJourneyProgress = (journey: ClinicalJourney) => {
    let done = 0;
    journey.steps.forEach((s, idx) => {
      if (getStepStatus(journey.id, idx, s) === "done") done++;
    });
    return { done, total: journey.steps.length, ratio: done / journey.steps.length };
  };

  // Preserved backend queries for Notifications
  const notifsQuery = useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
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

  // Reminders list
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
      upcoming.appointment_date === now.toISOString().split("T")[0] ||
      upcoming.scheduled_for === now.toISOString().split("T")[0];

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

  return (
    <Screen nav={true}>
      <LivScope theme="dark" className="min-h-screen">
        {/* Top Header */}
        <header className="px-5 pt-6 pb-2 sm:px-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <LivMark size={24} />
              <span className="liv-wm text-[12px] tracking-[0.3em]">Liv Plan</span>
            </div>

            <button
              type="button"
              onClick={() => navigate({ to: "/appointments" })}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[var(--liv-inv)] text-[var(--liv-inv-fg)] text-xs font-bold transition-transform active:scale-95"
            >
              <Icon name="calendar_month" className="text-[15px]" />
              <span>{t("Book Visit")}</span>
            </button>
          </div>

          <div>
            <LivLabel className="block">{t("Your 90-Day Programme")}</LivLabel>
            <LivHeading level={1} className="mt-0.5 text-2xl font-serif">
              {t("Day")} {dayNo} {t("of")} {planLength}
            </LivHeading>
            <LivSubtext className="mt-0.5 text-xs text-[var(--liv-muted)]">
              {t("Aaha Living Lab · Grounded in your longevity biomarkers")}
            </LivSubtext>
          </div>

          {/* Segmented Top Switcher: Plan (Liv) | Reminders | Timeline */}
          <div className="h-11 p-1 mt-4 rounded-2xl bg-[var(--liv-surf)] border border-[var(--liv-line)] grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("plan")}
              className={cn(
                "rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                activeTab === "plan"
                  ? "bg-[var(--liv-inv)] text-[var(--liv-inv-fg)] shadow-xs"
                  : "text-[var(--liv-muted)] hover:text-[var(--liv-text)]",
              )}
            >
              <Icon name="assignment" className="text-[15px]" />
              <span>{t("Plan")}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("reminders")}
              className={cn(
                "rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                activeTab === "reminders"
                  ? "bg-[var(--liv-inv)] text-[var(--liv-inv-fg)] shadow-xs"
                  : "text-[var(--liv-muted)] hover:text-[var(--liv-text)]",
              )}
            >
              <Icon name="notifications" className="text-[15px]" />
              <span>{t("Reminders")}</span>
              {unreadNotifs.length + reminders.length > 0 && (
                <span className="size-4 rounded-full bg-[var(--liv-inv-fg)] text-[var(--liv-inv)] text-[9px] font-extrabold grid place-items-center">
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
                  ? "bg-[var(--liv-inv)] text-[var(--liv-inv-fg)] shadow-xs"
                  : "text-[var(--liv-muted)] hover:text-[var(--liv-text)]",
              )}
            >
              <Icon name="timeline" className="text-[15px]" />
              <span>{t("Timeline")}</span>
            </button>
          </div>
        </header>

        {/* ─── TAB 1: THE FULL LIV PLAN EXPERIENCE ─── */}
        {activeTab === "plan" && (
          <div className="px-5 pb-28 sm:px-6 flex flex-col gap-5 pt-2">
            {/* 1. Hero Programme Progress & 3 Phases Bar (Prototype Match) */}
            <LivCard variant="default" className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-serif font-bold text-[var(--liv-text)]">
                  {t("Programme Progress")}
                </span>
                <span className="text-[11px] font-mono text-[var(--liv-muted)]">
                  {Math.round((dayNo / planLength) * 100)}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="liv-prog">
                <i style={{ width: `${(dayNo / planLength) * 100}%` }} />
              </div>

              {/* 3 Phases: Begin, Build, Prove it */}
              <div className="liv-phases">
                {["Begin", "Build", "Prove it"].map((phase, idx) => (
                  <span key={phase} className={cn(idx === currentPhaseIndex && "on")}>
                    {t(phase)}
                  </span>
                ))}
              </div>

              <div className="pt-2 border-t border-[var(--liv-line)] flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <Icon name="event_repeat" className="text-[16px] text-[var(--liv-text)] mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-[var(--liv-text)] uppercase text-[10px] tracking-wider block mb-0.5">
                      {t("Upcoming Clinical Milestone (Pending)")}
                    </span>
                    <p className="text-xs text-[var(--liv-muted)] leading-relaxed m-0">
                      {t("Scheduled Kiosk re-test on")}{" "}
                      <b className="text-[var(--liv-text)] font-semibold">
                        {formatDate(retestDate.toISOString())}
                      </b>{" "}
                      ({Math.max(0, 90 - dayNo)} {t("days remaining")}). {t("Biomarker re-testing confirms clinical improvement.")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/appointments" })}
                  className="shrink-0 text-[11px] font-mono font-bold text-[var(--liv-text)] underline"
                >
                  {t("Book Kiosk")} →
                </button>
              </div>
            </LivCard>

            {/* 2. Your Three Journeys Section */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <LivLabel>{t("Your Three Clinical Journeys")}</LivLabel>
                <span className="text-[11px] font-mono text-[var(--liv-muted)]">
                  {t("3 assigned")}
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {CLINICAL_JOURNEYS.map((j) => {
                  const prog = getJourneyProgress(j);
                  return (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => setSelectedJourney(j)}
                      className="liv-trow group"
                    >
                      {/* SVG Progress Ring */}
                      <LivProgressRing
                        size={52}
                        strokeWidth={4.5}
                        progress={prog.ratio}
                        onBg={true}
                      >
                        <span className="text-[11px] font-mono font-bold text-[var(--liv-text)]">
                          {prog.done}/{prog.total}
                        </span>
                      </LivProgressRing>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-[var(--liv-text)] truncate">
                          {j.name}
                        </h3>
                        <p className="text-xs text-[var(--liv-muted)] truncate mt-0.5">
                          {j.shortSummary}
                        </p>
                      </div>

                      <Icon
                        name="chevron_right"
                        className="text-[18px] text-[var(--liv-muted)] group-hover:translate-x-0.5 transition-transform"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Today's Habits Card (Prototype Match) */}
            <LivCard variant="default" className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--liv-line)]">
                <div>
                  <h3 className="text-sm font-bold text-[var(--liv-text)]">{t("Today's Habits")}</h3>
                  <LivSubtext className="text-[11px] text-[var(--liv-muted)] mt-0.5">
                    {WEEK_SCHEDULE[currentDow].day} · {WEEK_SCHEDULE[currentDow].title}
                  </LivSubtext>
                </div>
                <span className="text-xs font-mono font-semibold text-[var(--liv-text)]">
                  {habitsDoneCount} of {todaysHabitsList.length} {t("done")}
                </span>
              </div>

              {/* Progress bar */}
              <div className="liv-prog">
                <i style={{ width: `${(habitsDoneCount / todaysHabitsList.length) * 100}%` }} />
              </div>

              {/* Habit rows with interactive checkboxes */}
              <div className="divide-y divide-[var(--liv-line)]">
                {todaysHabitsList.map((h) => {
                  const isDone = Boolean(habitsState[h.id]);
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => toggleHabit(h.id)}
                      className="w-full flex items-center gap-3 py-3 text-left group"
                    >
                      <span
                        className={cn(
                          "size-5 rounded-md border flex items-center justify-center text-[12px] font-bold transition-all shrink-0",
                          isDone
                            ? "bg-[var(--liv-inv)] border-[var(--liv-inv)] text-[var(--liv-inv-fg)]"
                            : "border-[var(--liv-line2)] bg-transparent text-transparent",
                        )}
                      >
                        ✓
                      </span>
                      <div className="flex-1 min-w-0">
                        <span
                          className={cn(
                            "text-xs font-semibold block text-[var(--liv-text)] transition-all truncate",
                            isDone && "line-through opacity-70",
                          )}
                        >
                          {h.title}
                        </span>
                        <span className="text-[11px] text-[var(--liv-muted)] block truncate mt-0.5">
                          {h.detail}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </LivCard>

            {/* 4. Lifestyle Trackers (Interactive Dots from Prototype) */}
            <LivCard variant="default" className="p-4 flex flex-col gap-1">
              <LivLabel className="mb-1">{t("Daily Lifestyle Trackers")}</LivLabel>

              {/* Protein Meals Tracker */}
              <div className="liv-trk">
                <div>
                  <h4 className="text-xs font-bold text-[var(--liv-text)]">{t("Protein Meals")}</h4>
                  <p className="text-[11px] text-[var(--liv-muted)] m-0 mt-0.5">
                    {t("Tap each meal that included protein")}
                  </p>
                </div>
                <div className="liv-dots">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleToggleProteinMeals(num)}
                      className={cn(proteinMealsCount >= num && "on")}
                      aria-label={`${num} protein meals`}
                    />
                  ))}
                </div>
              </div>

              {/* Walks After Meals Tracker */}
              <div className="liv-trk">
                <div>
                  <h4 className="text-xs font-bold text-[var(--liv-text)]">{t("Post-Meal Walks")}</h4>
                  <p className="text-[11px] text-[var(--liv-muted)] m-0 mt-0.5">
                    {t("10 minutes of gentle walking")}
                  </p>
                </div>
                <div className="liv-dots">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleToggleWalks(num)}
                      className={cn(walksCount >= num && "on")}
                      aria-label={`${num} post meal walks`}
                    />
                  ))}
                </div>
              </div>

              {/* Sleep 14-day average */}
              <div className="liv-trk">
                <div>
                  <h4 className="text-xs font-bold text-[var(--liv-text)]">{t("Sleep")}</h4>
                  <p className="text-[11px] text-[var(--liv-muted)] m-0 mt-0.5">
                    {t("14-day average · target 7 h or more")}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-serif font-bold text-base text-[var(--liv-text)]">
                    6 h 10 m
                  </span>
                </div>
              </div>

              {/* HRV 14-day average */}
              <div className="liv-trk">
                <div>
                  <h4 className="text-xs font-bold text-[var(--liv-text)]">{t("HRV (Heart Rate Variability)")}</h4>
                  <p className="text-[11px] text-[var(--liv-muted)] m-0 mt-0.5">
                    {t("14-day average · optimal above 45")}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-serif font-bold text-base text-[var(--liv-text)]">
                    38{" "}
                    <span className="text-[11px] font-mono text-[var(--liv-muted)]">ms</span>
                  </span>
                </div>
              </div>
            </LivCard>

            {/* 5. This Week Schedule Strip */}
            <LivCard variant="default" className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <LivLabel>{t("This Week")}</LivLabel>
                <span className="text-[11px] font-mono text-[var(--liv-muted)]">
                  {t("Weeks 3 to 8 rhythm")}
                </span>
              </div>

              {/* 7-day grid */}
              <div className="liv-week">
                {WEEK_SCHEDULE.map((item, idx) => (
                  <div key={item.day} className={cn(idx === currentDow && "on")}>
                    {item.day}
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[var(--liv-line)]">
                <h4 className="text-xs font-bold text-[var(--liv-text)]">
                  {WEEK_SCHEDULE[currentDow].title}
                </h4>
                <p className="text-[11px] text-[var(--liv-muted)] mt-0.5 leading-relaxed m-0">
                  {WEEK_SCHEDULE[currentDow].detail}
                </p>
              </div>
            </LivCard>

            {/* 6. Care Packages Section */}
            <div className="flex flex-col gap-2">
              <LivLabel className="px-1">{t("Care Packages for Your Journeys")}</LivLabel>
              <div className="flex flex-col gap-2.5">
                {Object.values(CARE_PACKAGES).map((pkg) => {
                  const isRequested = requestedPackages[pkg.id];
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setInspectedPackage(pkg)}
                      className="liv-trow group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-[var(--liv-text)] truncate">
                            {pkg.name}
                          </h4>
                          {isRequested && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              {t("Requested")}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--liv-muted)] truncate mt-0.5">
                          {pkg.focus} · {pkg.duration}
                        </p>
                      </div>
                      <Icon
                        name="chevron_right"
                        className="text-[16px] text-[var(--liv-muted)] group-hover:translate-x-0.5 transition-transform"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 7. Clinical Transparency & Medical Safety Note */}
            <div className="rounded-2xl border border-[var(--liv-line)] bg-[var(--liv-surf)] p-4 text-center mt-2">
              <div className="flex items-center justify-center gap-1.5 text-[var(--liv-text)] font-semibold text-xs mb-1">
                <Icon name="verified_user" className="text-[16px]" />
                <span>{t("Clinical Transparency & Care Boundary")}</span>
              </div>
              <p className="text-[11px] text-[var(--liv-muted)] leading-relaxed m-0">
                {t("Aaha habits and trackers support daily lifestyle routine consistency. Completing tasks in the app does not alter medical diagnoses or replace doctor care. Real health improvement is verified through physician consultations and scheduled Day-90 biomarker re-testing at the Aaha Health Centre.")}
              </p>
            </div>
          </div>
        )}

        {/* ─── TAB 2: REMINDERS & NOTIFICATIONS ─── */}
        {activeTab === "reminders" && (
          <div className="px-5 pb-24 sm:px-6 flex flex-col gap-4 pt-2">
            {unreadNotifs.length > 0 && (
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--liv-muted)]">
                  {t("Active Alerts")} ({unreadNotifs.length})
                </span>
                <button
                  type="button"
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                  className="text-xs font-bold text-[var(--liv-text)] hover:underline transition-colors"
                >
                  {t("Mark all as read")}
                </button>
              </div>
            )}

            {reminders.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--liv-muted)] px-1">
                  {t("Care Reminders")}
                </span>
                {reminders.map((rem) => (
                  <LivCard key={rem.id} variant="default" className="p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Icon name={rem.icon} className="text-[18px] text-[var(--liv-text)]" />
                      <span className="text-xs font-bold text-[var(--liv-text)]">{rem.title}</span>
                    </div>
                    <p className="text-xs text-[var(--liv-muted)] leading-relaxed m-0">{rem.desc}</p>
                    <div className="pt-1 flex justify-end">
                      <Link
                        to={rem.to}
                        className="text-xs font-mono font-bold text-[var(--liv-text)] underline"
                      >
                        {rem.actionLabel} →
                      </Link>
                    </div>
                  </LivCard>
                ))}
              </div>
            )}

            {notifications.length > 0 && (
              <div className="flex flex-col gap-2.5 mt-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--liv-muted)] px-1">
                  {t("Notifications Log")}
                </span>
                <div className="divide-y divide-[var(--liv-line)] rounded-2xl border border-[var(--liv-line)] bg-[var(--liv-surf)]">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-3.5 flex items-start gap-3 text-xs">
                      <span className="size-2 rounded-full bg-[var(--liv-text)] mt-1.5 shrink-0 opacity-60" />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-[var(--liv-text)] block">{n.title}</span>
                        <p className="text-[11px] text-[var(--liv-muted)] mt-0.5 leading-relaxed m-0">
                          {n.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: CARE TIMELINE ─── */}
        {activeTab === "timeline" && (
          <div className="px-5 pb-24 sm:px-6 flex flex-col gap-4 pt-2">
            <LivCard variant="default" className="p-4 flex flex-col gap-3">
              <LivLabel>{t("Longitudinal Care Journey")}</LivLabel>
              <h3 className="text-base font-serif font-bold text-[var(--liv-text)]">
                {t("Your Clinical Milestone Timeline")}
              </h3>
              <p className="text-xs text-[var(--liv-muted)] leading-relaxed m-0">
                {t(
                  "Every milestone is grounded in your verified kiosk screening readings and clinical doctor reviews.",
                )}
              </p>

              <div className="space-y-4 pt-2 border-t border-[var(--liv-line)]">
                {[
                  {
                    step: "1",
                    title: "Guided Health Check-up",
                    desc: "Full vital screening with AWIS wellness score calculation.",
                    status: latestAssessment ? "Completed" : "Next Step",
                    to: "/checkup",
                  },
                  {
                    step: "2",
                    title: "Diagnostic Lab Upload",
                    desc: "Blood chemistry and hormone panels analyzed and explained.",
                    status: reports.length > 0 ? "Completed" : "Upcoming",
                    to: "/upload",
                  },
                  {
                    step: "3",
                    title: "Doctor Consultation",
                    desc: "Review with Dr. Meera Joshi to calibrate your 90-day targets.",
                    status: appointments.length > 0 ? "Active" : "Upcoming",
                    to: "/appointments",
                  },
                  {
                    step: "4",
                    title: "Day-90 Milestone Re-Test",
                    desc: "Comprehensive biomarker and body composition re-measurement at the Living Lab kiosk.",
                    status: "Upcoming",
                    to: "/appointments",
                  },
                ].map((s) => (
                  <div key={s.step} className="flex items-start gap-3 text-xs">
                    <span className="size-6 rounded-full border border-[var(--liv-line2)] bg-[var(--liv-surf2)] font-mono text-[11px] grid place-items-center shrink-0">
                      {s.step}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[var(--liv-text)]">{s.title}</span>
                        <span className="text-[10px] font-mono text-[var(--liv-muted)] uppercase">
                          {s.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--liv-muted)] mt-0.5 leading-relaxed m-0">
                        {s.desc}
                      </p>
                      <div className="pt-1">
                        <Link to={s.to} className="text-[11px] font-mono font-bold text-[var(--liv-text)] underline">
                          {t("Open")} →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </LivCard>
          </div>
        )}

        {/* ─── MODAL 1: FULL JOURNEY / TRACK VIEWER (vTrack from Prototype) ─── */}
        {selectedJourney && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs">
            <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-[32px] sm:rounded-3xl bg-[var(--liv-bg)] border border-[var(--liv-line)] p-6 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom duration-200">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--liv-muted)]">
                    {t("JOURNEY")} · {getJourneyProgress(selectedJourney).done} {t("of")}{" "}
                    {getJourneyProgress(selectedJourney).total} {t("STEPS DONE")}
                  </span>
                  <h2 className="text-xl font-serif font-bold text-[var(--liv-text)] mt-1">
                    {selectedJourney.name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedJourney(null)}
                  className="size-8 rounded-full border border-[var(--liv-line2)] grid place-items-center text-[var(--liv-muted)] hover:text-[var(--liv-text)] transition-colors"
                >
                  <Icon name="close" className="text-[16px]" />
                </button>
              </div>

              {/* Finding Summary */}
              <p className="text-xs text-[var(--liv-muted)] leading-relaxed m-0 font-sans">
                {selectedJourney.clinicalFinding}
              </p>

              {/* Progress bar */}
              <div className="liv-prog">
                <i
                  style={{
                    width: `${getJourneyProgress(selectedJourney).ratio * 100}%`,
                  }}
                />
              </div>

              {/* What your report shows (Clickable Biomarker Chips from Prototype) */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--liv-line)]">
                <LivLabel>{t("What Your Report Shows")}</LivLabel>
                <div className="liv-mk">
                  {selectedJourney.markers.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        toast.info(`${m.name}: ${m.value} (${m.status === "p" ? "Priority" : m.status === "b" ? "Borderline" : "Optimal"})`);
                      }}
                    >
                      <span>{m.name}</span>
                      <b>{m.value}</b>
                      <i>{m.status === "p" ? "▲" : m.status === "b" ? "◆" : "●"}</i>
                    </button>
                  ))}
                </div>
              </div>

              {/* Daily Guidelines (.liv-gl from Prototype) */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--liv-line)]">
                <LivLabel>{t("Daily Guidelines")}</LivLabel>
                <div className="rounded-2xl border border-[var(--liv-line)] bg-[var(--liv-surf)] p-3 divide-y divide-[var(--liv-line)]">
                  {selectedJourney.dailyGuidelines.map((g, idx) => (
                    <div key={idx} className="liv-gl">
                      <b>{idx + 1}</b>
                      <span className="text-xs text-[var(--liv-text)] leading-relaxed">{g}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline Steps (.liv-tl & .liv-ts from Prototype) */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--liv-line)]">
                <LivLabel>{t("Your Journey to Day 90")}</LivLabel>
                <div className="rounded-2xl border border-[var(--liv-line)] bg-[var(--liv-surf)] p-4">
                  <div className="liv-tl">
                    {selectedJourney.steps.map((st, idx) => {
                      const status = getStepStatus(selectedJourney.id, idx, st);
                      const key = `${selectedJourney.id}:${idx}`;
                      return (
                        <div key={idx} className={cn("liv-ts", status)}>
                          <span className="liv-nd">
                            {status === "done" && <Icon name="check" className="text-[14px]" />}
                          </span>

                          <div className="liv-bd">
                            <div className="meta">
                              <span className="liv-tagx">{st.when}</span>
                              <span className="liv-tagx">{st.tag}</span>
                            </div>

                            <h4 className="text-xs font-bold text-[var(--liv-text)] mt-0.5">
                              {st.title}
                            </h4>
                            <p className="text-[11px] text-[var(--liv-muted)] leading-relaxed m-0">
                              {st.desc}
                            </p>

                            {/* Action buttons if step is current (status === 'now') */}
                            {status === "now" && (
                              <div className="liv-acts">
                                {st.cta && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedJourney(null);
                                      navigate({ to: "/appointments" });
                                    }}
                                    className="h-8 px-3 rounded-full bg-[var(--liv-inv)] text-[var(--liv-inv-fg)] text-[11px] font-bold"
                                  >
                                    {st.cta[0]}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => toggleStepDone(key)}
                                  className="h-8 px-3 rounded-full border border-[var(--liv-line2)] text-[var(--liv-text)] text-[11px] font-semibold hover:border-[var(--liv-text)]"
                                >
                                  {completedSteps[key] ? t("Completed ✓") : t("Mark done")}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Target on Day 90 */}
              <div className="p-3.5 rounded-2xl bg-[var(--liv-surf)] border border-[var(--liv-line)] flex flex-col gap-1">
                <LivLabel>{t("Target on Day 90")}</LivLabel>
                <span className="font-serif font-bold text-base text-[var(--liv-text)]">
                  {selectedJourney.day90Goal}
                </span>
              </div>

              {/* Care Package for this Journey Card */}
              {CARE_PACKAGES[selectedJourney.id] && (
                <button
                  type="button"
                  onClick={() => setInspectedPackage(CARE_PACKAGES[selectedJourney.id])}
                  className="liv-trow text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <LivLabel className="block text-[10px]">
                      {t("Care Package for this Journey")}
                    </LivLabel>
                    <h4 className="text-xs font-bold text-[var(--liv-text)] mt-0.5 truncate">
                      {CARE_PACKAGES[selectedJourney.id].name}
                    </h4>
                    <p className="text-[11px] text-[var(--liv-muted)] truncate mt-0.5">
                      {CARE_PACKAGES[selectedJourney.id].inclusions.length} {t("inclusions")} ·{" "}
                      {CARE_PACKAGES[selectedJourney.id].duration}
                    </p>
                  </div>
                  <Icon
                    name="chevron_right"
                    className="text-[16px] text-[var(--liv-muted)] group-hover:translate-x-0.5 transition-transform"
                  />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── MODAL 2: CARE PACKAGE INCLUSIONS SHEET (SH.pkg from Prototype) ─── */}
        {inspectedPackage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <div className="w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-3xl bg-[var(--liv-bg)] border border-[var(--liv-line)] p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--liv-muted)]">
                    {t("CARE PACKAGE")} · {inspectedPackage.duration}
                  </span>
                  <h3 className="text-lg font-serif font-bold text-[var(--liv-text)] mt-1">
                    {inspectedPackage.name}
                  </h3>
                  <p className="text-xs text-[var(--liv-muted)] mt-0.5">
                    {inspectedPackage.focus}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedPackage(null)}
                  className="size-7 rounded-full border border-[var(--liv-line2)] grid place-items-center text-[var(--liv-muted)] hover:text-[var(--liv-text)]"
                >
                  <Icon name="close" className="text-[15px]" />
                </button>
              </div>

              {/* Inclusions List */}
              <div className="rounded-2xl border border-[var(--liv-line)] bg-[var(--liv-surf)] p-3.5 divide-y divide-[var(--liv-line)]">
                {inspectedPackage.inclusions.map((inc, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 py-2 text-xs">
                    <span className="size-4 rounded-full bg-[var(--liv-inv)] text-[var(--liv-inv-fg)] font-bold text-[9px] grid place-items-center shrink-0">
                      ✓
                    </span>
                    <span className="text-[var(--liv-text)]">{inc}</span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-[var(--liv-muted)] leading-relaxed m-0">
                {t(
                  "Every therapy is physician-screened first, and drips are given only against your labs. The centre shares the price when you request.",
                )}
              </p>

              <LivButton
                onClick={() => handleRequestPackage(inspectedPackage.id)}
                disabled={Boolean(requestedPackages[inspectedPackage.id])}
                className="w-full"
              >
                {requestedPackages[inspectedPackage.id]
                  ? t("Requested · The Centre Will Call You")
                  : t("Request This Package")}
              </LivButton>
            </div>
          </div>
        )}
      </LivScope>
    </Screen>
  );
}

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  GoogleAuthProvider,
  type ConfirmationResult,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiService } from "@/lib/api-service";
import {
  listAppointments,
  bookAppointment,
  cancelAppointment,
  updatePreferences,
} from "@/lib/aaha-api";
import { useOverview } from "@/hooks/use-overview";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { saveUserProfile, getUserProfile, type UserProfile } from "@/lib/user-profile";
import {
  LivMark,
  LivIcon,
  LivProgressRing,
  LivScope,
  LivCard,
  LivHeading,
  LivLabel,
  LivSubtext,
  LivButton,
  LivSegmented,
} from "@/components/liv";
import {
  BIOMARKERS,
  GROUPS,
  YEARS_CONTRIBUTORS,
  SYSTEM_SCORES,
  PRIORITIES,
  JOURNEY_TRACKS,
  CARE_PACKAGES,
  TREATMENTS,
  TAPE_MEASUREMENTS,
  THERAPIES,
  BADGE_DEFINITIONS,
  REPORT_CHAPTERS,
  CHAPTER_SYSTEM_MAP,
  PLAIN_EXPLANATIONS,
  WEEK_RHYTHM,
  DEFAULT_HABITS,
  VISIT_TYPES,
  TIME_SLOTS,
  getEcgPath,
  getEegSvgPath,
  getMarkerById,
  getTrackById,
  getTreatmentById,
  getTrackForMarker,
  type Biomarker,
  type JourneyTrack,
  type TreatmentService,
} from "@/lib/liv-data";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier | null;
  }
}

export const Route = createFileRoute("/liv")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    view?:
      | "splash"
      | "story"
      | "signup"
      | "signin"
      | "welcome"
      | "main"
      | "marker"
      | "track"
      | "report"
      | "book"
      | "booked";
    tab?: "home" | "markers" | "plan" | "care";
    marker?: string;
    track?: string;
    filter?: string;
  } => {
    return {
      view: typeof search.view === "string" ? (search.view as any) : undefined,
      tab: typeof search.tab === "string" ? (search.tab as any) : undefined,
      marker: typeof search.marker === "string" ? search.marker : undefined,
      track: typeof search.track === "string" ? search.track : undefined,
      filter: typeof search.filter === "string" ? search.filter : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Liv Living Lab — Longevity, measured | Aaha Companion" },
      {
        name: "description",
        content:
          "Longevity, measured. Complete Liv app experience: AIWS score, 52 biomarkers, 90-day plan, care journeys, and clinical reports.",
      },
    ],
  }),
  component: LivAppScreen,
});

// ─── 4-Part Story Data ────────────────────────────────────────────────────────
const STORIES = [
  {
    title: "It starts at the Living Lab kiosk.",
    description:
      "One screening reads your blood, heart and body. Your longevity report arrives here by itself.",
    visual: "pulse",
  },
  {
    title: "Normal is not the same as optimal.",
    description:
      "Clinical ranges show where illness begins. Optimal ranges show where healthspan is built.",
    visual: "range",
  },
  {
    title: "One number to follow: your AIWS score.",
    description:
      "Blood, body, sleep and lifestyle in a single score out of 100. Your well-being benchmark.",
    visual: "ring",
  },
  {
    title: "Measure. Act. Re-measure.",
    description:
      "A 90-day plan, a care team and Liv by your side until your next kiosk visit.",
    visual: "path",
  },
];

interface AppointmentItem {
  id: number;
  backendId?: string;
  t: string;
  w: string;
  d: Date;
  h: string;
  fixed?: boolean;
  status?: "pending" | "ok";
  past?: boolean;
  svc?: string;
}

export function LivAppScreen() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { session, user, patient, loading: authLoading } = useAuth();
  const { latestAssessment, assessments } = useOverview();
  const { t } = useI18n();

  // Route & Navigation state
  const [currentView, setCurrentView] = useState<
    | "splash"
    | "story"
    | "signup"
    | "signin"
    | "welcome"
    | "main"
    | "marker"
    | "track"
    | "report"
    | "book"
    | "booked"
  >(() => {
    if (search.view) return search.view;
    if (session) return "main";
    return "splash";
  });

  const [activeTab, setActiveTab] = useState<"home" | "markers" | "plan" | "care">(
    search.tab || "home",
  );
  const [selectedMarkerId, setSelectedMarkerId] = useState<string>(search.marker || "hba1c");
  const [selectedTrackId, setSelectedTrackId] = useState<string>(search.track || "hm");
  const [markerFilter, setMarkerFilter] = useState<string>(search.filter || "all");
  const [activeSheet, setActiveSheet] = useState<string | null>(null);

  // Patient / User Details
  const existingProfile = getUserProfile();
  const [fullName, setFullName] = useState(
    patient?.full_name || existingProfile?.firstName
      ? `${existingProfile?.firstName || ""} ${existingProfile?.lastName || ""}`.trim()
      : "Kaveri Bhosle",
  );
  const [phoneNumber, setPhoneNumber] = useState(
    patient?.mobile_number?.replace("+91", "") || existingProfile?.phoneNumber?.replace("+91", "") || "9876543210",
  );
  const [email, setEmail] = useState("kaveri@example.com");
  const [age, setAge] = useState(patient?.age ? String(patient.age) : "42");
  const [sex, setSex] = useState<"Female" | "Male" | "Other">(
    patient?.gender?.toLowerCase() === "male"
      ? "Male"
      : patient?.gender?.toLowerCase() === "other"
        ? "Other"
        : "Female",
  );
  const [consentGiven, setConsentGiven] = useState(true);

  // Sync patient profile when authenticated
  useEffect(() => {
    if (patient?.full_name) {
      setFullName(patient.full_name);
    }
    if (patient?.mobile_number) {
      setPhoneNumber(patient.mobile_number.replace("+91", ""));
    }
    if (patient?.age) {
      setAge(String(patient.age));
    }
    if (patient?.gender) {
      setSex(
        patient.gender.toLowerCase() === "male"
          ? "Male"
          : patient.gender.toLowerCase() === "other"
            ? "Other"
            : "Female",
      );
    }
  }, [patient]);

  // Auth State
  const [authMode, setAuthMode] = useState<"otp" | "google">("otp");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [otpErrorShake, setOtpErrorShake] = useState(false);

  // App Core State
  const [hasReport, setHasReport] = useState(true);
  const [kioskFound, setKioskFound] = useState(true);
  const [appTheme, setAppTheme] = useState<"dark" | "light">("dark");
  const [planDays, setPlanDays] = useState(90);
  const [streak, setStreak] = useState(6);
  const [userPoints, setUserPoints] = useState(340);
  const [sharedWithDoctor, setSharedWithDoctor] = useState(true);
  const [userConsents, setUserConsents] = useState<Record<string, boolean>>({
    capture: true,
    share: true,
    remind: true,
  });

  // Daily Habits & Actions
  const [habitsDone, setHabitsDone] = useState<Record<string, boolean>>({
    main: true,
    sup: true,
  });
  const [addedMarkerActions, setAddedMarkerActions] = useState<Record<string, boolean>>({});
  const [weeklyProgress, setWeeklyProgress] = useState<Record<string, number>>({
    str: 2,
    walk: 4,
    sup: 5,
    br: 3,
  });
  const [completedSteps, setCompletedSteps] = useState<Record<string, any>>({});
  const [requestedPackages, setRequestedPackages] = useState<Record<string, boolean>>({});
  const [earnedBadges, setEarnedBadges] = useState<Record<string, boolean>>({
    first: true,
    streak7: true,
    vitd: true,
    sensor: true,
  });

  // Floating Popups (+10 pts)
  const [popups, setPopups] = useState<Array<{ id: number; text: string; x: number; y: number }>>([]);

  // Appointments
  const now = useMemo(() => new Date(), []);
  const retestDate = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 68);
    return d;
  }, [now]);

  const [appointments, setAppointments] = useState<AppointmentItem[]>([
    {
      id: 1,
      t: "Coach check-in",
      w: "Ritu S. · video call",
      d: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3),
      h: "6:30 PM",
      status: "ok",
    },
    {
      id: 2,
      t: "Day-90 re-measure",
      w: "Living Lab kiosk · Dr. A. Deshmukh",
      d: retestDate,
      h: "9:00 AM",
      fixed: true,
      status: "ok",
    },
    {
      id: 3,
      t: "HydraFacial",
      w: "The Edit · session 1 of 3 · logged by Trupti",
      d: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 8),
      h: "4:00 PM",
      past: true,
      svc: "hf",
    },
  ]);

  // Sync real appointments from feature backend when authenticated
  useEffect(() => {
    if (!session) return;
    let isMounted = true;
    listAppointments()
      .then((realList) => {
        if (!isMounted || !realList || realList.length === 0) return;
        const mapped: AppointmentItem[] = realList.map((a, i) => ({
          id: a.appointment_id || a.id ? Number(String(a.appointment_id || a.id).replace(/\D/g, "").slice(-6)) || (Date.now() + i) : Date.now() + i,
          backendId: a.appointment_id || a.id,
          t: a.doctor_name || a.speciality || "Consultation",
          w: a.centre || "Aaroogya AI Centre · Aundh, Pune",
          d: new Date(a.scheduled_for || a.appointment_date || Date.now()),
          h: a.slot_label || a.appointment_time || "10:00 AM",
          status: a.status === "pending" ? "pending" : "ok",
        }));
        setAppointments((prev) => {
          const fixed = prev.filter((p) => p.fixed);
          return [...mapped, ...fixed];
        });
      })
      .catch((e) => {
        console.warn("Could not load backend appointments:", e);
      });
    return () => {
      isMounted = false;
    };
  }, [session]);

  // Booking Flow State
  const [bookingForm, setBookingForm] = useState<{
    type: string | null;
    svc?: string;
    pack?: number;
    day: number | null;
    slot: string | null;
    stepKey?: string;
  }>({
    type: null,
    day: null,
    slot: null,
  });

  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, boolean>>({});
  const [treatmentCategory, setTreatmentCategory] = useState<"skin" | "hair" | "iv">("skin");

  // Story video state
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyPaused, setStoryPaused] = useState(false);

  // Liv AI Chat state
  const [chatMessages, setChatMessages] = useState<
    Array<{
      sender: "liv" | "me";
      text?: string;
      html?: string;
      cta?: [string, string][];
      isClinicalInsight?: boolean;
      isLiveAi?: boolean;
      isError?: boolean;
    }>
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const rptRef = useRef<HTMLDivElement>(null);

  // Sync state if user changes route parameters
  useEffect(() => {
    if (search.view) setCurrentView(search.view);
    if (search.tab) setActiveTab(search.tab);
    if (search.marker) setSelectedMarkerId(search.marker);
    if (search.track) setSelectedTrackId(search.track);
    if (search.filter) setMarkerFilter(search.filter);
  }, [search]);

  // Auto-advance story video if not paused
  useEffect(() => {
    if (currentView !== "story" || storyPaused) return;
    const timer = setTimeout(() => {
      setStoryIndex((prev) => (prev + 1) % STORIES.length);
    }, 5200);
    return () => clearTimeout(timer);
  }, [currentView, storyIndex, storyPaused]);

  // Countdown for OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Award points with animated popup
  const awardPoints = (amount: number, label?: string, event?: React.MouseEvent) => {
    setUserPoints((p) => p + amount);
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      const newPop = {
        id: Date.now(),
        text: `+${amount}`,
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      };
      setPopups((prev) => [...prev, newPop]);
      setTimeout(() => {
        setPopups((prev) => prev.filter((p) => p.id !== newPop.id));
      }, 1200);
    }
    if (label) toast.success(`+${amount} pts · ${label}`);
  };

  // ─── Firebase Auth Logic ───────────────────────────────────────────────────
  const getRecaptchaVerifier = () => {
    if (typeof window === "undefined") return null;
    if (window.recaptchaVerifier) return window.recaptchaVerifier;
    try {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {},
        "expired-callback": () => {
          window.recaptchaVerifier?.clear();
          window.recaptchaVerifier = null;
        },
      });
      return window.recaptchaVerifier;
    } catch (e) {
      console.warn("reCAPTCHA setup warning:", e);
      return null;
    }
  };

  const handleSendOtp = async (isSignup: boolean) => {
    if (busy) return;
    const cleanPh = phoneNumber.replace(/\D/g, "");
    if (cleanPh.length !== 10) {
      toast.error(t("Please enter a valid 10-digit mobile number"));
      return;
    }
    setBusy(true);
    try {
      const verifier = getRecaptchaVerifier();
      if (!verifier) throw new Error("reCAPTCHA could not be initialized");
      const confirmation = await signInWithPhoneNumber(auth, "+91" + cleanPh, verifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      setCountdown(30);
      toast.success(t("Code sent"), {
        description: `We sent a code to +91 ${cleanPh}`,
      });
    } catch (err) {
      console.error(err);
      toast.error(t("Could not send code. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (isSignup: boolean) => {
    if (busy) return;
    if (otpCode.length < 4) {
      setOtpErrorShake(true);
      setTimeout(() => setOtpErrorShake(false), 500);
      toast.error(t("Enter your verification code"));
      return;
    }
    setBusy(true);
    try {
      if (confirmationResult) {
        const res = await confirmationResult.confirm(otpCode);
        const token = await res.user.getIdToken();
        apiService.setToken(token);
      }
      if (isSignup) {
        const parts = fullName.trim().split(/\s+/);
        saveUserProfile({
          uid: auth.currentUser?.uid || "liv_member",
          phoneNumber: "+91" + phoneNumber.replace(/\D/g, ""),
          firstName: parts[0] || "Member",
          lastName: parts.slice(1).join(" ") || "",
          age: parseInt(age, 10) || 42,
          gender: sex.toLowerCase() as any,
          createdAt: new Date().toISOString(),
        });
        setCurrentView("welcome");
      } else {
        setCurrentView("main");
        setActiveTab("home");
      }
      toast.success(isSignup ? t("Account created") : t("Welcome back"));
    } catch (e) {
      setOtpErrorShake(true);
      setTimeout(() => setOtpErrorShake(false), 500);
      toast.error(t("Invalid code"));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const token = await res.user.getIdToken();
      apiService.setToken(token);
      toast.success(t("Signed in with Google"));
      setCurrentView("main");
      setActiveTab("home");
    } catch (e: any) {
      toast.error(e?.message || t("Google Sign In failed"));
    } finally {
      setBusy(false);
    }
  };

  // ─── Booking Confirmation ──────────────────────────────────────────────────
  const confirmBooking = async () => {
    if (!bookingForm.slot || bookingForm.day === null) return;
    const selectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + bookingForm.day + 1);
    let title = "Visit";
    let where = "Aaroogya AI Centre · Aundh, Pune";
    let isPending = false;

    if (bookingForm.type === "svc" && bookingForm.svc) {
      const s = getTreatmentById(bookingForm.svc);
      if (s) {
        title = s.n;
        where = `${bookingForm.pack && bookingForm.pack > 1 ? `Pack of ${bookingForm.pack} · ` : ""}Session · ${s.d.split(" · ")[1] || "Centre"}`;
        isPending = s.sign || Object.values(screeningAnswers).some(Boolean);
      }
    } else if (bookingForm.type && VISIT_TYPES[bookingForm.type]) {
      const v = VISIT_TYPES[bookingForm.type];
      title = v[0];
      where = v[1];
    }

    let realId: string | undefined = undefined;
    if (session) {
      try {
        const booked = await bookAppointment({
          appointmentDate: selectedDate.toISOString().split("T")[0],
          appointmentTime: bookingForm.slot || "10:00 AM",
          appointmentType: bookingForm.type === "svc" ? "Therapy" : "Consultation",
          bookingType: bookingForm.type === "svc" ? "treatment" : "doctor",
          doctorName: title,
          centre: "Aaroogya AI Centre · Aundh, Pune",
          notes: bookingForm.svc
            ? `Treatment: ${title} (${isPending ? "Pending doctor approval" : "Self-booked"})`
            : "Booked via Liv App",
        });
        realId = booked.appointment_id || booked.id;
        toast.success("Appointment registered in Aaha system");
      } catch (err: any) {
        console.warn("Real booking fallback:", err);
      }
    }

    const newAppt: AppointmentItem = {
      id: Date.now(),
      backendId: realId,
      t: title,
      w: where,
      d: selectedDate,
      h: bookingForm.slot,
      status: isPending ? "pending" : "ok",
      svc: bookingForm.svc,
    };

    setAppointments((prev) => [...prev, newAppt]);
    if (bookingForm.stepKey) {
      setCompletedSteps((prev) => ({
        ...prev,
        [bookingForm.stepKey!]: { b: `${selectedDate.toLocaleDateString()} at ${bookingForm.slot}` },
      }));
    }
    setCurrentView("booked");
    if (isPending) {
      setTimeout(() => {
        setAppointments((prev) =>
          prev.map((a) => (a.id === newAppt.id ? { ...a, status: "ok" } : a)),
        );
        toast.success(`Dr. Deshmukh approved your ${newAppt.t}. See you then.`);
      }, 6000);
    }
  };

  // ─── Liv AI Chat Handler ───────────────────────────────────────────────────
  const sendLivChatMessage = async (userQuery: string) => {
    if (!userQuery.trim()) return;
    setChatMessages((prev) => [...prev, { sender: "me", text: userQuery }]);
    setChatInput("");
    setIsAiTyping(true);

    const lower = userQuery.toLowerCase().trim();

    // 1. Clinical insights matching reference report guidance (instant, verified)
    if (lower.includes("plan") || lower.includes("care plan")) {
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: "liv",
            isClinicalInsight: true,
            html: `<b>Here is your plan, in one breath.</b><br>Dr. Deshmukh set you a ${planDays}-day programme called Metabolic Reset. You are on Day 22, Level 2 (Build).<br><br><b>This week</b><br>· Strength session: ${weeklyProgress.str || 0} of 3 done<br>· Walk after dinner: ${weeklyProgress.walk || 0} of 7<br>· Vitamin D and iron: ${weeklyProgress.sup || 0} of 7<br>· Coherence breathing: ${weeklyProgress.br || 0} of 5<br><br>You have ${userPoints} points, ${100 - (userPoints % 100)} from your next reward.`,
            cta: [
              ["Open the full plan", "tab:plan"],
              ["This week's steps", "tab:home"],
              ["Explain my report", "explain:0"],
            ],
          },
        ]);
        setIsAiTyping(false);
      }, 500);
      return;
    }

    if (lower.includes("today") || lower.includes("do today")) {
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: "liv",
            isClinicalInsight: true,
            text: "Three things: strength session (45 min), protein at every meal, and vitamin D & iron as prescribed. Tick them on Home and your streak keeps climbing.",
            cta: [["Go to Home", "tab:home"]],
          },
        ]);
        setIsAiTyping(false);
      }, 500);
      return;
    }

    if (lower.includes("next session") || lower.includes("appointment")) {
      setTimeout(() => {
        const next = appointments.find((a) => !a.past);
        setChatMessages((prev) => [
          ...prev,
          {
            sender: "liv",
            isClinicalInsight: true,
            text: next
              ? `${next.t} on ${next.d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} at ${next.h}. I will remind you the day before.`
              : "No visits currently booked. You can open Care to book your next session.",
            cta: [["Open Care", "tab:care"]],
          },
        ]);
        setIsAiTyping(false);
      }, 500);
      return;
    }

    if (lower.includes("age") || lower.includes("biological age")) {
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: "liv",
            isClinicalInsight: true,
            text: `Your biological age is 45.8 vs your calendar age of ${age}. It is estimated from nine blood biomarkers with a margin of about two years. Blood sugar, ApoB, muscle and two missing nutrients explain the gap. All four can move.`,
            cta: [["See Biological Age breakdown", "sheet:age"]],
          },
        ]);
        setIsAiTyping(false);
      }, 500);
      return;
    }

    if (lower.includes("hba1c") || lower.includes("sugar")) {
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: "liv",
            isClinicalInsight: true,
            text: "HbA1c 5.9% is in the early-warning band, not the diabetes band. Walk for 10 minutes after meals, eat dinner earlier, and protect a 7-hour night. Your Day-90 target is 5.7% or lower.",
            cta: [["Open HbA1c details", "marker:hba1c"]],
          },
        ]);
        setIsAiTyping(false);
      }, 500);
      return;
    }

    if (lower.includes("thyroid") || lower.includes("tsh")) {
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: "liv",
            isClinicalInsight: true,
            text: "Your thyroid is ideal! TSH is 2.4, squarely inside the optimal 0.5 to 3.5 zone. Vitamin D and iron are the two fixable gaps.",
            cta: [["Open TSH details", "marker:tsh"]],
          },
        ]);
        setIsAiTyping(false);
      }, 500);
      return;
    }

    // 2. Free-text questions -> Call real /api/chat service
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: userQuery }],
          language: "en",
          reportContext: `Patient: ${fullName}. Age: ${age}. Sex: ${sex}. AIWS score: 69/100. Biological age: 45.8 vs 42. Active biomarkers: HbA1c 5.9%, ApoB 102 mg/dL, Vitamin D 16 ng/mL, Ferritin 18 ng/mL, Grip strength 24 kg. Plan: 90-day Metabolic Reset, 3 strength sessions a week, post-meal walks.`,
        }),
      });

      if (!res.ok) {
        throw new Error(`AI service returned HTTP ${res.status}`);
      }

      const rawText = await res.text();
      let cleanText = "";
      if (rawText.includes('0:"')) {
        const matches = rawText.matchAll(/0:"([^"]+)"/g);
        for (const m of matches) {
          cleanText += m[1].replace(/\\n/g, "\n");
        }
      } else {
        cleanText = rawText;
      }

      if (!cleanText.trim()) {
        cleanText = "I have noted that. Feel free to ask about your specific biomarkers, 90-day targets, or upcoming sessions.";
      }

      setChatMessages((prev) => [
        ...prev,
        {
          sender: "liv",
          isLiveAi: true,
          text: cleanText,
        },
      ]);
    } catch (err: any) {
      console.warn("Live AI chat request error:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "liv",
          isError: true,
          text: "I couldn't reach the live AI companion service just now. Please check your network connection or tap any of the verified clinical insights below.",
          cta: [
            ["Show my care plan", "ask:plan"],
            ["Read Longevity Report", "view:report"],
          ],
        },
      ]);
    } finally {
      setIsAiTyping(false);
    }
  };

  // ─── Action Dispatcher ─────────────────────────────────────────────────────
  const handleAction = (actionStr: string, event?: React.MouseEvent) => {
    const [action, ...args] = actionStr.split(":");
    const val = args.join(":");

    switch (action) {
      case "tab":
        setActiveTab(val as any);
        setCurrentView("main");
        setActiveSheet(null);
        break;
      case "view":
        setCurrentView(val as any);
        setActiveSheet(null);
        break;
      case "marker":
        setSelectedMarkerId(val);
        setCurrentView("marker");
        break;
      case "track":
        setSelectedTrackId(val);
        setCurrentView("track");
        break;
      case "filter":
        setMarkerFilter(val);
        break;
      case "sheet":
        setActiveSheet(val);
        break;
      case "close":
        setActiveSheet(null);
        break;
      case "back":
        if (currentView === "marker" || currentView === "track" || currentView === "report" || currentView === "book" || currentView === "booked") {
          setCurrentView("main");
        } else {
          setCurrentView("main");
        }
        break;
      case "habit": {
        const id = val;
        const current = !!habitsDone[id];
        setHabitsDone((prev) => ({ ...prev, [id]: !current }));
        if (!current) {
          awardPoints(10, "Habit completed", event);
        }
        break;
      }
      case "add": {
        const key = val;
        const isAdded = !addedMarkerActions[key];
        setAddedMarkerActions((prev) => ({ ...prev, [key]: isAdded }));
        toast.success(isAdded ? t("Added to today's plan") : t("Removed from plan"));
        break;
      }
      case "wk": {
        const [metric, countStr] = val.split(":");
        const count = parseInt(countStr, 10);
        setWeeklyProgress((prev) => ({ ...prev, [metric]: count }));
        awardPoints(15, `${metric.toUpperCase()} logged`, event);
        break;
      }
      case "newbook":
        setBookingForm({ type: val || "doc", day: null, slot: null });
        setCurrentView("book");
        setActiveSheet(null);
        break;
      case "bookback":
        setCurrentView("main");
        break;
      case "btype":
        setBookingForm((prev) => ({ ...prev, type: val }));
        break;
      case "bday":
        setBookingForm((prev) => ({ ...prev, day: parseInt(val, 10) }));
        break;
      case "bslot":
        setBookingForm((prev) => ({ ...prev, slot: val }));
        break;
      case "confirm":
        confirmBooking();
        break;
      case "pkgreq":
        setRequestedPackages((prev) => ({ ...prev, [val]: true }));
        toast.success("Request sent. The centre will call you within a day.");
        setActiveSheet(null);
        break;
      case "explain": {
        const chapterIdx = parseInt(val, 10);
        const chapterTitle = REPORT_CHAPTERS[chapterIdx] || "Chapter";
        const explanation = PLAIN_EXPLANATIONS[CHAPTER_SYSTEM_MAP[chapterIdx - 6]?.[0]] ||
          `Here is the plain-English summary of "${chapterTitle}": This chapter breaks down your biological findings, optimal benchmarks, and immediate clinical priorities signed off by Dr. Deshmukh.`;
        setActiveSheet("liv");
        sendLivChatMessage(`Explain "${chapterTitle}" in plain words`);
        break;
      }
      case "askliv":
        setActiveSheet("liv");
        sendLivChatMessage(`Tell me about my ${val}`);
        break;
      case "say":
        toast.info(val);
        break;
      case "report":
        setCurrentView("report");
        setActiveSheet(null);
        break;
      case "consent2": {
        const nextVal = !userConsents[val];
        const nextConsents = { ...userConsents, [val]: nextVal };
        setUserConsents(nextConsents);
        if (session) {
          updatePreferences({
            data_sharing_consent: nextConsents.share,
            appointment_reminders: nextConsents.remind,
          }).catch((e: any) => console.warn("Preferences update warning:", e));
        }
        if (val === "share" && !nextVal) {
          setSharedWithDoctor(false);
          toast.info("Sharing with doctors is off. Reports stay private.");
        } else {
          toast.success("Preferences updated");
        }
        break;
      }
      case "cancel": {
        const apptId = val;
        const target = appointments.find((a) => String(a.id) === apptId);
        if (target) {
          setAppointments((prev) => prev.filter((a) => String(a.id) !== apptId));
          if (session && target.backendId) {
            cancelAppointment(target.backendId).catch((e: any) => console.warn("Backend cancel warning:", e));
          }
          setActiveSheet(null);
          toast.info("Visit cancelled", {
            action: {
              label: "Undo",
              onClick: () => setAppointments((prev) => [...prev, target]),
            },
          });
        }
        break;
      }
      case "signout":
        auth.signOut();
        setCurrentView("signin");
        toast.success("Signed out");
        break;
      default:
        console.log("Unhandled action:", actionStr);
    }
  };

  // Calculate current active milestone count
  const dayNumber = Math.min(planDays, 22);

  return (
    <LivScope theme={appTheme} className="h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-full flex flex-col items-center justify-start sm:justify-center p-0 overflow-hidden bg-[var(--liv-bg)]">
      <div id="recaptcha-container" />

      {/* Floating XP Animation Nodes */}
      {popups.map((p) => (
        <span
          key={p.id}
          className="pop"
          style={{ left: `${p.x}px`, top: `${p.y}px` }}
        >
          {p.text}
        </span>
      ))}

      {/* Main Responsive Phone Container */}
      <div
        ref={containerRef}
        className="w-full max-w-[430px] h-[100dvh] max-h-[100dvh] flex flex-col bg-[var(--liv-bg)] text-[var(--liv-text)] relative overflow-hidden sm:my-6 sm:h-[844px] sm:max-h-[90vh] sm:rounded-[40px] sm:border-[8px] sm:border-[var(--liv-line2)] sm:shadow-2xl"
      >
        {/* Top Header Bar with Return to Consumer App Navigation */}
        <header className="flex items-center justify-between px-5 pt-3.5 pb-2 border-b border-[var(--liv-line)] z-20 shrink-0 bg-[var(--liv-bg)]">
          <button
            type="button"
            onClick={() => {
              if (currentView === "main" && activeTab === "home") {
                navigate({ to: "/home" });
              } else if (currentView === "main") {
                setActiveTab("home");
              } else {
                setCurrentView("main");
              }
            }}
            className="flex items-center gap-2 group focus:outline-none"
            aria-label="Liv Home"
          >
            <LivMark size={22} />
            <span className="font-mono text-[12px] font-bold tracking-[0.25em] uppercase text-[var(--liv-text)]">
              Liv
            </span>
          </button>

          <div className="flex items-center gap-2">
            <Link
              to="/home"
              className="text-[11px] font-mono uppercase tracking-wider text-[var(--liv-muted)] hover:text-[var(--liv-text)] transition-colors px-2.5 py-1 rounded-lg border border-[var(--liv-line2)] bg-[var(--liv-surf)] flex items-center gap-1.5"
              title="Return to Aaha Consumer App"
            >
              <span>← Aaha App</span>
            </Link>

            <button
              type="button"
              className="icb size-8 rounded-full"
              onClick={() => setAppTheme((t) => (t === "dark" ? "light" : "dark"))}
              title="Toggle theme"
            >
              <LivIcon name={appTheme === "dark" ? "moon" : "spark"} size={16} />
            </button>

            <button
              type="button"
              className="icb size-8 rounded-full"
              onClick={() => setActiveSheet("profile")}
              title="Profile and settings"
            >
              <LivIcon name="user" size={16} />
            </button>
          </div>
        </header>

        {/* ─── 1. SPLASH SCREEN ─── */}
        {currentView === "splash" && (
          <div
            className="splash flex-1 flex flex-col items-center justify-center cursor-pointer select-none"
            onClick={() => setCurrentView(session ? "main" : "story")}
          >
            <LivMark size={128} />
            <div className="space-y-1 text-center mt-3">
              <span className="wm text-[15px] tracking-[0.45em] block">Liv</span>
              <p className="tag text-[19px]">Longevity, measured.</p>
            </div>
            <div className="mt-8 flex flex-col items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-[var(--liv-faint)]">
                {t("Tap anywhere to enter")}
              </span>
              <span className="text-[18px] text-[var(--liv-muted)] animate-bounce">↓</span>
            </div>
          </div>
        )}

        {/* ─── 2. STORY INTRO (4-Part Video Simulator) ─── */}
        {currentView === "story" && (
          <div className="flex-1 min-h-0 flex flex-col px-5 pt-3 pb-8 overflow-y-auto no-scrollbar touch-pan-y overscroll-contain">
            <div className={`story ${storyPaused ? "paused" : ""}`}>
              {/* Progress bars */}
              <div className="sbars">
                {STORIES.map((_, i) => (
                  <i
                    key={i}
                    className={i < storyIndex ? "done" : i === storyIndex ? "on" : ""}
                  />
                ))}
              </div>

              {/* Header */}
              <div className="stop">
                <div className="who">
                  <LivMark size={20} />
                  <span>Liv</span>
                  <span className="font-mono text-[10px] text-[var(--liv-muted)]">
                    {storyIndex + 1}/{STORIES.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStoryPaused((p) => !p)}
                  aria-label={storyPaused ? "Play story" : "Pause story"}
                >
                  <LivIcon name={storyPaused ? "play" : "pause"} size={16} />
                </button>
              </div>

              {/* Animated visual */}
              <div className="sv" aria-hidden="true">
                {STORIES[storyIndex].visual === "pulse" && (
                  <svg viewBox="0 0 92 92" fill="none" className="w-full h-full">
                    <circle className="pulse" cx="46" cy="46" r="42" stroke="currentColor" strokeWidth="1.2" />
                    <circle className="pulse d2" cx="46" cy="46" r="42" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="46" cy="46" r="6" fill="currentColor" />
                  </svg>
                )}
                {STORIES[storyIndex].visual === "range" && (
                  <svg viewBox="0 0 92 92" fill="none" className="w-full h-full">
                    <path d="M6 46h30" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                    <path d="M42 46h20" stroke="currentColor" strokeWidth="5" strokeDasharray="2 4" />
                    <path d="M68 46h18" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.3" />
                    <g className="slide">
                      <circle cx="62" cy="46" r="8" fill="var(--liv-surf)" stroke="currentColor" strokeWidth="2" />
                      <circle cx="62" cy="46" r="3" fill="currentColor" />
                    </g>
                  </svg>
                )}
                {STORIES[storyIndex].visual === "ring" && (
                  <svg viewBox="0 0 92 92" fill="none" className="w-full h-full">
                    <circle cx="46" cy="46" r="36" stroke="currentColor" strokeWidth="3" opacity="0.2" />
                    <circle className="ringdraw" cx="46" cy="46" r="36" stroke="currentColor" strokeWidth="3" strokeLinecap="round" transform="rotate(-90 46 46)" />
                    <text x="46" y="56" textAnchor="middle" fill="currentColor" fontFamily="Cormorant Garamond, serif" fontSize="30" fontWeight="500">69</text>
                  </svg>
                )}
                {STORIES[storyIndex].visual === "path" && (
                  <svg viewBox="0 0 92 92" fill="none" className="w-full h-full">
                    <path d="M13 60 46 38 79 60" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 4" />
                    <circle cx="13" cy="60" r="3" fill="currentColor" />
                    <circle cx="46" cy="38" r="3" fill="currentColor" />
                    <circle cx="79" cy="60" r="3" fill="currentColor" />
                    <circle className="hop" cx="13" cy="60" r="9" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                )}
              </div>

              {/* Story Copy */}
              <div className="sbody">
                <h2>{STORIES[storyIndex].title}</h2>
                <p>{STORIES[storyIndex].description}</p>
              </div>

              {/* Navigation overlays */}
              <button
                type="button"
                className="snav l"
                onClick={() => setStoryIndex((prev) => (prev - 1 + STORIES.length) % STORIES.length)}
                aria-label="Previous story"
              />
              <button
                type="button"
                className="snav r"
                onClick={() => setStoryIndex((prev) => (prev + 1) % STORIES.length)}
                aria-label="Next story"
              />
              <span className="shint">Tap to skip</span>
            </div>

            {/* Stepper Dots & Skip */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-1.5">
                {STORIES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setStoryIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === storyIndex ? "w-6 bg-[var(--liv-text)]" : "w-2 bg-[var(--liv-line2)]"
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setCurrentView("signup")}
                className="text-[12px] font-mono uppercase tracking-wider text-[var(--liv-muted)] hover:text-[var(--liv-text)]"
              >
                Skip intro →
              </button>
            </div>

            {/* Value Highlights */}
            <div className="my-auto space-y-3 py-2">
              <LivCard className="p-3.5 space-y-1">
                <LivLabel>Living Lab Kiosk Sync</LivLabel>
                <LivHeading level={3}>300+ biomarkers, 1 single report</LivHeading>
                <LivSubtext>
                  Measurements from the centre sync directly with your mobile number.
                </LivSubtext>
              </LivCard>
              <LivCard className="p-3.5 space-y-1">
                <LivLabel>Active Integrated Wellness Score</LivLabel>
                <LivHeading level={3}>Precision clinical thresholds</LivHeading>
                <LivSubtext>
                  Solid markers highlight optimal health, hatched indicate drift, and dim represent priority opportunities.
                </LivSubtext>
              </LivCard>
            </div>

            {/* CTAs */}
            <div className="mt-auto pt-4 space-y-2">
              <LivButton variant="primary" onClick={() => setCurrentView("signup")}>
                Create Account
              </LivButton>
              <LivButton variant="ghost" onClick={() => setCurrentView("signin")}>
                Already a member? Sign in
              </LivButton>
            </div>
          </div>
        )}

        {/* ─── 3. SIGN UP FORM ─── */}
        {currentView === "signup" && (
          <form
            className="scroll touch-pan-y overscroll-contain flex-1 min-h-0"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendOtp(true);
            }}
          >
            <div>
              <LivHeading level={1}>Create your account</LivHeading>
              <LivSubtext className="mt-1">Four details. Under a minute.</LivSubtext>
            </div>

            <div className="field">
              <label htmlFor="su-name">Full name *</label>
              <input
                id="su-name"
                className="inp"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Kaveri Bhosle"
              />
            </div>

            <div className="field">
              <label htmlFor="su-phone">Mobile number *</label>
              <div className="pre">
                <span>+91</span>
                <input
                  id="su-phone"
                  className="inp"
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="98765 43210"
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="su-email">Email address</label>
              <input
                id="su-email"
                className="inp"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="two">
              <div className="field">
                <label htmlFor="su-age">Age *</label>
                <input
                  id="su-age"
                  className="inp"
                  type="number"
                  min={18}
                  max={110}
                  required
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="42"
                />
              </div>
              <div className="field">
                <label>Sex</label>
                <LivSegmented
                  value={sex}
                  onChange={(s) => setSex(s as any)}
                  options={[
                    { id: "Female", label: "F" },
                    { id: "Male", label: "M" },
                    { id: "Other", label: "O" },
                  ]}
                />
              </div>
            </div>

            {/* Consent checkbox */}
            <button
              type="button"
              className="consent"
              onClick={() => setConsentGiven((c) => !c)}
              role="checkbox"
              aria-checked={consentGiven}
            >
              <span className={`box ${consentGiven ? "on" : ""}`}>
                <LivIcon name="check" size={14} strokeWidth={2.4} />
              </span>
              <span>
                I agree to my health data being securely stored in India and used to calculate my longevity score and 90-day plan. I can export or delete it at any time.
              </span>
            </button>

            {otpSent ? (
              <div className="space-y-3 pt-2">
                <label className="k block">Enter 6-digit code sent by SMS</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  className={`w-full h-14 text-center font-serif text-[28px] tracking-[0.4em] rounded-2xl border-2 border-[var(--liv-line2)] bg-[var(--liv-surf)] text-[var(--liv-text)] outline-none ${
                    otpErrorShake ? "animate-shake" : ""
                  }`}
                />
                <LivButton
                  variant="primary"
                  type="button"
                  onClick={() => handleVerifyOtp(true)}
                  disabled={busy}
                >
                  {busy ? "Verifying..." : "Verify & Complete Registration"}
                </LivButton>
              </div>
            ) : (
              <LivButton variant="primary" type="submit" disabled={busy || !consentGiven}>
                {busy ? "Sending code..." : "Create Account"}
              </LivButton>
            )}

            <button
              type="button"
              className="link"
              onClick={() => setCurrentView("signin")}
            >
              Already a member? <b>Sign in</b>
            </button>
          </form>
        )}

        {/* ─── 4. SIGN IN FORM ─── */}
        {currentView === "signin" && (
          <div className="scroll touch-pan-y overscroll-contain flex-1 min-h-0">
            <div className="illo flex justify-center py-2">
              <LivMark size={88} />
            </div>
            <div className="text-center">
              <LivHeading level={1}>Welcome back</LivHeading>
              <LivSubtext className="mt-1">
                Sign in to see your score, reports, and your plan.
              </LivSubtext>
            </div>

            <div className="seg" role="group">
              <span
                className="thumb"
                style={{
                  width: "calc((100% - 8px) / 2)",
                  transform: `translateX(${authMode === "otp" ? "0%" : "100%"})`,
                }}
              />
              <button
                type="button"
                onClick={() => setAuthMode("otp")}
                aria-pressed={authMode === "otp"}
              >
                Mobile OTP
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("google")}
                aria-pressed={authMode === "google"}
              >
                Google
              </button>
            </div>

            {authMode === "google" ? (
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  className="btn"
                  onClick={handleGoogleSignIn}
                  disabled={busy}
                >
                  <span className="gmark">G</span>
                  <span>Continue with Google</span>
                </button>
                <p className="sub text-center text-[12px]">
                  We read only your name and email address.
                </p>
              </div>
            ) : !otpSent ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSendOtp(false);
                }}
                className="space-y-3 pt-2"
              >
                <div className="field">
                  <label htmlFor="si-phone">Mobile number</label>
                  <div className="pre">
                    <span>+91</span>
                    <input
                      id="si-phone"
                      className="inp"
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="98765 43210"
                    />
                  </div>
                </div>
                <LivButton variant="primary" type="submit" disabled={busy}>
                  {busy ? "Sending code..." : "Send code"}
                </LivButton>
                <p className="sub text-center text-[12px]">
                  We send a 6-digit code by SMS to confirm it is you.
                </p>
              </form>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="hd">
                  <p className="sub">
                    Code sent to <b className="text-[var(--liv-text)] font-mono">+91 {phoneNumber}</b>
                  </p>
                  <button
                    type="button"
                    className="link"
                    style={{ padding: 0 }}
                    onClick={() => setOtpSent(false)}
                  >
                    <b>Change</b>
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  className={`w-full h-14 text-center font-serif text-[28px] tracking-[0.4em] rounded-2xl border-2 border-[var(--liv-line2)] bg-[var(--liv-surf)] text-[var(--liv-text)] outline-none ${
                    otpErrorShake ? "animate-shake" : ""
                  }`}
                />
                <LivButton
                  variant="primary"
                  type="button"
                  onClick={() => handleVerifyOtp(false)}
                  disabled={busy}
                >
                  {busy ? "Verifying..." : "Verify & Continue"}
                </LivButton>
              </div>
            )}

            <button
              type="button"
              className="link mt-auto pt-4"
              onClick={() => setCurrentView("signup")}
            >
              New here? <b>Create an account</b>
            </button>
          </div>
        )}

        {/* ─── 5. WELCOME CELEBRATION ─── */}
        {currentView === "welcome" && (
          <div className="welcome scroll touch-pan-y overscroll-contain flex-1 min-h-0">
            <span className="tick">
              <svg className="ring2" width="96" height="96" viewBox="0 0 96 96">
                <circle className="r2" cx="48" cy="48" r="46" />
              </svg>
              <span className="ck text-[var(--liv-text)]">
                <LivIcon name="check" size={34} strokeWidth={1.8} />
              </span>
            </span>

            <div className="space-y-1">
              <span className="k">Account created</span>
              <h1 className="h1">You're in, {fullName.split(" ")[0]}.</h1>
              <p className="sub font-serif italic text-[17px] mt-1">
                Your longevity story starts with one visit. Everything after that lives here.
              </p>
            </div>

            <div className="aiws">
              <LivProgressRing size={44} strokeWidth={4} progress={0.69} onBg={true}>
                <span className="unit text-[10px] font-bold text-[var(--liv-text)]">AIWS</span>
              </LivProgressRing>
              <div className="min-w-0">
                <span className="k">Active Integrated Wellness Score</span>
                <p>
                  One number out of 100 for your whole body. Your well-being benchmark across 8 biological systems.
                </p>
              </div>
            </div>

            <div className="next space-y-2">
              <div className="flex items-start gap-3">
                <b>1</b>
                <span>
                  Mobile connected
                  <small>Securely connected to your kiosk screening records.</small>
                </span>
              </div>
              <div className="flex items-start gap-3">
                <b>2</b>
                <span>
                  We find your kiosk screening
                  <small>Your longevity report arrives in the app by itself.</small>
                </span>
              </div>
              <div className="flex items-start gap-3">
                <b>3</b>
                <span>
                  Your AIWS score and plan
                  <small>Three priorities, daily steps, and care team access.</small>
                </span>
              </div>
            </div>

            <div className="w-full pt-4 space-y-2 mt-auto">
              <LivButton
                variant="primary"
                onClick={() => {
                  setCurrentView("main");
                  setActiveTab("home");
                }}
              >
                Open Liv Dashboard →
              </LivButton>
              <LivButton
                variant="ghost"
                onClick={() => setCurrentView("report")}
              >
                Read 18-Chapter Longevity Report
              </LivButton>
            </div>
          </div>
        )}

        {/* ─── 6. MAIN APP SHELL (4 Tabs: Home, Markers, Plan, Care) ─── */}
        {currentView === "main" && (
          <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
            {/* ─── TAB 1: HOME ─── */}
            {activeTab === "home" && (
              <div className="scroll touch-pan-y overscroll-contain flex-1 min-h-0">
                {/* Hero AIWS Score Card */}
                <div className="card inv hero">
                  <div className="top">
                    <LivProgressRing
                      size={104}
                      strokeWidth={7}
                      progress={((latestAssessment?.score && latestAssessment.score > 0) ? latestAssessment.score : 69) / 100}
                      onBg={false}
                    >
                      <span className="num text-[42px]">
                        {(latestAssessment?.score && latestAssessment.score > 0) ? latestAssessment.score : 69}
                      </span>
                      <div className="unit mt-0.5">AIWS</div>
                    </LivProgressRing>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="k">Biological age</span>
                        {latestAssessment?.score && latestAssessment.score > 0 ? (
                          <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 rounded px-1.5 py-0.5">
                            Verified Kiosk
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--liv-inv-muted)] bg-[var(--liv-line2)]/40 rounded px-1.5 py-0.5">
                            Reference Baseline
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="num text-[40px]">45.8</span>{" "}
                        <span className="unit">vs {age}</span>
                      </div>
                      <span className="sub">Four movable things. All in your plan.</span>
                    </div>
                  </div>

                  <div className="facts">
                    <div>
                      <span className="k">Programme</span>
                      <div>
                        <span className="num">{dayNumber}</span>{" "}
                        <span className="unit">/ {planDays} · level 2</span>
                      </div>
                    </div>
                    <div>
                      <span className="k">Streak</span>
                      <div>
                        <span className="num">{streak}</span>{" "}
                        <span className="unit">days</span>
                      </div>
                    </div>
                  </div>

                  {/* XP Reward Bar */}
                  <div className="xp">
                    <div className="bar">
                      <i style={{ width: `${userPoints % 100}%` }} />
                    </div>
                    <div className="row">
                      <span>{userPoints} pts</span>
                      <span>{100 - (userPoints % 100)} to the next reward</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="link"
                    onClick={() => setCurrentView("report")}
                  >
                    Signed 18 Sep · <b>Read your longevity report →</b>
                  </button>
                </div>

                {/* Three Things Today Card */}
                <div className="card" id="today">
                  <div className="hd">
                    <span className="h3">Three things today</span>
                    <span className="unit">
                      {Object.values(habitsDone).filter(Boolean).length} of 3 done
                    </span>
                  </div>

                  <div className="prog">
                    <i
                      style={{
                        width: `${(Object.values(habitsDone).filter(Boolean).length / 3) * 100}%`,
                      }}
                    />
                  </div>

                  <div>
                    {DEFAULT_HABITS.slice(0, 3).map(([id, title, desc]) => {
                      const isDone = !!habitsDone[id];
                      return (
                        <button
                          key={id}
                          type="button"
                          className={`habit ${isDone ? "done" : ""}`}
                          onClick={(e) => handleAction(`habit:${id}`, e)}
                        >
                          <span className={`box ${isDone ? "on" : ""}`}>
                            <LivIcon name="check" size={15} strokeWidth={2.4} />
                          </span>
                          <span className="t">
                            {title}
                            <small>{desc}</small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Up Next Card */}
                <div className="card upnext">
                  <span className="k">Up next</span>
                  {appointments.find((a) => !a.past) && (
                    <button
                      type="button"
                      className="quiet"
                      style={{ borderTop: "none", paddingTop: 0 }}
                      onClick={() => setActiveTab("care")}
                    >
                      <span className="t">
                        {appointments.find((a) => !a.past)!.t}
                        <small>
                          {appointments.find((a) => !a.past)!.d.toLocaleDateString(undefined, {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}{" "}
                          · {appointments.find((a) => !a.past)!.h}
                        </small>
                      </span>
                      <LivIcon name="chev" size={18} />
                    </button>
                  )}

                  <button
                    type="button"
                    className="quiet"
                    onClick={() => handleAction("stepbook:hm:3")}
                  >
                    <span className="t">
                      Strength sessions, three a week
                      <small>Hormonal and metabolic · Weeks 3 to 8</small>
                    </span>
                    <span className="btn sm">Book a session</span>
                  </button>
                </div>

                {/* Last Check-in Kiosk Vitals & Body Scan Preview */}
                <div className="card">
                  <div className="hd">
                    <span className="h3">Last check-in</span>
                    <button
                      type="button"
                      className="link"
                      style={{ padding: 0 }}
                      onClick={() => setActiveTab("markers")}
                    >
                      <b>6 Oct →</b>
                    </button>
                  </div>

                  <div className="mini4">
                    {[
                      { id: "hr", label: "Heart rate", v: "68", u: "bpm" },
                      { id: "bp", label: "BP", v: "122/81", u: "mmHg" },
                      { id: "posture", label: "Posture", v: "72", u: "/100" },
                      { id: "cort", label: "Cortisol", v: "18.2", u: "µg/dL" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleAction(`marker:${m.id}`)}
                      >
                        <span className="k">{m.label}</span>
                        <span className="num block mt-1">{m.v}</span>
                        <span className="d">{m.u}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="quiet"
                    onClick={() => {
                      setActiveTab("markers");
                      setMarkerFilter("p");
                    }}
                  >
                    <span className="t">
                      {BIOMARKERS.filter((m) => m.s === "p").length} priority markers
                      <small>ApoB, ferritin, vitamin D, grip, muscle and more</small>
                    </span>
                    <LivIcon name="chev" size={18} />
                  </button>
                </div>

                <div style={{ height: "64px", flexShrink: 0 }} />
              </div>
            )}

            {/* ─── TAB 2: BIOMARKERS ─── */}
            {activeTab === "markers" && (
              <div className="scroll touch-pan-y overscroll-contain flex-1 min-h-0">
                <div className="hd">
                  <div>
                    <span className="k">Assessed 18 Sep 2026</span>
                    <h1 className="h1 mt-1">Biomarkers</h1>
                  </div>
                  <button
                    type="button"
                    className="icb"
                    onClick={() => setActiveSheet("profile")}
                  >
                    <LivIcon name="user" size={18} />
                  </button>
                </div>

                {/* Filter Chips */}
                <div className="chips">
                  {[
                    { id: "all", label: "All", count: BIOMARKERS.length },
                    { id: "p", label: "Priority", count: BIOMARKERS.filter((m) => m.s === "p").length },
                    { id: "b", label: "Borderline", count: BIOMARKERS.filter((m) => m.s === "b").length },
                    { id: "o", label: "Optimal", count: BIOMARKERS.filter((m) => m.s === "o").length },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`chip ${markerFilter === f.id ? "on" : ""}`}
                      onClick={() => setMarkerFilter(f.id)}
                    >
                      {f.label} {f.count}
                    </button>
                  ))}
                </div>

                {/* Quick Link to 18-Chapter Report */}
                <button
                  type="button"
                  className="card appt"
                  onClick={() => setCurrentView("report")}
                >
                  <LivIcon name="file" size={24} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="h3 block">Longevity report (18 chapters)</span>
                    <span className="sub block">Living Lab kiosk · Pune · Signed by Dr. Deshmukh</span>
                  </span>
                  <LivIcon name="chev" size={18} />
                </button>

                {/* Live Kiosk Vitals Block */}
                <span className="k mt-2">From your last check-in · 6 Oct</span>
                <div className="card">
                  <div className="hd">
                    <span className="h3">Kiosk vitals</span>
                    <span className="unit">ECG lead-I · 25 mm/s</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAction("marker:ecg")}
                    className="w-full text-left"
                  >
                    <div className="strip">
                      <div className="lbl">
                        <span className="live" />
                        <span className="k">Live ECG trace · regular rhythm</span>
                      </div>
                      <svg viewBox="0 0 360 110" preserveAspectRatio="none" className="w-full h-auto">
                        <path
                          className="tr"
                          d={getEcgPath(360, 110, 5, 1)}
                        />
                        <circle className="beat" cx={346} cy={68} r={3} />
                      </svg>
                    </div>
                  </button>

                  <div className="vit">
                    <button
                      type="button"
                      onClick={() => handleAction("marker:hr")}
                    >
                      <span className="k">Resting heart rate</span>
                      <span>
                        <span className="num">68</span> <span className="unit">bpm</span>
                      </span>
                      <span className="d dn">▼ 6 bpm · better</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction("marker:bp")}
                    >
                      <span className="k">Blood pressure</span>
                      <span>
                        <span className="num">122/81</span> <span className="unit">mmHg</span>
                      </span>
                      <span className="d dn">▼ 4/3 · better</span>
                    </button>
                  </div>
                </div>

                {/* Smart Camera Body Scan Block */}
                <div className="card">
                  <div className="hd">
                    <span className="h3">Body scan</span>
                    <span className="unit">Smart camera · 6 Oct</span>
                  </div>

                  <button
                    type="button"
                    className="fig text-left w-full"
                    onClick={() => handleAction("marker:posture")}
                  >
                    {/* Silhouette posture SVG */}
                    <svg viewBox="0 0 150 230" className="w-full h-auto" aria-label="Posture figure">
                      <line className="plumb" x1={75} y1={8} x2={75} y2={222} />
                      <g className="body">
                        <circle cx={79} cy={30} r={15} />
                        <path d="M60 52h38l10 8 6 50-10 2-5-36v50l4 90h-12l-6-80-6 80H67l4-90V76l-5 36-10-2 6-50z" />
                      </g>
                      <line className="ln ok" x1={49} y1={58} x2={107} y2={58} />
                      <line className="ln" x1={49} y1={56} x2={107} y2={61} />
                      <circle className="dot" cx={49} cy={56} r={2.5} />
                      <circle className="dot" cx={107} cy={61} r={2.5} />
                      <circle className="dot" cx={79} cy={30} r={2.5} />
                      <line className="ln" x1={75} y1={52} x2={79} y2={30} />
                      <text className="ang" x={86} y={22}>12°</text>
                      <text className="ang" x={110} y={66}>1.5cm</text>
                    </svg>

                    <span>
                      <span className="k">Posture score</span>
                      <span className="block mt-1">
                        <span className="num text-[36px]">72</span>{" "}
                        <span className="unit">/ 100</span>
                      </span>
                      <span className="d up">▲ +3 vs 6 Oct</span>
                      <span className="sub block mt-1.5">
                        Forward head, right shoulder low. Tap for clinical findings.
                      </span>
                    </span>
                  </button>

                  <div className="scan">
                    {[
                      { id: "bmi", label: "BMI", v: "26.4", u: "kg/m²" },
                      { id: "bf", label: "Body fat", v: "36.2", u: "%" },
                      { id: "waist", label: "Waist", v: "88", u: "cm" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleAction(`marker:${m.id}`)}
                      >
                        <span className="k">{m.label}</span>
                        <span className="num block mt-1">{m.v}</span>
                        <span className="unit">{m.u}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Biomarkers Grouped by System */}
                {GROUPS.map((g) => {
                  const markers = BIOMARKERS.filter(
                    (m) =>
                      m.g === g.id &&
                      (markerFilter === "all" || m.s === markerFilter),
                  );
                  if (!markers.length) return null;
                  return (
                    <div key={g.id} className="space-y-1 mt-3">
                      <span className="k">{g.name}</span>
                      <div className="card grp">
                        {markers.map((m) => {
                          const span = (m.max || 100) - (m.min || 0);
                          const l = Math.max(3, Math.min(97, ((m.x - (m.min || 0)) / (span || 1)) * 100));
                          return (
                            <button
                              key={m.id}
                              type="button"
                              className="mrow"
                              onClick={() => handleAction(`marker:${m.id}`)}
                            >
                              <span className="top">
                                <span className="n">{m.n}</span>
                                <span className="v">{m.v}</span>
                                <span className="unit">{m.u.split(" · ")[0]}</span>
                              </span>

                              {!m.nobar && (
                                <div className="rb" aria-hidden="true">
                                  {m.z?.map(([bound, zone], idx) => (
                                    <i key={idx} className={`z${zone}`} style={{ flex: 1 }} />
                                  ))}
                                  <b style={{ left: `${l.toFixed(1)}%` }} />
                                </div>
                              )}

                              <span className="rbl mt-2">
                                <span>Optimal {m.opt}</span>
                                <span className={`pill ${m.s}`}>
                                  {m.s === "p" ? "▲ Priority" : m.s === "b" ? "◆ Borderline" : "● Optimal"}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <div style={{ height: "64px", flexShrink: 0 }} />
              </div>
            )}

            {/* ─── TAB 3: PLAN ─── */}
            {activeTab === "plan" && (
              <div className="scroll touch-pan-y overscroll-contain flex-1 min-h-0">
                <div className="hd">
                  <div>
                    <span className="k">Day {dayNumber} of {planDays}</span>
                    <h1 className="h1 mt-1">Your 90 days</h1>
                  </div>
                  <button
                    type="button"
                    className="icb"
                    onClick={() => setActiveSheet("profile")}
                  >
                    <LivIcon name="user" size={18} />
                  </button>
                </div>

                {/* Care Plan Card */}
                <div className="card inv">
                  <div className="hd">
                    <div>
                      <span className="k">Care plan · Dr. Deshmukh · {planDays} days</span>
                      <div className="h3 text-[17px] mt-1">Level 2 of 3 · Build</div>
                    </div>
                    <span className="pts text-[var(--liv-inv-fg)]">{userPoints} pts</span>
                  </div>

                  <div className="lvl">
                    <LivProgressRing size={64} strokeWidth={5} progress={dayNumber / planDays} onBg={false}>
                      <span className="unit text-[var(--liv-inv-fg)]">
                        {dayNumber}
                        <small className="text-[var(--liv-inv-muted)]">/{planDays}</small>
                      </span>
                    </LivProgressRing>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px]">
                        Metabolic Reset, 12 weeks. 3 of 5 milestones reached.
                      </div>
                      <div className="sub mt-0.5">
                        Re-measure {retestDate.toLocaleDateString()}. Points come from daily steps and sessions.
                      </div>
                    </div>
                  </div>

                  <div className="xp">
                    <div className="bar">
                      <i style={{ width: `${userPoints % 100}%` }} />
                    </div>
                    <div className="row">
                      <span>{userPoints} pts</span>
                      <span>{100 - (userPoints % 100)} to the next reward</span>
                    </div>
                  </div>

                  <div className="path">
                    {[
                      { label: "Begin", done: true },
                      { label: "First strength", done: true },
                      { label: "Day-30 bloods", done: true },
                      { label: "12 sessions", done: false, now: true },
                      { label: "Day-90 re-test", done: false },
                    ].map((m, i) => (
                      <div key={i} className={`ms ${m.done ? "done" : m.now ? "now" : ""}`}>
                        <span className="nd">
                          <LivIcon name="check" size={13} strokeWidth={3} />
                        </span>
                        <span>{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* This Week Tracker */}
                <div className="card pw">
                  <div className="hd">
                    <span className="h3">This week</span>
                    <span className="unit">Week 4 · Tap each time you do it</span>
                  </div>

                  {[
                    { k: "str", n: "Strength session", s: "3 a week with Coach Ritu", t: 3 },
                    { k: "walk", n: "Walk after dinner", s: "10 minutes, most days", t: 7 },
                    { k: "sup", n: "Vitamin D and iron", s: "Every day, as prescribed", t: 7 },
                    { k: "br", n: "Coherence breathing", s: "10 minutes with Liv", t: 5 },
                  ].map((w) => {
                    const count = weeklyProgress[w.k] || 0;
                    return (
                      <div key={w.k} className="space-y-1.5">
                        <div className="hd">
                          <span>
                            <span className="text-[14.5px] font-medium">{w.n}</span>
                            <span className="sub block text-[12px]">{w.s}</span>
                          </span>
                          <span className="unit">
                            {count}/{w.t}
                          </span>
                        </div>
                        <div className="wk">
                          {Array.from({ length: w.t }).map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              className={count > i ? "on" : ""}
                              onClick={(e) => handleAction(`wk:${w.k}:${i + 1}`, e)}
                            >
                              <LivIcon name="check" size={12} strokeWidth={3} />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Badges Row */}
                <div className="card">
                  <div className="hd">
                    <span className="h3">Badges</span>
                    <span className="unit">
                      {Object.values(earnedBadges).filter(Boolean).length} of{" "}
                      {Object.keys(BADGE_DEFINITIONS).length}
                    </span>
                  </div>
                  <div className="badges">
                    {Object.entries(BADGE_DEFINITIONS).map(([key, [title, desc]]) => {
                      const isUnlocked = !!earnedBadges[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          className={`bd ${isUnlocked ? "" : "lock"}`}
                          onClick={() => handleAction(`sheet:badge:${key}`)}
                        >
                          <span className="ico">
                            <LivIcon name={isUnlocked ? "check" : "flame"} size={16} />
                          </span>
                          <b>{title}</b>
                          <small>{desc}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Three Journeys / Tracks */}
                <span className="k mt-2">Your three journeys</span>
                {JOURNEY_TRACKS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="card trow"
                    onClick={() => handleAction(`track:${t.id}`)}
                  >
                    <LivProgressRing size={50} strokeWidth={4} progress={0.5} onBg={true}>
                      <span className="unit text-[11px]">3/7</span>
                    </LivProgressRing>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="h3 block">{t.n}</span>
                      <span className="sub block">{t.short}</span>
                    </span>
                    <LivIcon name="chev" size={18} />
                  </button>
                ))}

                <div style={{ height: "64px", flexShrink: 0 }} />
              </div>
            )}

            {/* ─── TAB 4: CARE ─── */}
            {activeTab === "care" && (
              <div className="scroll touch-pan-y overscroll-contain flex-1 min-h-0">
                <div className="hd">
                  <div>
                    <span className="k">Your visits, treatments and team</span>
                    <h1 className="h1 mt-1">Care</h1>
                  </div>
                  <button
                    type="button"
                    className="icb"
                    onClick={() => setActiveSheet("profile")}
                  >
                    <LivIcon name="user" size={18} />
                  </button>
                </div>

                {/* Upcoming visits */}
                <span className="k">Upcoming</span>
                {appointments
                  .filter((a) => !a.past)
                  .map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className="card appt"
                      onClick={() => handleAction(`sheet:appt:${a.id}`)}
                    >
                      <span className="date">
                        <b>{a.d.getDate()}</b>
                        <span>{a.d.toLocaleDateString(undefined, { month: "short" })}</span>
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="h3 block">{a.t}</span>
                        <span className="sub block">{a.w}</span>
                        <span className="sub block">
                          {a.d.toLocaleDateString(undefined, { weekday: "short" })} · {a.h}
                        </span>
                        {a.status && (
                          <span className={`stat-pill ${a.status === "pending" ? "wait" : "ok"} block mt-1`}>
                            <i />
                            {a.status === "pending"
                              ? "Awaiting Dr. Deshmukh's sign-off"
                              : "Approved by Dr. Deshmukh"}
                          </span>
                        )}
                      </span>
                      <LivIcon name="chev" size={18} />
                    </button>
                  ))}

                <LivButton
                  variant="ghost"
                  onClick={() => handleAction("newbook:doc")}
                  className="mt-2"
                >
                  <LivIcon name="cal" size={18} />
                  <span>Book a visit</span>
                </LivButton>

                {/* Recommended Treatments by Dr. Deshmukh */}
                <div className="sec mt-3">
                  <span className="k">Recommended by Dr. Deshmukh</span>
                  <span className="unit">From your report</span>
                </div>
                {TREATMENTS.filter((x) => x.rec).map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    className="svc"
                    onClick={() => handleAction(`sheet:svc:${x.id}`)}
                  >
                    <div>
                      <div className="h3">{x.n}</div>
                      <div className="sub">{x.d}{x.sign ? " · doctor sign-off" : ""}</div>
                      <div className="why"><b>Why:</b> {x.rec}</div>
                    </div>
                    <LivIcon name="chev" size={16} />
                  </button>
                ))}

                {/* Treatments Catalogue */}
                <span className="k mt-3">Treatments at the centre</span>
                <div className="chips">
                  {[
                    { id: "skin", label: "Skin" },
                    { id: "hair", label: "Hair" },
                    { id: "iv", label: "IV drips" },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`chip ${treatmentCategory === c.id ? "on" : ""}`}
                      onClick={() => setTreatmentCategory(c.id as any)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {TREATMENTS.filter((x) => x.cat === treatmentCategory).map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    className="svc"
                    onClick={() => handleAction(`sheet:svc:${x.id}`)}
                  >
                    <div>
                      <div className="h3">{x.n}</div>
                      <div className="sub">{x.d}</div>
                    </div>
                    <LivIcon name="chev" size={16} />
                  </button>
                ))}

                {/* Care Packages */}
                <span className="k mt-3">Care packages from your report</span>
                {JOURNEY_TRACKS.map((t) => {
                  const p = CARE_PACKAGES[t.id];
                  const req = !!requestedPackages[t.id];
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className="opt"
                      onClick={() => handleAction(`sheet:pkg:${t.id}`)}
                    >
                      <div>
                        <div className="h3">{p.n}</div>
                        <div className="sub">{p.f} · {p.len}</div>
                      </div>
                      {req ? (
                        <span className="pill b">Requested</span>
                      ) : (
                        <LivIcon name="chev" size={16} />
                      )}
                    </button>
                  );
                })}

                {/* Care Team */}
                <span className="k mt-3">Your care team</span>
                <div className="card" style={{ padding: "4px 18px", gap: 0 }}>
                  {[
                    { name: "Dr. A. Deshmukh", role: "Supervising physician · signs every report", act: "newbook:doc" },
                    { name: "Ritu S.", role: "Longevity coach · fortnightly check-ins", act: "newbook:coach" },
                    { name: "Trupti", role: "Nurse · runs your kiosk and treatment sessions", act: "say:Trupti logs each session you take at the centre." },
                    { name: "Liv", role: "AI companion · English, Hindi or Marathi", act: "sheet:liv" },
                  ].map((m, i) => (
                    <button
                      key={i}
                      type="button"
                      className="habit"
                      onClick={() => handleAction(m.act)}
                    >
                      <span className="box on text-[12px] font-bold">
                        {m.name.charAt(0)}
                      </span>
                      <span className="t">
                        {m.name}
                        <small>{m.role}</small>
                      </span>
                      <LivIcon name="chev" size={16} />
                    </button>
                  ))}
                </div>

                <div style={{ height: "64px", flexShrink: 0 }} />
              </div>
            )}

            {/* Bottom Floating Action Button: Ask Liv */}
            <button
              type="button"
              className="fab"
              onClick={() => setActiveSheet("liv")}
              aria-label="Ask Liv"
            >
              <LivIcon name="spark" size={20} />
              <span>Ask Liv</span>
            </button>

            {/* In-App Bottom Navigation */}
            <nav className="nav" aria-label="Liv Main Navigation">
              {[
                { id: "home", label: "Home", icon: "home" },
                { id: "markers", label: "Markers", icon: "drop" },
                { id: "plan", label: "Plan", icon: "plan" },
                { id: "care", label: "Care", icon: "cal" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`tab ${activeTab === t.id ? "on" : ""}`}
                  onClick={() => setActiveTab(t.id as any)}
                >
                  <LivIcon name={t.icon as any} size={22} />
                  <span>{t.label}</span>
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* ─── 7. MARKER DETAIL VIEW ─── */}
        {currentView === "marker" && (() => {
          const m = getMarkerById(selectedMarkerId) || BIOMARKERS[0];
          const g = GROUPS.find((grp) => grp.id === m.g)?.name || "Biomarker";
          const track = getTrackForMarker(m);
          const span = (m.max || 100) - (m.min || 0);
          const l = Math.max(3, Math.min(97, ((m.x - (m.min || 0)) / (span || 1)) * 100));

          return (
            <div className="scroll touch-pan-y overscroll-contain flex-1 min-h-0">
              <div className="hd">
                <button
                  type="button"
                  className="icb"
                  onClick={() => handleAction("back")}
                >
                  <LivIcon name="back" size={20} />
                </button>
                <span className="k">{g}</span>
                <span style={{ width: "44px" }} />
              </div>

              <div>
                <h1 className="h1">{m.n}</h1>
                <div className="hd mt-3 items-end">
                  <span>
                    <span className="num text-[64px]">{m.v}</span>{" "}
                    <span className="unit text-[14px]">{m.u}</span>
                  </span>
                  <span className={`pill ${m.s}`}>
                    {m.s === "p" ? "▲ Priority" : m.s === "b" ? "◆ Borderline" : "● Optimal"}
                  </span>
                </div>
              </div>

              {/* Extra visual: ECG / Posture / EEG */}
              {m.id === "ecg" && (
                <div className="card">
                  <div className="strip">
                    <div className="lbl">
                      <span className="live" />
                      <span className="k">Lead I · 25 mm/s · 30 s</span>
                    </div>
                    <svg viewBox="0 0 360 110" preserveAspectRatio="none" className="w-full h-auto">
                      <path className="tr" d={getEcgPath(360, 110, 5, 1)} />
                      <circle className="beat" cx={346} cy={68} r={3} />
                    </svg>
                  </div>
                  <div className="iv">
                    {m.iv?.map(([val, lbl], i) => (
                      <div key={i}>
                        <b>{val}</b>
                        <span>{lbl}</span>
                      </div>
                    ))}
                  </div>
                  <p className="sub text-[12px]">
                    Regular rhythm · no ectopic beats in 30 s · read by Dr. A. Deshmukh
                  </p>
                </div>
              )}

              {m.id === "posture" && (
                <div className="card">
                  <div className="fig">
                    <svg viewBox="0 0 150 230" className="w-full h-auto">
                      <line className="plumb" x1={75} y1={8} x2={75} y2={222} />
                      <g className="body">
                        <circle cx={79} cy={30} r={15} />
                        <path d="M60 52h38l10 8 6 50-10 2-5-36v50l4 90h-12l-6-80-6 80H67l4-90V76l-5 36-10-2 6-50z" />
                      </g>
                      <line className="ln ok" x1={49} y1={58} x2={107} y2={58} />
                      <line className="ln" x1={49} y1={56} x2={107} y2={61} />
                      <circle className="dot" cx={49} cy={56} r={2.5} />
                      <circle className="dot" cx={107} cy={61} r={2.5} />
                      <circle className="dot" cx={79} cy={30} r={2.5} />
                      <line className="ln" x1={75} y1={52} x2={79} y2={30} />
                      <text className="ang" x={86} y={22}>12°</text>
                      <text className="ang" x={110} y={66}>1.5cm</text>
                    </svg>
                    <div className="find">
                      {m.find?.map(([st, t1, t2], i) => (
                        <div key={i}>
                          <i className={st} />
                          <span>
                            <b>{t1}</b>
                            <br />
                            {t2}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {m.eeg && (
                <div className="card eeg">
                  <span className="k">Brainwaves in three states</span>
                  {m.eeg.map(([state, waves, label, k], i) => (
                    <div key={i} className="space-y-1">
                      <div className="r">
                        <b>{state}</b>
                        <span className="unit">{waves}</span>
                      </div>
                      <svg viewBox="0 0 200 30" preserveAspectRatio="none">
                        <path d={getEegSvgPath(200, 30, k)} />
                      </svg>
                      <span className="sub block text-[12px]">{label}</span>
                    </div>
                  ))}
                </div>
              )}

              {!m.nobar && (
                <div className="card">
                  <div className="rb" aria-hidden="true">
                    {m.z?.map(([bound, zone], idx) => (
                      <i key={idx} className={`z${zone}`} style={{ flex: 1 }} />
                    ))}
                    <b style={{ left: `${l.toFixed(1)}%` }} />
                  </div>
                  <div className="rbl">
                    <span>Longevity-optimal {m.opt}</span>
                    <span>Clinical {m.clin}</span>
                  </div>
                  <p className="sub text-[12px]">
                    Solid is optimal, hatched is borderline, faint is priority. The clinical range is where illness begins. The optimal range is where healthspan is built.
                  </p>
                </div>
              )}

              {/* What it means */}
              <div className="card">
                <span className="k">What it means</span>
                <p className="font-serif text-[20px] leading-snug m-0">{m.m}</p>
              </div>

              {/* How to move it */}
              <div className="card">
                <div className="hd">
                  <span className="k">{m.s === "o" ? "How to protect it" : "How to move it"}</span>
                </div>
                <div>
                  {m.a.length ? (
                    m.a.map((actionText, i) => {
                      const key = `${m.id}:${i}`;
                      const isAdded = !!addedMarkerActions[key];
                      return (
                        <div key={i} className="act">
                          <p>{actionText}</p>
                          <button
                            type="button"
                            className={`add ${isAdded ? "on" : ""}`}
                            onClick={() => handleAction(`add:${key}`)}
                          >
                            {isAdded ? "Added" : "Add to plan"}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="sub">Nothing to do here. We re-measure it at your next visit.</p>
                  )}
                </div>
              </div>

              {/* Part of your journey */}
              <button
                type="button"
                className="card trow"
                onClick={() => handleAction(`track:${track.id}`)}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="k">Part of your journey</span>
                  <span className="h3 block mt-1">{track.n}</span>
                </span>
                <LivIcon name="chev" size={18} />
              </button>

              <div className="split">
                <div className="card stat">
                  <span className="k">Day-90 target</span>
                  <span className="num text-[28px]">{m.t || "Hold"}</span>
                </div>
                <div className="card stat">
                  <span className="k">Re-test</span>
                  <span className="num text-[28px]">
                    {retestDate.toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </span>
                </div>
              </div>

              <LivButton
                variant="primary"
                onClick={() => handleAction("newbook:doc")}
              >
                Book a review with Dr. Deshmukh
              </LivButton>
              <LivButton
                variant="ghost"
                onClick={() => handleAction(`askliv:${m.n}`)}
              >
                <LivIcon name="spark" size={18} />
                <span>Ask Liv about this</span>
              </LivButton>

              <div style={{ height: "40px", flexShrink: 0 }} />
            </div>
          );
        })()}

        {/* ─── 8. JOURNEY / TRACK DETAIL VIEW ─── */}
        {currentView === "track" && (() => {
          const t = getTrackById(selectedTrackId) || JOURNEY_TRACKS[0];
          const pk = CARE_PACKAGES[t.id];

          return (
            <div className="scroll touch-pan-y overscroll-contain flex-1 min-h-0">
              <div className="hd">
                <button
                  type="button"
                  className="icb"
                  onClick={() => handleAction("back")}
                >
                  <LivIcon name="back" size={20} />
                </button>
                <span className="k">Journey · 3 of {t.steps.length} steps done</span>
                <span style={{ width: "44px" }} />
              </div>

              <div>
                <h1 className="h1">{t.n}</h1>
                <p className="sub text-[14.5px] mt-2">{t.find}</p>
              </div>

              <div className="prog">
                <i style={{ width: "45%" }} />
              </div>

              <span className="k mt-2">What your report shows</span>
              <div className="mk">
                {t.mk.map((id) => {
                  const m = getMarkerById(id);
                  if (!m) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleAction(`marker:${id}`)}
                    >
                      {m.n}
                      <b>{m.v}</b>
                      <i>{m.s.toUpperCase()}</i>
                    </button>
                  );
                })}
              </div>

              <div className="card">
                <span className="k">Daily guidelines</span>
                <div>
                  {t.guide.map((g, i) => (
                    <div key={i} className="gl">
                      <b>{i + 1}</b>
                      <span>{g}</span>
                    </div>
                  ))}
                </div>
              </div>

              <span className="k mt-2">Your journey to Day 90</span>
              <div className="card">
                <div className="tl">
                  {t.steps.map((s, i) => {
                    const stepKey = `${t.id}:${i}`;
                    const isDone = i < 2 || !!completedSteps[stepKey];
                    const isNow = i === 2 && !completedSteps[stepKey];

                    return (
                      <div
                        key={i}
                        className={`ts ${isDone ? "done" : isNow ? "now" : "up"}`}
                      >
                        <span className="nd">
                          {isDone && <LivIcon name="check" size={14} strokeWidth={2.4} />}
                        </span>
                        <div className="bd">
                          <span className="meta">
                            <span className="k">{s.when}</span>
                            <span className="tagx">{s.tag}</span>
                          </span>
                          <span className="h3">{s.t}</span>
                          <span className="sub">{completedSteps[stepKey]?.b ? `Booked for ${completedSteps[stepKey].b}.` : s.d}</span>
                          {isNow && s.cta && (
                            <span className="acts">
                              <button
                                type="button"
                                className="btn sm"
                                onClick={() => {
                                  setBookingForm({
                                    type: s.cta![1].startsWith("svc:") ? "svc" : s.cta![1],
                                    svc: s.cta![1].startsWith("svc:") ? s.cta![1].slice(4) : undefined,
                                    day: null,
                                    slot: null,
                                    stepKey,
                                  });
                                  setCurrentView("book");
                                }}
                              >
                                {s.cta[0]}
                              </button>
                              <button
                                type="button"
                                className="btn sm ghost"
                                onClick={(e) => {
                                  setCompletedSteps((prev) => ({ ...prev, [stepKey]: true }));
                                  awardPoints(20, "Step completed", e);
                                }}
                              >
                                Mark done
                              </button>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card">
                <span className="k">Target on Day 90</span>
                <p className="font-serif font-medium text-[21px] leading-tight m-0">{t.goal}</p>
              </div>

              <span className="k mt-2">The care package for this journey</span>
              <button
                type="button"
                className="card trow"
                onClick={() => handleAction(`sheet:pkg:${t.id}`)}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="h3 block text-[16px]">{pk.n}</span>
                  <span className="sub block">
                    {pk.inc.length} inclusions · {pk.len}
                    {requestedPackages[t.id] ? " · requested" : ""}
                  </span>
                </span>
                <LivIcon name="chev" size={18} />
              </button>

              <div style={{ height: "40px", flexShrink: 0 }} />
            </div>
          );
        })()}

        {/* ─── 9. FULL 18-CHAPTER SNAP REPORT VIEWER ─── */}
        {currentView === "report" && (
          <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
            {/* Report Header */}
            <div className="rhead" id="rhead">
              <button
                type="button"
                className="icb"
                onClick={() => handleAction("back")}
                aria-label="Back"
              >
                <LivIcon name="back" size={20} />
              </button>
              <span className="ttl" id="rttl">Longevity report · 18 chapters</span>
              <button
                type="button"
                className="icb"
                onClick={() => toast.success("A PDF copy of your report is ready in your downloads.")}
                aria-label="Download PDF"
              >
                <LivIcon name="down" size={18} />
              </button>
            </div>

            {/* Vertical Snap Scrolling Container */}
            <div ref={rptRef} className="scroll rpt flex-1 min-h-0 touch-pan-y overscroll-contain">
              {/* 1. Cover */}
              <section className="ch inv text-center items-center">
                <LivMark size={80} />
                <div>
                  <span className="k">The Living Lab · by Aaroogya AI</span>
                  <h1 className="h1 mt-3">Your Longevity Report</h1>
                </div>
                <div>
                  <span className="k">Biological age</span>
                  <div className="big">45.8</div>
                </div>
                <div className="facts grid grid-cols-2 gap-3 w-full text-left pt-3.5 border-t border-[var(--liv-inv-line)]">
                  <div>
                    <span className="k">Prepared for</span>
                    <br />
                    {fullName}
                  </div>
                  <div>
                    <span className="k">Assessment date</span>
                    <br />
                    18 September 2026
                  </div>
                  <div>
                    <span className="k">Centre</span>
                    <br />
                    Aaroogya AI Centre · Aundh, Pune
                  </div>
                  <div>
                    <span className="k">Member ID</span>
                    <br />
                    LL-PNE-0247
                  </div>
                </div>
                <span className="sub italic">Innovating Wellness. Elevating Human Well-being.</span>
                <button
                  type="button"
                  className="expl"
                  onClick={() => handleAction("explain:0")}
                >
                  <LivIcon name="spark" size={16} />
                  <span>Liv, walk me through this</span>
                </button>
              </section>

              {/* 2. Welcome */}
              <section className="ch">
                <span className="k">Welcome</span>
                <h1 className="h1">{fullName.split(" ")[0]}, this is the beginning of your longevity story.</h1>
                <p className="lead">
                  In one visit, your kiosk captured 300+ measurements and listened to 100+ data points in your own words. This report turns all of it into one clear picture, and one clear plan.
                </p>
                <div className="card space-y-2">
                  <span className="k">How to read this report</span>
                  <div className="flex items-center gap-2">
                    <span className="pill o">● Optimal</span>
                    <span className="sub">In the longevity-optimal zone. Protect it.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="pill b">◆ Borderline</span>
                    <span className="sub">Fine clinically, but drifting. Early, easy wins live here.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="pill p">▲ Priority</span>
                    <span className="sub">Your biggest opportunities, each paired with a plan.</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="expl"
                  onClick={() => handleAction("explain:1")}
                >
                  <LivIcon name="spark" size={16} />
                  <span>Explain this in plain words</span>
                </button>
              </section>

              {/* 3. How we read you */}
              <section className="ch">
                <span className="k">How we read you</span>
                <h1 className="h1">One visit. Your whole body, listened to.</h1>
                <div className="find space-y-2">
                  {[
                    ["Brain and nervous system", "EEG in 3 states · reaction · focus"],
                    ["Eyes and ears", "acuity · pressure · retina · audiometry"],
                    ["Heart and arteries", "ApoB · BP · ECG rhythm"],
                    ["Lungs and breath", "spirometry · lung age"],
                    ["Blood and metabolic", "60+ markers · HbA1c · insulin"],
                    ["Body and strength", "grip · VO₂max · posture · composition"],
                  ].map(([head, sub], i) => (
                    <div key={i} className="flex gap-2.5">
                      <i className="o" />
                      <span>
                        <b>{head}</b>
                        <br />
                        {sub}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="expl"
                  onClick={() => handleAction("explain:2")}
                >
                  <LivIcon name="spark" size={16} />
                  <span>Explain this in plain words</span>
                </button>
              </section>

              {/* 4. Your headline */}
              <section className="ch">
                <span className="k">Your headline</span>
                <h1 className="h1">Your body is 45.8 years old. You get to change that.</h1>
                <div className="split">
                  <div>
                    <span className="k">Vitality score</span>
                    <div className="num text-[40px]">69 <span className="unit text-[14px]">/ 100</span></div>
                  </div>
                  <div>
                    <span className="k">Your opportunity</span>
                    <div className="num text-[40px]">+3.8 <span className="unit text-[14px]">years</span></div>
                  </div>
                </div>
                <span className="k">What's adding and subtracting years</span>
                <div>
                  {YEARS_CONTRIBUTORS.map(([factor, deltaVal], i) => (
                    <div key={i} className="yr py-2">
                      <span className="n text-[14px]">
                        {factor}
                        {deltaVal > 0 && (
                          <i style={{ width: `${(deltaVal / 1.4) * 100}%`, marginTop: "5px" }} />
                        )}
                      </span>
                      <span className="v text-[18px]">
                        {deltaVal > 0 ? "+" : "−"}
                        {Math.abs(deltaVal).toFixed(1)} y
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="expl"
                  onClick={() => handleAction("explain:3")}
                >
                  <LivIcon name="spark" size={16} />
                  <span>Explain this in plain words</span>
                </button>
              </section>

              {/* 5. Priorities */}
              <section className="ch">
                <span className="k">Your plan, distilled</span>
                <h1 className="h1">Three priorities. Ninety days. Everything else follows.</h1>
                <div>
                  {PRIORITIES.map((p, i) => (
                    <div key={i} className="prio">
                      <span className="num text-[36px]">{i + 1}</span>
                      <div>
                        <div className="h3 text-[16px]">{p.t}</div>
                        <p className="sub mt-1"><b>The signal:</b> {p.sig}</p>
                        <p className="sub mt-1"><b>Your move:</b> {p.move}</p>
                        <p className="sub mt-1"><b>Day-90 target:</b> {p.tar}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="expl"
                  onClick={() => handleAction("explain:4")}
                >
                  <LivIcon name="spark" size={16} />
                  <span>Explain this in plain words</span>
                </button>
              </section>

              {/* 6. Systems Overview */}
              <section className="ch">
                <span className="k">The full picture</span>
                <h1 className="h1">Eight systems, one glance.</h1>
                <div className="sysg">
                  {CHAPTER_SYSTEM_MAP.map(([, , name, score], i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        const target = rptRef.current?.children[i + 6] as HTMLElement;
                        if (target) target.scrollIntoView({ behavior: "smooth" });
                      }}
                      className={i === 2 ? "top" : ""}
                    >
                      <span className="num text-[28px]">{score}</span>
                      <small className="block mt-1">{name}</small>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="expl"
                  onClick={() => handleAction("explain:5")}
                >
                  <LivIcon name="spark" size={16} />
                  <span>Explain this in plain words</span>
                </button>
              </section>

              {/* 7-14: System Chapters */}
              {CHAPTER_SYSTEM_MAP.map(([sysKey, summary, sysTitle, sysScore], idx) => {
                const markers = BIOMARKERS.filter((m) => m.g === sysKey);
                return (
                  <section key={sysKey} className="ch">
                    <div className="hd items-start">
                      <span className="k">System detail · {sysTitle}</span>
                      <span className="num text-[26px]">
                        {sysScore}<small className="unit">/100</small>
                      </span>
                    </div>
                    <h1 className="h1 text-[26px]">{summary}</h1>

                    <div>
                      {markers.map((m) => {
                        const span = (m.max || 100) - (m.min || 0);
                        const l = Math.max(3, Math.min(97, ((m.x - (m.min || 0)) / (span || 1)) * 100));
                        return (
                          <div key={m.id} className="prow">
                            <span className="n">
                              {m.n}
                              <small>{m.nobar ? m.opt : `Optimal ${m.opt} · clinical ${m.clin}`}</small>
                            </span>
                            <span className="v">
                              {m.v} <small>{m.u.split(" · ")[0].split(" ")[0]}</small>
                            </span>
                            <span className={`pill ${m.s}`}>
                              {m.s === "p" ? "▲ Priority" : m.s === "b" ? "◆ Borderline" : "● Optimal"}
                            </span>
                            {!m.nobar && (
                              <div className="rb">
                                <b style={{ left: `${l.toFixed(1)}%` }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {sysKey === "body" && (
                      <div className="card space-y-2">
                        <span className="k">Body measurements · Tape-measure truth</span>
                        <div className="tape">
                          {TAPE_MEASUREMENTS.map(([lbl, val, target], ti) => (
                            <div key={ti}>
                              {lbl}
                              <b>{val}</b>
                              target {target}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      className="expl"
                      onClick={() => handleAction(`explain:${idx + 6}`)}
                    >
                      <LivIcon name="spark" size={16} />
                      <span>Explain this in plain words</span>
                    </button>
                  </section>
                );
              })}

              {/* 15. Treatment Journey */}
              <section className="ch">
                <span className="k">Your treatment journey</span>
                <h1 className="h1">Measure. Train. Recover. Re-measure, and prove it.</h1>
                <div>
                  {THERAPIES.map(([name, freq, tags], i) => (
                    <div key={i} className="prow">
                      <span className="n">
                        {name}
                        <small>{freq}</small>
                      </span>
                      <span className="unit text-right" style={{ gridColumn: "2 / -1" }}>
                        {tags}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="expl"
                  onClick={() => handleAction("explain:14")}
                >
                  <LivIcon name="spark" size={16} />
                  <span>Explain this in plain words</span>
                </button>
              </section>

              {/* 16. Targets & Trajectory */}
              <section className="ch">
                <span className="k">Your next {planDays} days</span>
                <h1 className="h1">The plan, week by week.</h1>
                <table className="tt">
                  <thead>
                    <tr>
                      <td className="k" style={{ border: "none" }}>Measure</td>
                      <td className="k" style={{ border: "none" }}>Today</td>
                      <td className="k" style={{ border: "none" }}>Day 90</td>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Biological age", "45.8", "≤ 45.0"],
                      ["HbA1c", "5.9%", "≤ 5.7%"],
                      ["ApoB", "102", "< 90"],
                      ["Grip strength", "24 kg", "27 kg"],
                      ["Vitamin D", "16", "> 40"],
                      ["Sleep (avg)", "6 h 10 m", "7 h +"],
                      ["Waist", "88 cm", "≤ 85 cm"],
                    ].map(([m, c, t], i) => (
                      <tr key={i}>
                        <td>{m}</td>
                        <td>{c}</td>
                        <td>{t}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <button
                  type="button"
                  className="expl"
                  onClick={() => handleAction("explain:15")}
                >
                  <LivIcon name="spark" size={16} />
                  <span>Explain this in plain words</span>
                </button>
              </section>

              {/* 17. Fine Print & Sign-Off */}
              <section className="ch inv">
                <span className="k">Methods, rights and sign-off</span>
                <h1 className="h1">The fine print, in plain language.</h1>
                <p className="sub">
                  <b>How your numbers were made:</b> biological age from a PhenoAge-class model on nine routine biomarkers, ±2 years. NABL-accredited labs, validated body composition, 14-day wearable averages.
                </p>
                <p className="sub">
                  <b>Your data, your rules:</b> processed with consent under the DPDP Act 2023, stored encrypted in India, ABDM-ready, never sold. Access, correct, export or erase at any time.
                </p>
                <div className="sig text-[30px] font-serif italic mt-2">Dr. A. Deshmukh</div>
                <span className="sub">MBBS, MD (Medicine) · reviewed and signed 18 Sep 2026</span>

                <h1 className="h1 text-[26px] mt-3">
                  Your next chapter is booked: {retestDate.toLocaleDateString()}, 9:00 AM.
                </h1>
                <p className="lead italic">We'll measure again, and watch the gap close.</p>

                <div className="space-y-2 w-full pt-3">
                  <LivButton
                    variant="primary"
                    onClick={() => {
                      setCurrentView("main");
                      setActiveTab("plan");
                    }}
                  >
                    Open my care plan
                  </LivButton>
                  <LivButton
                    variant="ghost"
                    onClick={() => toast.success("A secure link to your report is ready to send.")}
                  >
                    Share with a doctor
                  </LivButton>
                </div>
              </section>
            </div>

            {/* Vertical Dots */}
            <div className="dotsv" id="rdots">
              {REPORT_CHAPTERS.map((title, i) => (
                <button
                  key={i}
                  type="button"
                  title={title}
                  onClick={() => {
                    const target = rptRef.current?.children[i] as HTMLElement;
                    if (target) target.scrollIntoView({ behavior: "smooth" });
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ─── 10. APPOINTMENT BOOKING SCREEN (vBook & vBooked) ─── */}
        {currentView === "book" && (
          <div className="scroll touch-pan-y overscroll-contain flex-1 min-h-0">
            <div className="hd">
              <button
                type="button"
                className="icb"
                onClick={() => handleAction("bookback")}
              >
                <LivIcon name="back" size={20} />
              </button>
              <span className="k">Book an appointment</span>
              <span style={{ width: "44px" }} />
            </div>

            <h1 className="h1">
              {bookingForm.type === "svc" && bookingForm.svc
                ? getTreatmentById(bookingForm.svc)?.n
                : "Choose a visit type"}
            </h1>

            {bookingForm.type !== "svc" ? (
              <div className="space-y-2">
                {Object.entries(VISIT_TYPES).map(([key, [title, subtitle]]) => (
                  <button
                    key={key}
                    type="button"
                    className={`opt ${bookingForm.type === key ? "on" : ""}`}
                    onClick={() => handleAction(`btype:${key}`)}
                  >
                    <div>
                      <div className="h3">{title}</div>
                      <div className="sub">{subtitle}</div>
                    </div>
                    <span className={`box ${bookingForm.type === key ? "on" : ""}`}>
                      <LivIcon name="check" size={14} strokeWidth={2.4} />
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="card inv">
                <span className="k">{bookingForm.pack === 1 ? "Single session" : `Pack of ${bookingForm.pack || 1}`}</span>
                <span className="h3 text-[17px]">{getTreatmentById(bookingForm.svc!)?.n}</span>
                <span className="sub">{getTreatmentById(bookingForm.svc!)?.d}</span>
              </div>
            )}

            {/* Day Selector */}
            <span className="k mt-3">Pick a day</span>
            <div className="chips">
              {Array.from({ length: 7 }).map((_, i) => {
                const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i + 1);
                return (
                  <button
                    key={i}
                    type="button"
                    className={`chip ${bookingForm.day === i ? "on" : ""}`}
                    onClick={() => handleAction(`bday:${i}`)}
                  >
                    {d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
                  </button>
                );
              })}
            </div>

            {/* Time Slot Picker */}
            {bookingForm.day !== null && (
              <>
                <span className="k mt-3">Pick a time</span>
                <div className="slots">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      className={`chip ${bookingForm.slot === slot ? "on" : ""}`}
                      onClick={() => handleAction(`bslot:${slot}`)}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="flex-1 min-h-[20px]" />
            <LivButton
              variant="primary"
              disabled={bookingForm.day === null || !bookingForm.slot}
              onClick={() => handleAction("confirm")}
            >
              {bookingForm.day !== null && bookingForm.slot
                ? `Confirm Booking · ${bookingForm.slot}`
                : "Pick day and time"}
            </LivButton>
          </div>
        )}

        {/* Booking Done Screen */}
        {currentView === "booked" && (
          <div className="center scroll flex-1 min-h-0 flex flex-col items-center justify-center p-6 text-center">
            <div className="done-mark mb-3">
              <LivIcon name="check" size={40} strokeWidth={2} />
            </div>
            <h1 className="h1">Visit booked</h1>
            <p className="sub mt-2">
              {appointments[appointments.length - 1]?.t}
              <br />
              {appointments[appointments.length - 1]?.d.toLocaleDateString(undefined, {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}{" "}
              at {appointments[appointments.length - 1]?.h}
              <br />
              {appointments[appointments.length - 1]?.w}
            </p>
            <p className="sub text-[13px] mt-2">Liv will remind you the day before.</p>

            <div className="w-full space-y-2 mt-6">
              <LivButton
                variant="primary"
                onClick={() => {
                  setCurrentView("main");
                  setActiveTab("care");
                }}
              >
                See my visits
              </LivButton>
              <LivButton
                variant="ghost"
                onClick={() => {
                  setCurrentView("main");
                  setActiveTab("home");
                }}
              >
                Back to Home
              </LivButton>
            </div>
          </div>
        )}

        {/* ─── 11. BOTTOM SHEETS & MODALS ─── */}
        {activeSheet && (
          <div
            className="scrim"
            onClick={(e) => {
              if (e.target === e.currentTarget) setActiveSheet(null);
            }}
          >
            <div
              className="sheet"
              role="dialog"
              aria-modal="true"
              style={activeSheet === "liv" ? { height: "88%" } : undefined}
            >
              <span className="grab" />

              {/* LIV AI CHAT SHEET */}
              {activeSheet === "liv" && (
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="hd px-5 pt-3 pb-2 border-b border-[var(--liv-line)]">
                    <div>
                      <span className="k">Your AI companion</span>
                      <h2 className="h2 text-[22px]">Liv</h2>
                    </div>
                    <button
                      type="button"
                      className="icb"
                      onClick={() => setActiveSheet(null)}
                    >
                      <LivIcon name="x" size={18} />
                    </button>
                  </div>

                  <div className="scroll flex-1 min-h-0 p-4 space-y-3" id="livlog">
                    <div className="bub liv">
                      Hi {fullName.split(" ")[0]}. Ask me about your results, your plan, or your next visit.
                    </div>

                    {chatMessages.map((m, i) => (
                      <div
                        key={i}
                        className={`bub ${m.sender === "me" ? "me" : "liv"}`}
                      >
                        {m.isClinicalInsight && (
                          <div className="mb-1">
                            <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 rounded px-1.5 py-0.5">
                              ● Clinical Insight · Dr. Deshmukh
                            </span>
                          </div>
                        )}
                        {m.isLiveAi && (
                          <div className="mb-1">
                            <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-sky-400 bg-sky-950/40 border border-sky-800/40 rounded px-1.5 py-0.5">
                              ✦ Live AI Companion
                            </span>
                          </div>
                        )}
                        {m.isError && (
                          <div className="mb-1">
                            <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-rose-400 bg-rose-950/40 border border-rose-800/40 rounded px-1.5 py-0.5">
                              ! Notice
                            </span>
                          </div>
                        )}
                        {m.html ? (
                          <div dangerouslySetInnerHTML={{ __html: m.html }} />
                        ) : (
                          m.text
                        )}
                        {m.cta && (
                          <div className="cta">
                            {m.cta.map(([lbl, act], ci) => (
                              <button
                                key={ci}
                                type="button"
                                className={ci === 0 ? "p" : ""}
                                onClick={() => handleAction(act)}
                              >
                                {lbl}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Live AI typing indicator */}
                    {isAiTyping && (
                      <div className="bub liv flex items-center gap-1 py-3 px-4">
                        <span className="typing">
                          <i />
                          <i />
                          <i />
                        </span>
                      </div>
                    )}

                    {/* Quick suggestion chips */}
                    {!chatMessages.length && (
                      <div className="sugs pt-2">
                        {[
                          "Show my care plan",
                          "Explain my report in plain words",
                          "What do I do today?",
                          "Why is my biological age 45.8?",
                          "How do I lower my HbA1c?",
                          "When is my next session?",
                        ].map((prompt, pi) => (
                          <button
                            key={pi}
                            type="button"
                            className="chip"
                            onClick={() => sendLivChatMessage(prompt)}
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 p-3 border-t border-[var(--liv-line)]">
                    <input
                      className="inp"
                      placeholder="Ask about your health..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          sendLivChatMessage(chatInput);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="icb size-12 rounded-2xl shrink-0"
                      onClick={() => sendLivChatMessage(chatInput)}
                    >
                      <LivIcon name="send" size={20} />
                    </button>
                  </div>
                </div>
              )}

              {/* SCORE BREAKDOWN SHEET */}
              {activeSheet === "score" && (
                <div className="scroll p-5 space-y-4">
                  <div>
                    <span className="k">AIWS score · 69 of 100</span>
                    <h2 className="h2 text-[24px] mt-1">Eight systems, one number</h2>
                    <p className="sub mt-1">
                      Each system is scored against longevity-optimal ranges for your profile. 100 means every marker is optimal.
                    </p>
                  </div>
                  <div className="bars space-y-2">
                    {SYSTEM_SCORES.map(([sysName, score], idx) => (
                      <div key={idx} className="bar">
                        <span>{sysName}</span>
                        <span>
                          <i style={{ width: `${score}%` }} />
                        </span>
                        <span>{score}</span>
                      </div>
                    ))}
                  </div>
                  <LivButton variant="primary" onClick={() => setCurrentView("report")}>
                    View full longevity report
                  </LivButton>
                </div>
              )}

              {/* BIOLOGICAL AGE SHEET */}
              {activeSheet === "age" && (
                <div className="scroll p-5 space-y-4">
                  <div>
                    <span className="k">Biological age · Calendar age {age}</span>
                    <h2 className="h2 text-[24px] mt-1">
                      Your body is 45.8 years old. You get to change that.
                    </h2>
                    <p className="sub mt-1">
                      An estimate from nine routine blood biomarkers, with a margin of about two years.
                    </p>
                  </div>

                  <span className="k">What adds and subtracts years</span>
                  <div className="bars space-y-2">
                    {YEARS_CONTRIBUTORS.map(([name, deltaVal], i) => (
                      <div key={i} className="bar">
                        <span>{name}</span>
                        <span>
                          <i
                            className={deltaVal < 0 ? "neg" : ""}
                            style={{ width: `${Math.max(6, (Math.abs(deltaVal) / 1.4) * 100)}%` }}
                          />
                        </span>
                        <span>{deltaVal > 0 ? `+${deltaVal.toFixed(1)}y` : `${deltaVal.toFixed(1)}y`}</span>
                      </div>
                    ))}
                  </div>

                  <LivButton variant="primary" onClick={() => setCurrentView("report")}>
                    Read full report analysis
                  </LivButton>
                </div>
              )}

              {/* APPOINTMENT DETAIL SHEET */}
              {activeSheet.startsWith("appt:") && (() => {
                const id = parseInt(activeSheet.split(":")[1], 10);
                const appt = appointments.find((a) => a.id === id);
                if (!appt) return null;
                return (
                  <div className="scroll p-5 space-y-4">
                    <div>
                      <span className="k">
                        {appt.d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}
                      </span>
                      <h2 className="h2 text-[24px] mt-1">{appt.t}</h2>
                      <p className="sub mt-1">
                        {appt.h} · {appt.w}
                      </p>
                    </div>

                    {appt.status && (
                      <div className="card space-y-1">
                        <span className={`stat-pill ${appt.status === "pending" ? "wait" : "ok"}`}>
                          <i />
                          {appt.status === "pending"
                            ? "Awaiting Dr. Deshmukh's sign-off"
                            : "Approved by Dr. Deshmukh"}
                        </span>
                        <p className="sub text-[12px]">
                          {appt.status === "pending"
                            ? "Held until Dr. Deshmukh confirms against your latest labs."
                            : "Confirmed. Please arrive 10 minutes prior."}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2 pt-2">
                      <LivButton
                        variant="primary"
                        onClick={() => {
                          setBookingForm({ type: "doc", day: null, slot: null });
                          setCurrentView("book");
                          setActiveSheet(null);
                        }}
                      >
                        Reschedule visit
                      </LivButton>
                      {!appt.fixed && (
                        <LivButton
                          variant="ghost"
                          onClick={() => {
                            setAppointments((prev) => prev.filter((a) => a.id !== id));
                            setActiveSheet(null);
                            toast.success("Visit cancelled");
                          }}
                        >
                          Cancel appointment
                        </LivButton>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* PROFILE & SETTINGS SHEET */}
              {activeSheet === "profile" && (
                <div className="scroll p-5 space-y-4">
                  <div className="hd justify-start gap-3">
                    <span className="date size-14 rounded-full">
                      <b className="text-[20px]">{fullName.charAt(0)}</b>
                    </span>
                    <div>
                      <h2 className="h2 text-[22px]">{fullName}</h2>
                      <p className="sub text-[12px]">
                        {session && patient?.patient_id
                          ? `Patient #${patient.patient_id} · Pune Living Lab`
                          : session
                            ? `Connected Account · Pune Living Lab`
                            : `Reference Baseline (Kaveri Bhosle) · Member LL-PNE-0247`}
                      </p>
                    </div>
                  </div>

                  <div className="field">
                    <label>Appearance Theme</label>
                    <LivSegmented
                      value={appTheme}
                      onChange={(t) => setAppTheme(t as any)}
                      options={[
                        { id: "dark", label: "Black Mode" },
                        { id: "light", label: "White Mode" },
                      ]}
                    />
                  </div>

                  <div className="field">
                    <label>Programme Length</label>
                    <LivSegmented
                      value={String(planDays)}
                      onChange={(val) => setPlanDays(parseInt(val, 10))}
                      options={[
                        { id: "90", label: "90 days" },
                        { id: "160", label: "160 days" },
                        { id: "180", label: "180 days" },
                      ]}
                    />
                  </div>

                  <span className="k">DPDP Privacy & Consents</span>
                  <div className="card p-0" style={{ gap: 0 }}>
                    {[
                      { key: "capture", title: "Kiosk measurement capture", desc: "Biomarkers and Liv dialogue data" },
                      { key: "share", title: "Share with Dr. Deshmukh", desc: "Allows clinical reviews of your lab data" },
                      { key: "remind", title: "Appointment & re-test reminders", desc: "SMS and WhatsApp reminders" },
                    ].map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        className="sw px-4 py-3"
                        onClick={() => handleAction(`consent2:${c.key}`)}
                      >
                        <span className="t">
                          {c.title}
                          <small>{c.desc}</small>
                        </span>
                        <span className={`tog ${userConsents[c.key] ? "on" : ""}`} />
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2 pt-2">
                    <LivButton
                      variant="primary"
                      onClick={() => navigate({ to: "/home" })}
                    >
                      Exit to Aaha Consumer App
                    </LivButton>
                    <LivButton
                      variant="ghost"
                      onClick={() => handleAction("signout")}
                    >
                      Sign Out
                    </LivButton>
                  </div>
                </div>
              )}

              {/* TREATMENT SERVICE SHEET */}
              {activeSheet.startsWith("svc:") && (() => {
                const svcId = activeSheet.split(":")[1];
                const service = getTreatmentById(svcId);
                if (!service) return null;

                return (
                  <div className="scroll p-5 space-y-4">
                    <div>
                      <span className="k">{service.cat.toUpperCase()} · Treatment</span>
                      <h2 className="h2 text-[24px] mt-1">{service.n}</h2>
                      <p className="sub mt-1">{service.d}</p>
                    </div>

                    <p className="font-serif text-[17px] leading-relaxed">{service.s}</p>

                    {service.rec && (
                      <div className="card inv p-4 space-y-1">
                        <span className="k">Why Dr. Deshmukh recommends it</span>
                        <p className="text-[14px]">{service.rec}</p>
                      </div>
                    )}

                    <span className="k">Choose Sessions Pack</span>
                    <div className="packs">
                      {service.packs.map((count) => (
                        <button
                          key={count}
                          type="button"
                          className="pack"
                          onClick={() => {
                            setBookingForm({
                              type: "svc",
                              svc: service.id,
                              pack: count,
                              day: null,
                              slot: null,
                            });
                            setCurrentView("book");
                            setActiveSheet(null);
                          }}
                        >
                          <b>{count}</b>
                          <span>{count === 1 ? "single session" : "sessions pack"}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* CARE PACKAGE SHEET */}
              {activeSheet.startsWith("pkg:") && (() => {
                const pkgId = activeSheet.split(":")[1];
                const pkg = CARE_PACKAGES[pkgId];
                if (!pkg) return null;
                const isRequested = !!requestedPackages[pkgId];

                return (
                  <div className="scroll p-5 space-y-4">
                    <div>
                      <span className="k">Care package · {pkg.len}</span>
                      <h2 className="h2 text-[24px] mt-1">{pkg.n}</h2>
                      <p className="sub mt-1">{pkg.f}</p>
                    </div>

                    <div className="card space-y-2 p-4">
                      {pkg.inc.map((item, idx) => (
                        <div key={idx} className="gl">
                          <span className="box on size-5 rounded-full shrink-0 flex items-center justify-center">
                            <LivIcon name="check" size={12} strokeWidth={2.4} />
                          </span>
                          <span className="text-[14px]">{item}</span>
                        </div>
                      ))}
                    </div>

                    <LivButton
                      variant="primary"
                      disabled={isRequested}
                      onClick={() => handleAction(`pkgreq:${pkgId}`)}
                    >
                      {isRequested ? "Requested · Centre will contact you" : "Request this package"}
                    </LivButton>
                  </div>
                );
              })()}

              {/* BADGE CELEBRATION MODAL */}
              {activeSheet.startsWith("badge:") && (() => {
                const badgeKey = activeSheet.split(":")[1];
                const b = BADGE_DEFINITIONS[badgeKey];
                if (!b) return null;

                return (
                  <div className="scroll badge-hero p-6 space-y-4 text-center">
                    <span className="big mx-auto">
                      <LivIcon name="flame" size={44} strokeWidth={2.2} />
                    </span>
                    <div>
                      <span className="k">Badge details</span>
                      <h2 className="h2 text-[28px] mt-1">{b[0]}</h2>
                      <p className="sub mt-2">{b[1]}</p>
                    </div>
                    <LivButton variant="primary" onClick={() => setActiveSheet(null)}>
                      Continue
                    </LivButton>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </LivScope>
  );
}

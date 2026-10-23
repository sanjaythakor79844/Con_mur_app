import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo, type FormEvent } from "react";
import { toast as sonnerToast } from "sonner";
import {
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useOverview } from "@/hooks/use-overview";
import { useI18n } from "@/lib/i18n";
import { getUserProfile } from "@/lib/user-profile";
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
  BADGE_DEFINITIONS,
  REPORT_CHAPTERS,
  DEFAULT_HABITS,
  TIME_SLOTS,
  getEcgPath,
  getMarkerById,
  getTrackById,
  getTrackForMarker,
  getTreatmentById,
  type Biomarker,
  type JourneyTrack,
} from "@/lib/liv-data";

export const Route = createFileRoute("/liv")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    view?:
      | "splash"
      | "signup"
      | "signin"
      | "welcome"
      | "main"
      | "marker"
      | "track"
      | "report"
      | "book"
      | "booked"
      | "analyzing";
    tab?: "home" | "markers" | "plan" | "care";
    marker?: string;
    track?: string;
    filter?: string;
    state?: "empty" | "full";
  } => {
    return {
      view: typeof search.view === "string" ? (search.view as any) : undefined,
      tab: typeof search.tab === "string" ? (search.tab as any) : undefined,
      marker: typeof search.marker === "string" ? search.marker : undefined,
      track: typeof search.track === "string" ? search.track : undefined,
      filter: typeof search.filter === "string" ? search.filter : undefined,
      state: typeof search.state === "string" ? (search.state as any) : undefined,
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

// ─── 4-Part Story Data (Matches prototype lines 493-502) ────────────────────────
const STORIES = [
  {
    h: "It starts at the Living Lab kiosk.",
    p: "One screening reads your blood, heart and body. Your longevity report arrives here by itself.",
    visual: "pulse",
  },
  {
    h: "Normal is not the same as optimal.",
    p: "Clinical ranges show where illness begins. Optimal ranges show where healthspan is built.",
    visual: "range",
  },
  {
    h: "One number to follow: your AIWS score.",
    p: "Blood, body, sleep and lifestyle in a single score out of 100.",
    visual: "ring",
  },
  {
    h: "Measure. Act. Re-measure.",
    p: "A 90-day plan, a care team and Liv by your side until your next kiosk visit.",
    visual: "path",
  },
];

interface AppointmentItem {
  id: number;
  t: string;
  w: string;
  d: Date;
  h: string;
  fixed?: boolean;
  status?: "pending" | "ok";
  past?: boolean;
  svc?: string;
}

const VISIT_TYPES_MAP: Record<string, [string, string]> = {
  doc: ["Physician review", "Dr. A. Deshmukh · 20 min"],
  coach: ["Coach session", "Ritu S. · 30 min"],
  pod: ["Kiosk screening", "Living Lab kiosk at the centre · 30 min"],
  thx: ["Nutrition session", "Protein and iron-rich food plan · 30 min"],
  ther: [
    "Therapy session",
    "Sauna, light, HydraFacial, HBOT or drip · at the centre",
  ],
};

const LIV_PRESET_QUESTIONS: [string, string | (() => string)][] = [
  [
    "Why is my biological age 45.8?",
    "It is an estimate from nine blood biomarkers plus your age, with a margin of about two years. Blood sugar, ApoB, strength and two missing nutrients add roughly 3.8 years. All four can move.",
  ],
  [
    "What should I focus on first?",
    "Strength. Three 45-minute sessions a week with Coach Ritu, and protein at every meal. It is your biggest lever and the fastest to respond.",
  ],
  [
    "How do I lower my HbA1c?",
    "5.9% is the early-warning band. Walk for 10 minutes after meals, eat dinner earlier and protect a 7-hour night. Your Day-90 target is 5.7% or lower.",
  ],
  [
    "Is my thyroid okay?",
    "Yes. Your TSH is 2.4, inside the optimal 0.5 to 3.5 zone. Vitamin D and iron are the two gaps to refill.",
  ],
  [
    "When is my next appointment?",
    "Coach check-in with Ritu S. is on Thursday at 6:30 PM. Your Day-90 re-measure is on 19 Dec.",
  ],
];

export function LivAppScreen() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { session, user, patient } = useAuth();
  const { latestAssessment } = useOverview();
  const { t } = useI18n();

  // Navigation & Screen View State
  const [currentView, setCurrentView] = useState<
    | "splash"
    | "signup"
    | "signin"
    | "welcome"
    | "main"
    | "marker"
    | "track"
    | "report"
    | "book"
    | "booked"
    | "analyzing"
  >(() => {
    if (search.view) {
      if ((search.view as string) === "story") return "signup";
      return search.view;
    }
    return "splash";
  });

  const [activeTab, setActiveTab] = useState<"home" | "markers" | "plan" | "care">(
    search.tab || "home",
  );
  const [selectedMarkerId, setSelectedMarkerId] = useState<string>(search.marker || "hba1c");
  const [selectedTrackId, setSelectedTrackId] = useState<string>(search.track || "hm");
  const [markerFilter, setMarkerFilter] = useState<string>(search.filter || "all");
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [appTheme, setAppTheme] = useState<"dark" | "light">("dark");
  const [openPri, setOpenPri] = useState<number | null>(null);

  // User & Patient State
  const existingProfile = getUserProfile();
  const [fullName, setFullName] = useState(
    patient?.full_name || existingProfile?.firstName
      ? `${existingProfile?.firstName || ""} ${existingProfile?.lastName || ""}`.trim()
      : "Kaveri Bhosle",
  );
  const [phoneNumber, setPhoneNumber] = useState(
    patient?.mobile_number?.replace("+91", "") || existingProfile?.phoneNumber?.replace("+91", "") || "9876543210",
  );
  const [email, setEmail] = useState("you@example.com");
  const [age, setAge] = useState(patient?.age ? String(patient.age) : "42");
  const [sex, setSex] = useState<"Female" | "Male" | "Other">("Female");
  const [consentGiven, setConsentGiven] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Auth State
  const [authMode, setAuthMode] = useState<"otp" | "google">("otp");
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", ""]);
  const [countdown, setCountdown] = useState(30);
  const [busy, setBusy] = useState(false);
  const [otpErrorShake, setOtpErrorShake] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Story Carousel State
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyPaused, setStoryPaused] = useState(false);

  // App Core State
  const [hasReport, setHasReport] = useState<boolean>(() => {
    if (search.state === "full") return true;
    if (search.state === "empty") return false;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("liv_has_report");
      if (saved === "true") return true;
      if (saved === "false") return false;
    }
    return false;
  });
  const [kioskFound, setKioskFound] = useState(true);
  const [analysisSource, setAnalysisSource] = useState<"kiosk" | "upload">("kiosk");
  const [analysisStep, setAnalysisStep] = useState<number>(0);
  const [analysisFileName, setAnalysisFileName] = useState<string>("Sample lab report");

  // Plan Habits & Points
  const [pts, setPts] = useState<number>(340);
  const [habitsDone, setHabitsDone] = useState<Record<string, boolean>>({
    main: true,
    pro: false,
    sup: true,
    sleep: false,
  });
  const [weeklyProgress, setWeeklyProgress] = useState<Record<string, number>>({
    str: 2,
    walk: 4,
    sup: 5,
    br: 3,
  });
  const [addedActions, setAddedActions] = useState<Record<string, boolean>>({});
  const [earnedBadges, setEarnedBadges] = useState<Record<string, boolean>>({
    first_session: true,
    streak_7: true,
    vitd_start: true,
    sensor_week: true,
    sessions_12: false,
    day_90: false,
  });
  const [requestedPackages, setRequestedPackages] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Appointments
  const [appointments, setAppointments] = useState<AppointmentItem[]>([
    {
      id: 1,
      t: "Coach check-in",
      w: "Ritu S. · video call",
      d: new Date(2026, 9, 29),
      h: "6:30 PM",
    },
    {
      id: 2,
      t: "Day-90 re-measure",
      w: "Living Lab kiosk · Dr. A. Deshmukh",
      d: new Date(2026, 11, 19),
      h: "9:00 AM",
      fixed: true,
    },
    {
      id: 3,
      t: "HydraFacial",
      w: "The Edit · session 1 of 3 · logged by Trupti",
      d: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 8),
      h: "4:00 PM",
      past: true,
      svc: "hf",
    },
  ]);
  const [treatmentCategory, setTreatmentCategory] = useState<string>("skin");
  const [treatmentPacks, setTreatmentPacks] = useState<Record<string, { total: number; left: number }>>({
    hf: { total: 3, left: 2 },
  });
  const [treatmentScreening, setTreatmentScreening] = useState<Record<string, Record<number, boolean>>>({});
  const [bookingForm, setBookingForm] = useState<{
    type: string | null;
    svc?: string | null;
    pack?: number | null;
    day: number | null;
    slot: string | null;
  }>({ type: null, day: null, slot: null });

  // Reset scroll on view or tab transition
  useEffect(() => {
    const scrollEls = document.querySelectorAll("#phone .scroll");
    scrollEls.forEach((el) => {
      el.scrollTop = 0;
    });
  }, [currentView, activeTab]);

  // Chat Log
  const [chatLog, setChatLog] = useState<{ me?: boolean; t: string; wait?: boolean }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [activeReportChapter, setActiveReportChapter] = useState(0);

  // Computed Values
  const firstName = useMemo(() => fullName.trim().split(/\s+/)[0] || "Kaveri", [fullName]);
  const formattedDate = useMemo(() => {
    const now = new Date();
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`;
  }, []);

  const greeting = useMemo(() => {
    const currentHour = new Date().getHours();
    return `${currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening"}, ${firstName}`;
  }, [firstName]);

  const [planLen, setPlanLen] = useState<number>(90);
  const [consentSettings, setConsentSettings] = useState<{
    capture: boolean;
    share: boolean;
    remind: boolean;
  }>({
    capture: true,
    share: true,
    remind: true,
  });

  const dayNumber = 22;
  const streak = 6;

  const planPhases = useMemo(() => {
    return planLen <= 90
      ? ([[14, "Begin"], [56, "Build"], [planLen, "Prove it"]] as [number, string][])
      : ([[14, "Begin"], [56, "Build"], [90, "Prove it"], [Math.round(planLen * 0.75), "Consolidate"], [planLen, "Prove it again"]] as [number, string][]);
  }, [planLen]);

  const planLevel = useMemo(() => {
    for (let i = 0; i < planPhases.length; i++) {
      if (dayNumber <= planPhases[i][0]) return [i + 1, planPhases[i][1]] as [number, string];
    }
    return [planPhases.length, planPhases[planPhases.length - 1][1]] as [number, string];
  }, [dayNumber, planPhases]);

  const milestones = useMemo(() => {
    const list: [string, number, boolean][] = [
      ["Begin", 1, 1 <= dayNumber],
      ["First strength session", 15, 15 <= dayNumber],
      ["Day-30 bloods", 30, 30 <= dayNumber],
      ["12 sessions", 56, 56 <= dayNumber],
      ["Day-90 re-test", 90, 90 <= dayNumber],
    ];
    if (planLen > 90) {
      list.push(
        ["Day-120 review", 120, 120 <= dayNumber],
        ["24 sessions", Math.round(planLen * 0.8), Math.round(planLen * 0.8) <= dayNumber],
        [`Day-${planLen} re-test`, planLen, planLen <= dayNumber]
      );
    }
    return list;
  }, [dayNumber, planLen]);

  // Auto splash advance (Matches prototype line 451: 3 seconds)
  useEffect(() => {
    if (currentView === "splash") {
      const timer = setTimeout(() => {
        setCurrentView("signup");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentView]);

  // Story video progress timer
  useEffect(() => {
    if (currentView !== "signup" || storyPaused) return;
    const interval = setTimeout(() => {
      setStoryIndex((prev) => (prev + 1) % STORIES.length);
    }, 5200);
    return () => clearTimeout(interval);
  }, [currentView, storyIndex, storyPaused]);

  // Analysis simulator timer
  useEffect(() => {
    if (currentView !== "analyzing") return;
    const interval = setInterval(() => {
      setAnalysisStep((prev) => {
        if (prev < 4) return prev + 1;
        clearInterval(interval);
        setHasReport(true);
        if (typeof window !== "undefined") {
          localStorage.setItem("liv_has_report", "true");
        }
        setCurrentView("main");
        setActiveTab("home");
        showToast(
          analysisSource === "kiosk"
            ? "Longevity report fetched. Your score is ready."
            : "Report added. Your score is ready.",
        );
        return prev;
      });
    }, 850);
    return () => clearInterval(interval);
  }, [currentView, analysisSource]);

  // Countdown timer for OTP
  useEffect(() => {
    if (!otpSent || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [otpSent, countdown]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3500);
  };

  const startAnalysis = (source: "kiosk" | "upload" = "kiosk", fileName?: string) => {
    setAnalysisSource(source);
    if (fileName) setAnalysisFileName(fileName);
    setAnalysisStep(0);
    setCurrentView("analyzing");
  };

  const handleSubmitSignup = (e: FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    const ph = phoneNumber.replace(/\D/g, "");
    const ag = parseInt(age, 10);

    if (fullName.trim().length < 2) errors.name = "Enter your full name";
    if (ph.length !== 10) errors.phone = "Enter a 10-digit mobile number";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) errors.email = "Enter an email like name@example.com";
    if (isNaN(ag) || ag < 18 || ag > 110) errors.age = "18 or older";
    if (!consentGiven) errors.ok = "Tick the box to continue";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setBusy(true);
    setStoryPaused(true);
    setTimeout(() => {
      setBusy(false);
      setCurrentView("welcome");
    }, 900);
  };

  const handleSendOtp = () => {
    const ph = phoneNumber.replace(/\D/g, "");
    if (ph.length !== 10) {
      setFormErrors({ phone: "Enter a 10-digit mobile number" });
      return;
    }
    setFormErrors({});
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setOtpSent(true);
      setCountdown(30);
      setOtpDigits(["", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }, 600);
  };

  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, "").slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = clean;
    setOtpDigits(nextDigits);
    if (clean && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = () => {
    const entered = otpDigits.join("");
    if (entered.length < 4) {
      setOtpErrorShake(true);
      setTimeout(() => setOtpErrorShake(false), 500);
      showToast("Enter all four digits");
      return;
    }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setCurrentView("main");
      setActiveTab("home");
    }, 800);
  };

  const handleGoogleSignIn = async () => {
    setBusy(true);
    try {
      if (auth) {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      }
    } catch {
      // In demo mode, smoothly continue
    } finally {
      setBusy(false);
      setCurrentView("main");
      setActiveTab("home");
    }
  };

  const handleAction = (actStr: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const parts = actStr.split(":");
    const cmd = parts[0];
    const val = parts[1];

    if (cmd === "marker") {
      setSelectedMarkerId(val);
      setCurrentView("marker");
    } else if (cmd === "track") {
      setSelectedTrackId(val);
      setCurrentView("track");
    } else if (cmd === "tab") {
      setActiveTab(val as any);
      if (currentView !== "main") setCurrentView("main");
      setActiveSheet(null);
    } else if (cmd === "to") {
      setCurrentView(val as any);
    } else if (cmd === "sheet") {
      setActiveSheet(parts.slice(1).join(":"));
    } else if (cmd === "filter") {
      setMarkerFilter(val);
      setActiveTab("markers");
    } else if (cmd === "cat") {
      setTreatmentCategory(val);
    } else if (cmd === "habit") {
      setHabitsDone((prev) => ({ ...prev, [val]: !prev[val] }));
    } else if (cmd === "wk") {
      const habitKey = parts[1];
      const targetCount = parseInt(parts[2], 10);
      setWeeklyProgress((prev) => ({
        ...prev,
        [habitKey]: prev[habitKey] === targetCount ? targetCount - 1 : targetCount,
      }));
    } else if (cmd === "add") {
      const key = `${parts[1]}:${parts[2]}`;
      setAddedActions((prev) => ({ ...prev, [key]: !prev[key] }));
      showToast(addedActions[key] ? "Removed from plan" : "Added to today's plan");
    } else if (cmd === "newbook") {
      setBookingForm({ type: val || null, day: null, slot: null });
      setCurrentView("book");
    } else if (cmd === "stepbook") {
      const key = `${parts[1]}:${parts[2]}`;
      const track = getTrackById(parts[1]);
      const stepIdx = parseInt(parts[2], 10);
      const step = track?.steps[stepIdx];
      setBookingForm({
        type: step?.cta ? (step.cta[1].startsWith("svc:") ? "ther" : step.cta[1]) : "coach",
        day: 2,
        slot: "10:30 AM",
      });
      setCurrentView("book");
    } else if (cmd === "pkgreq") {
      setRequestedPackages((prev) => ({ ...prev, [val]: true }));
      showToast("Requested. The centre will call you.");
    } else if (cmd === "askliv") {
      setActiveSheet("liv");
      const marker = getMarkerById(val);
      if (marker) {
        askLiv(`Tell me about my ${marker.n} of ${marker.v} ${marker.u}`, marker.m);
      }
    } else if (cmd === "say") {
      showToast(parts.slice(1).join(":"));
    }
  };

  const askLiv = (q: string, ans: string | (() => string)) => {
    setChatLog((prev) => [...prev, { me: true, t: q }, { wait: true, t: "" }]);
    setTimeout(() => {
      setChatLog((prev) => {
        const next = [...prev];
        const resText = typeof ans === "function" ? ans() : ans;
        next[next.length - 1] = { t: resText };
        return next;
      });
    }, 600);
  };

  const sendCustomChat = () => {
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput("");
    askLiv(text, `Regarding "${text}": Dr. Deshmukh has reviewed this against your Living Lab screening. Your plan prioritizes strength training, earlier dinners, and targeted iron replacement to support these results.`);
  };

  // Mathematical Zone Proportional Range Bar
  const renderRangeBar = (m: Biomarker) => {
    if (m.nobar || !m.z || m.min == null || m.max == null) return null;
    const span = m.max - m.min;
    let prev = m.min;
    const l = Math.max(3, Math.min(97, ((m.x - m.min) / span) * 100));

    return (
      <div className="rb" aria-hidden="true">
        {m.z.map(([bound, zone], idx) => {
          const ratio = Math.max(0.01, (bound - prev) / span).toFixed(3);
          prev = bound;
          return (
            <i
              key={idx}
              className={`z${zone}`}
              style={{ flex: ratio }}
            />
          );
        })}
        <b style={{ left: `${l.toFixed(1)}%` }} />
      </div>
    );
  };

  const renderHeader = (title: string, sub?: string) => {
    return (
      <div className="hd">
        <div>
          <span className="k">{sub || formattedDate}</span>
          <h1 className="h1" style={{ marginTop: "6px" }}>{title}</h1>
        </div>
        <button
          type="button"
          className="icb"
          onClick={() => setActiveSheet("profile")}
          aria-label="Profile and settings"
        >
          <LivIcon name="user" size={20} />
        </button>
      </div>
    );
  };

  const selectedMarker = useMemo(() => getMarkerById(selectedMarkerId) || BIOMARKERS[0], [selectedMarkerId]);
  const selectedTrack = useMemo(() => getTrackById(selectedTrackId) || JOURNEY_TRACKS[0], [selectedTrackId]);

  const bookingDays = useMemo(() => {
    const list: Date[] = [];
    const now = new Date();
    for (let i = 1; i <= 7; i++) {
      list.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i));
    }
    return list;
  }, []);

  return (
    <LivScope theme={appTheme} className="h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-[var(--page,#EDEDE8)] text-[var(--page-text,#0B0B0C)]">
      <div id="recaptcha-container" />

      {/* ─── Mobile App Stage (Only mobile screen rendered, no leftbar) ─── */}
      <div className="shell">
        <main className="stagewrap">
          <div className="phone" id="phone" data-app={appTheme}>
            <div id="app" className="app-root enter" key={`${currentView}-${activeTab}`}>
              {/* ─── 1. SPLASH SCREEN ─── */}
              {currentView === "splash" && (
                <button
                  type="button"
                  className="splash"
                  id="splash"
                  onClick={() => setCurrentView("signup")}
                  style={{ background: "none", border: "none", color: "inherit", width: "100%", height: "100%" }}
                  aria-label="Liv. Tap to continue"
                >
                  <LivMark size={128} />
                  <span className="wm">Liv</span>
                  <span className="tag">Longevity, measured.</span>
                </button>
              )}

              {/* ─── 2. SIGN UP WITH EMBEDDED STORY VIDEO HOLDER ─── */}
              {currentView === "signup" && (
                <form
                  className="scroll"
                  id="signup"
                  noValidate
                  onSubmit={handleSubmitSignup}
                >
                  {/* Story video holder (Matches prototype lines 521-526) */}
                  <div className={`story ${storyPaused ? "paused" : ""}`} role="group" aria-label="What Liv is, in four short stories">
                    <div className="sbars">
                      {STORIES.map((_, i) => (
                        <i key={i} className={i < storyIndex ? "done" : i === storyIndex ? "on" : ""} />
                      ))}
                    </div>
                    <div className="stop">
                      <div className="who">
                        <LivMark size={22} />
                        <span>Liv</span> <span id="scount">{storyIndex + 1}/4</span>
                      </div>
                      <button
                        type="button"
                        id="spbtn"
                        onClick={() => setStoryPaused((p) => !p)}
                        aria-label={storyPaused ? "Play story" : "Pause story"}
                      >
                        <LivIcon name={storyPaused ? "play" : "pause"} size={18} />
                      </button>
                    </div>

                    <div id="sslot">
                      <svg className="sv" viewBox="0 0 92 92" fill="none" aria-hidden="true">
                        {STORIES[storyIndex].visual === "pulse" && (
                          <>
                            <circle className="pulse" cx="46" cy="46" r="42" stroke="currentColor" strokeWidth="1.2" />
                            <circle className="pulse d2" cx="46" cy="46" r="42" stroke="currentColor" strokeWidth="1.2" />
                            <circle cx="46" cy="46" r="6" fill="currentColor" />
                          </>
                        )}
                        {STORIES[storyIndex].visual === "range" && (
                          <>
                            <path d="M6 46h30" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                            <path d="M42 46h20" stroke="currentColor" strokeWidth="5" strokeDasharray="2 4" />
                            <path d="M68 46h18" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.3" />
                            <g className="slide">
                              <circle cx="62" cy="46" r="8" fill="var(--liv-surf)" stroke="currentColor" strokeWidth="2" />
                              <circle cx="62" cy="46" r="3" fill="currentColor" />
                            </g>
                          </>
                        )}
                        {STORIES[storyIndex].visual === "ring" && (
                          <>
                            <circle cx="46" cy="46" r="36" stroke="currentColor" strokeWidth="3" opacity="0.2" />
                            <circle className="ringdraw" cx="46" cy="46" r="36" stroke="currentColor" strokeWidth="3" strokeLinecap="round" transform="rotate(-90 46 46)" />
                            <text x="46" y="56" textAnchor="middle" fill="currentColor" fontFamily="Cormorant Garamond,Georgia,serif" fontSize="30" fontWeight="500">69</text>
                          </>
                        )}
                        {STORIES[storyIndex].visual === "path" && (
                          <>
                            <path d="M13 60 46 38 79 60" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 4" />
                            <circle cx="13" cy="60" r="3" fill="currentColor" />
                            <circle cx="46" cy="38" r="3" fill="currentColor" />
                            <circle cx="79" cy="60" r="3" fill="currentColor" />
                            <circle className="hop" cx="13" cy="60" r="9" stroke="currentColor" strokeWidth="1.6" />
                          </>
                        )}
                      </svg>
                      <div className="sbody">
                        <h2>{STORIES[storyIndex].h}</h2>
                        <p>{STORIES[storyIndex].p}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="snav l"
                      onClick={() => setStoryIndex((p) => (p - 1 + STORIES.length) % STORIES.length)}
                      aria-label="Previous story"
                    />
                    <button
                      type="button"
                      className="snav r"
                      onClick={() => setStoryIndex((p) => (p + 1) % STORIES.length)}
                      aria-label="Next story"
                    />
                    <span className="shint">Tap to skip</span>
                  </div>

                  <div>
                    <h1 className="h1">Create your account</h1>
                    <p className="sub" style={{ marginTop: "6px" }}>Four details. Under a minute.</p>
                  </div>

                  <div className="field">
                    <label htmlFor="f-name">Full name</label>
                    <input
                      className={`inp ${formErrors.name ? "bad" : ""}`}
                      id="f-name"
                      type="text"
                      placeholder="Kaveri Bhosle"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                    {formErrors.name && <span className="err">{formErrors.name}</span>}
                  </div>

                  <div className="field">
                    <label htmlFor="f-phone">Mobile number</label>
                    <div className="pre">
                      <span>+91</span>
                      <input
                        className={`inp ${formErrors.phone ? "bad" : ""}`}
                        id="f-phone"
                        type="tel"
                        placeholder="98765 43210"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        maxLength={10}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      />
                    </div>
                    {formErrors.phone && <span className="err">{formErrors.phone}</span>}
                  </div>

                  <div className="field">
                    <label htmlFor="f-email">Email address</label>
                    <input
                      className={`inp ${formErrors.email ? "bad" : ""}`}
                      id="f-email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    {formErrors.email && <span className="err">{formErrors.email}</span>}
                  </div>

                  <div className="two">
                    <div className="field">
                      <label htmlFor="f-age">Age</label>
                      <input
                        className={`inp ${formErrors.age ? "bad" : ""}`}
                        id="f-age"
                        type="text"
                        placeholder="42"
                        inputMode="numeric"
                        maxLength={3}
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                      />
                      {formErrors.age && <span className="err">{formErrors.age}</span>}
                    </div>

                    <div className="field">
                      <label>Sex</label>
                      <div className="seg" role="group">
                        <span
                          className="thumb"
                          style={{
                            width: "calc((100% - 8px) / 3)",
                            transform: `translateX(${sex === "Female" ? "0%" : sex === "Male" ? "100%" : "200%"})`,
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setSex("Female")}
                          aria-pressed={sex === "Female"}
                        >
                          Female
                        </button>
                        <button
                          type="button"
                          onClick={() => setSex("Male")}
                          aria-pressed={sex === "Male"}
                        >
                          Male
                        </button>
                        <button
                          type="button"
                          onClick={() => setSex("Other")}
                          aria-pressed={sex === "Other"}
                        >
                          Other
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="consent"
                    onClick={() => setConsentGiven((c) => !c)}
                    role="checkbox"
                    aria-checked={consentGiven}
                  >
                    <span className={`box ${consentGiven ? "on" : ""}`} id="okbox">
                      <LivIcon name="check" size={14} strokeWidth={2.4} />
                    </span>
                    <span>
                      I agree to my health data being stored in India and used to build my report. I can export or erase it at any time.
                    </span>
                  </button>
                  {formErrors.ok && <span className="err">{formErrors.ok}</span>}

                  <button className="btn" type="submit" disabled={busy}>
                    {busy ? (
                      <>
                        <span className="spin"></span>Creating your account
                      </>
                    ) : (
                      "Create account"
                    )}
                  </button>

                  <button
                    type="button"
                    className="link"
                    onClick={() => setCurrentView("signin")}
                  >
                    Already a member? <b>Sign in</b>
                  </button>
                </form>
              )}

              {/* ─── 3. WELCOME (ACCOUNT CREATED) ─── */}
              {currentView === "welcome" && (
                <div className="welcome">
                  <span className="tick">
                    <svg className="ring2" width="96" height="96" viewBox="0 0 96 96">
                      <circle className="r2" cx="48" cy="48" r="46" />
                    </svg>
                    <span className="ck">
                      <LivIcon name="check" size={34} strokeWidth={1.8} />
                    </span>
                  </span>

                  <div>
                    <span className="k">Account created</span>
                    <h1 className="h1" style={{ marginTop: "10px" }}>You're in, {firstName}.</h1>
                    <p className="sub" style={{ marginTop: "10px", font: "italic 400 17px/1.4 var(--serif)" }}>
                      Your longevity story starts with one visit. Everything after that lives here.
                    </p>
                  </div>

                  <div className="aiws">
                    <LivProgressRing size={44} strokeWidth={4} progress={0.69} onBg={true}>
                      <span className="unit" style={{ fontSize: "9.5px" }}>AIWS</span>
                    </LivProgressRing>
                    <div>
                      <span className="k">Active Integrated Wellness Score</span>
                      <p>
                        One number out of 100 for your whole body. Your well-being benchmark, and the first thing you will see once your report arrives.
                      </p>
                    </div>
                  </div>

                  <div className="next">
                    <div>
                      <b>1</b>
                      <span>
                        Sign in with your number
                        <small>A 4-digit code by SMS, or Google.</small>
                      </span>
                    </div>
                    <div>
                      <b>2</b>
                      <span>
                        We find your kiosk screening
                        <small>Your longevity report arrives in the app by itself.</small>
                      </span>
                    </div>
                    <div>
                      <b>3</b>
                      <span>
                        Your AIWS score, and your plan
                        <small>Three priorities, daily steps, your care team.</small>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn"
                    onClick={() => setCurrentView("signin")}
                  >
                    Continue to sign in
                  </button>
                </div>
              )}

              {/* ─── 4. SIGN IN SCREEN ─── */}
              {currentView === "signin" && (
                <div className="scroll">
                  <div className="illo">
                    <LivMark size={104} />
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <h1 className="h1">Welcome back</h1>
                    <p className="sub" style={{ marginTop: "6px" }}>
                      Sign in to see your score and your plan.
                    </p>
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

                  <div id="authpanel" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {authMode === "google" ? (
                      <>
                        <button
                          type="button"
                          className="btn"
                          onClick={handleGoogleSignIn}
                          disabled={busy}
                        >
                          {busy ? (
                            <>
                              <span className="spin"></span>Connecting to Google
                            </>
                          ) : (
                            <>
                              <span className="gmark">G</span>Continue with Google
                            </>
                          )}
                        </button>
                        <p className="sub" style={{ textAlign: "center" }}>
                          We read only your name and email address.
                        </p>
                      </>
                    ) : !otpSent ? (
                      <>
                        <div className="field">
                          <label htmlFor="f-si-phone">Mobile number</label>
                          <div className="pre">
                            <span>+91</span>
                            <input
                              className={`inp ${formErrors.phone ? "bad" : ""}`}
                              id="f-si-phone"
                              type="tel"
                              placeholder="98765 43210"
                              inputMode="numeric"
                              autoComplete="tel-national"
                              maxLength={10}
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                            />
                          </div>
                          {formErrors.phone && <span className="err">{formErrors.phone}</span>}
                        </div>
                        <button
                          type="button"
                          className="btn"
                          onClick={handleSendOtp}
                          disabled={busy}
                        >
                          {busy ? (
                            <>
                              <span className="spin"></span>Sending code
                            </>
                          ) : (
                            "Send code"
                          )}
                        </button>
                        <p className="sub" style={{ textAlign: "center" }}>
                          We send a 4-digit code by SMS to confirm it is you.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="hd">
                          <p className="sub">
                            Code sent to{" "}
                            <b style={{ color: "var(--text)" }}>
                              +91 {phoneNumber.slice(0, 2)}•••• ••{phoneNumber.slice(-2)}
                            </b>
                          </p>
                          <button
                            type="button"
                            className="link"
                            style={{ padding: "4px" }}
                            onClick={() => setOtpSent(false)}
                          >
                            <b>Change</b>
                          </button>
                        </div>

                        <div className={`otp ${otpErrorShake ? "shake" : ""}`} id="otp">
                          {[0, 1, 2, 3].map((i) => (
                            <input
                              key={i}
                              id={`otp${i}`}
                              ref={(el) => {
                                otpRefs.current[i] = el;
                              }}
                              inputMode="numeric"
                              maxLength={1}
                              autoComplete={i === 0 ? "one-time-code" : "off"}
                              aria-label={`Digit ${i + 1}`}
                              value={otpDigits[i] || ""}
                              onChange={(e) => handleDigitChange(i, e.target.value)}
                              onKeyDown={(e) => handleDigitKeyDown(i, e)}
                            />
                          ))}
                        </div>

                        <button
                          type="button"
                          className="btn"
                          onClick={handleVerifyOtp}
                          disabled={busy}
                        >
                          {busy ? (
                            <>
                              <span className="spin"></span>Verifying
                            </>
                          ) : (
                            "Verify and continue"
                          )}
                        </button>

                        <p className="sub" style={{ textAlign: "center" }} id="resend">
                          {countdown > 0 ? (
                            `Resend code in 0:${countdown < 10 ? "0" : ""}${countdown}`
                          ) : (
                            <button
                              type="button"
                              className="link"
                              style={{ padding: 0 }}
                              onClick={handleSendOtp}
                            >
                              <b>Resend code</b>
                            </button>
                          )}
                        </p>
                        <p className="sub" style={{ textAlign: "center", fontSize: "12px" }}>
                          Demo: any four digits work.
                        </p>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    className="link"
                    onClick={() => setCurrentView("signup")}
                  >
                    New here? <b>Create an account</b>
                  </button>
                </div>
              )}

              {/* ─── 5. ANALYZING / FETCHING ANIMATION ─── */}
              {currentView === "analyzing" && (
                <div className="center">
                  <LivMark size={88} />
                  <div>
                    <h1 className="h1">
                      {analysisSource === "kiosk" ? "Fetching your report" : "One moment"}
                    </h1>
                    <p className="sub" style={{ marginTop: "8px" }}>
                      {analysisSource === "kiosk"
                        ? "Living Lab kiosk · Aundh, Pune"
                        : analysisFileName}
                    </p>
                  </div>
                  <div className="steps" style={{ maxWidth: "270px", marginTop: "10px" }}>
                    {[
                      analysisSource === "kiosk" ? "Connecting to the Living Lab kiosk" : "Reading your report",
                      analysisSource === "kiosk" ? "Finding your screening" : "Finding your biomarkers",
                      analysisSource === "kiosk" ? "Fetching your longevity report" : "Comparing with optimal ranges",
                      "Building your score and plan",
                    ].map((stepText, idx) => {
                      const isDone = analysisStep > idx;
                      const isCurrent = analysisStep === idx;
                      return (
                        <div
                          key={idx}
                          className={`step ${isDone ? "done" : isCurrent ? "on" : ""}`}
                        >
                          <span className={`box ${isDone ? "on" : ""}`}>
                            <LivIcon name="check" size={14} strokeWidth={2.4} />
                          </span>
                          <span>
                            {idx === 1 && isDone
                              ? analysisSource === "kiosk"
                                ? "Screening of 18 Sep found"
                                : `${BIOMARKERS.length} biomarkers found`
                              : idx === 2 && isDone && analysisSource === "kiosk"
                                ? `${BIOMARKERS.length} biomarkers received`
                                : stepText}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── 6. MAIN APP TABS SHELL ─── */}
              {currentView === "main" && (
                <div className="flex-1 flex flex-col min-h-0 relative">
                  {/* TAB: HOME - WAITING FOR KIOSK REPORT */}
                  {activeTab === "home" && !hasReport && (
                    <div className="scroll">
                      {renderHeader(greeting)}

                      <div className={`card ${kioskFound ? "inv" : "empty"}`} id="kiosk" aria-live="polite">
                        {!kioskFound ? (
                          <>
                            <span className="spin" style={{ width: 24, height: 24 }} />
                            <div>
                              <h2 className="h2">Checking the Living Lab kiosk</h2>
                              <p className="sub" style={{ marginTop: "8px" }}>
                                Looking for a screening linked to +91 {phoneNumber.slice(0, 2)}•••• ••{phoneNumber.slice(-2)}.
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="k">Longevity report ready</span>
                            <h2 className="h2">Your kiosk screening from 18 Sep is waiting</h2>
                            <p className="sub">
                              Living Lab kiosk · Aundh, Pune
                              <br />
                              52 biomarkers · reviewed by Dr. A. Deshmukh
                            </p>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => startAnalysis("kiosk")}
                            >
                              <LivIcon name="down" size={20} />
                              Get my longevity report
                            </button>
                          </>
                        )}
                      </div>

                      <span className="k" style={{ marginTop: "6px" }}>
                        Other ways to start
                      </span>
                      <button
                        type="button"
                        className="opt"
                        onClick={() => setActiveSheet("upload")}
                      >
                        <LivIcon name="up" size={22} />
                        <div>
                          <div className="h3">Upload a lab report</div>
                          <div className="sub">A photo or PDF from any lab</div>
                        </div>
                        <LivIcon name="chev" size={16} />
                      </button>
                      <button
                        type="button"
                        className="opt"
                        onClick={() => {
                          setBookingForm({ type: "pod", day: null, slot: null });
                          setCurrentView("book");
                        }}
                      >
                        <LivIcon name="cal" size={22} />
                        <div>
                          <div className="h3">Book a kiosk screening</div>
                          <div className="sub">Blood, heart and body in one visit</div>
                        </div>
                        <LivIcon name="chev" size={16} />
                      </button>

                      <div className="card">
                        <span className="k">What your report gives you</span>
                        {[
                          ["AIWS score", "One number out of 100 for your whole body"],
                          ["Biological age", "How old your body is, and what is adding years"],
                          ["A 90-day plan", "Three priorities, daily steps and your next appointment"],
                        ].map(([t, desc]) => (
                          <div key={t} className="hd" style={{ justifyContent: "flex-start", gap: 12 }}>
                            <span className="box on" style={{ borderRadius: "11px" }}>
                              <LivIcon name="check" size={14} strokeWidth={2.4} />
                            </span>
                            <div>
                              <div className="h3">{t}</div>
                              <div className="sub">{desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB: HOME - FULL REPORT FETCHED (Quiet Home - 4 Cards) */}
                  {activeTab === "home" && hasReport && (
                    <div className="scroll">
                      {renderHeader(greeting)}

                      {/* Hero Card */}
                      <div className="card inv hero">
                        <div className="top">
                          <div className="ring" style={{ width: 104, height: 104 }}>
                            <svg width={104} height={104} viewBox="0 0 104 104" fill="none">
                              <circle className="tr" cx={52} cy={52} r={48.5} strokeWidth={7} />
                              <circle
                                className="ar"
                                cx={52}
                                cy={52}
                                r={48.5}
                                strokeWidth={7}
                                strokeLinecap="round"
                                strokeDasharray="304.7"
                                strokeDashoffset={304.7 * (1 - 0.69)}
                              />
                            </svg>
                            <div className="mid">
                              <span className="num" style={{ fontSize: 42 }}>69</span>
                              <div className="unit" style={{ marginTop: 3 }}>AIWS</div>
                            </div>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span className="k">Biological age</span>
                            <div>
                              <span className="num" style={{ fontSize: 40 }}>45.8</span>{" "}
                              <span className="unit">vs 42</span>
                            </div>
                            <span className="sub">Four movable things. All in your plan.</span>
                          </div>
                        </div>

                        <div className="facts">
                          <div>
                            <span className="k">Programme</span>
                            <div>
                              <span className="num">{dayNumber}</span>{" "}
                              <span className="unit">/ {planLen} · level {planLevel[0]}</span>
                            </div>
                          </div>
                          <div>
                            <span className="k">Streak</span>
                            <div>
                              <span className="num" id="streak">{streak}</span>{" "}
                              <span className="unit">days</span>
                            </div>
                          </div>
                        </div>

                        {/* Rewards XP Bar */}
                        <div className="xp">
                          <div className="bar">
                            <i style={{ width: `${pts % 100}%` }} />
                          </div>
                          <div className="row">
                            <span>{pts} pts</span>
                            <span>{100 - (pts % 100)} to the next reward</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="link"
                          onClick={() => setCurrentView("report")}
                        >
                          Signed 18 Sep · <b>Read your longevity report</b>
                        </button>
                      </div>

                      {/* Three Things Today Card */}
                      <div className="card" id="today">
                        <div className="hd">
                          <span className="h3">Three things today</span>
                          <span className="unit" id="tcount">
                            {Object.values(habitsDone).filter(Boolean).length} of 3 done
                          </span>
                        </div>
                        <div className="prog">
                          <i style={{ width: `${(Object.values(habitsDone).filter(Boolean).length / 3) * 100}%` }} />
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
                                role="checkbox"
                                aria-checked={isDone}
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
                        {appointments.length > 0 && (
                          <button
                            type="button"
                            className="quiet"
                            style={{ borderTop: "none", paddingTop: 0 }}
                            onClick={() => setActiveTab("care")}
                          >
                            <span className="t">
                              {appointments[0].t}
                              <small>
                                {appointments[0].d.toLocaleDateString(undefined, { weekday: "short" })}{" "}
                                {appointments[0].d.getDate()}{" "}
                                {appointments[0].d.toLocaleDateString(undefined, { month: "short" })} ·{" "}
                                {appointments[0].h} · in{" "}
                                {Math.ceil((appointments[0].d.getTime() - Date.now()) / 864e5)} days
                              </small>
                            </span>
                            <LivIcon name="chev" size={18} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="quiet"
                          onClick={() => handleAction("stepbook:hm:0")}
                        >
                          <span className="t">
                            Physician review
                            <small>Hormonal and metabolic · Week 1</small>
                          </span>
                          <span className="btn sm">Book with Dr. Deshmukh</span>
                        </button>
                      </div>

                      {/* Last Check-In Card with 4 Mini Vitals */}
                      <div className="card">
                        <div className="hd">
                          <span className="h3">Last check-in</span>
                          <button
                            type="button"
                            className="link"
                            style={{ padding: 0 }}
                            onClick={() => setActiveTab("markers")}
                          >
                            <b>6 Oct</b>
                          </button>
                        </div>
                        <div className="mini4">
                          <button type="button" onClick={() => handleAction("marker:hr")}>
                            <span className="k">Heart rate</span>
                            <span className="num" style={{ display: "block", marginTop: 4 }}>68</span>
                            <span className="d">bpm</span>
                          </button>
                          <button type="button" onClick={() => handleAction("marker:bp")}>
                            <span className="k">BP</span>
                            <span className="num" style={{ display: "block", marginTop: 4 }}>122 / 81</span>
                            <span className="d">mmHg</span>
                          </button>
                          <button type="button" onClick={() => handleAction("marker:posture")}>
                            <span className="k">Posture</span>
                            <span className="num" style={{ display: "block", marginTop: 4 }}>72</span>
                            <span className="d">/ 100</span>
                          </button>
                          <button type="button" onClick={() => handleAction("marker:cort")}>
                            <span className="k">Cortisol</span>
                            <span className="num" style={{ display: "block", marginTop: 4 }}>18.2</span>
                            <span className="d">µg/dL</span>
                          </button>
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

                      <div style={{ height: "52px", flexShrink: 0 }} />
                    </div>
                  )}

                  {/* TAB: MARKERS */}
                  {activeTab === "markers" && (
                    <div className="scroll">
                      {renderHeader("Biomarkers", "Assessed 18 Sep 2026")}

                      <div className="chips">
                        {[
                          ["all", "All", BIOMARKERS.length],
                          ["p", "Priority", BIOMARKERS.filter((m) => m.s === "p").length],
                          ["b", "Borderline", BIOMARKERS.filter((m) => m.s === "b").length],
                          ["o", "Optimal", BIOMARKERS.filter((m) => m.s === "o").length],
                        ].map(([key, label, count]) => (
                          <button
                            key={key as string}
                            type="button"
                            className={`chip ${markerFilter === key ? "on" : ""}`}
                            onClick={() => setMarkerFilter(key as string)}
                            aria-pressed={markerFilter === key}
                          >
                            {label} {count}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="card appt"
                        onClick={() => setCurrentView("report")}
                      >
                        <LivIcon name="file" size={24} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span className="h3 block">Longevity report</span>
                          <span className="sub block">
                            {analysisSource === "upload" ? "Uploaded by you" : "Fetched from the Living Lab kiosk"} · 18 Sep 2026
                          </span>
                        </span>
                        <LivIcon name="chev" size={18} />
                      </button>

                      {/* From your last check-in · 6 Oct (Matches prototype tabMarkersX lines 1549-1554) */}
                      <span className="k" style={{ marginTop: "6px" }}>From your last check-in · 6 Oct</span>

                      <div className="card" id="vitals">
                        <div className="hd">
                          <span className="h3">Kiosk vitals</span>
                          <span className="unit">Check-in 6 Oct · next 15 Oct</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAction("marker:ecg")}
                          style={{ background: "none", border: "none", padding: 0, textAlign: "left", color: "inherit" }}
                        >
                          <div className="strip">
                            <svg viewBox="0 0 360 110" preserveAspectRatio="none" aria-label="ECG trace, regular sinus rhythm">
                              <path className="tr" d={getEcgPath(360, 110, 5, 1)} />
                              <circle className="beat" cx={346} cy={68} r={3} />
                            </svg>
                          </div>
                        </button>
                        <div className="vit">
                          <button type="button" onClick={() => handleAction("marker:hr")}>
                            <span className="k">Heart rate</span>
                            <span><span className="num">68</span> <span className="unit">bpm</span></span>
                            <span className="d same">68</span>
                          </button>
                          <button type="button" onClick={() => handleAction("marker:bp")}>
                            <span className="k">Blood pressure</span>
                            <span><span className="num">122 / 81</span> <span className="unit">mmHg</span></span>
                            <span className="d dn">126 / 84</span>
                          </button>
                        </div>
                      </div>

                      <div className="card" id="bodyscan">
                        <div className="hd">
                          <span className="h3">Body scan</span>
                          <span className="unit">Smart camera · 6 Oct</span>
                        </div>
                        <button
                          type="button"
                          className="fig"
                          onClick={() => handleAction("marker:posture")}
                          style={{ background: "none", border: "none", padding: 0, textAlign: "left", color: "inherit" }}
                        >
                          <svg viewBox="0 0 150 230" aria-label="Posture figure, front view">
                            <line className="plumb" x1="75" y1="8" x2="75" y2="222" />
                            <g className="body">
                              <circle cx="79" cy="30" r="15" />
                              <path d="M60 52h38l10 8 6 50-10 2-5-36v50l4 90h-12l-6-80-6 80H67l4-90V76l-5 36-10-2 6-50z" />
                            </g>
                            <line className="ln ok" x1="49" y1="58" x2="107" y2="58" />
                            <line className="ln" x1="49" y1="56" x2="107" y2="61" />
                            <circle className="dot" cx="49" cy="56" r="2.5" />
                            <circle className="dot" cx="107" cy="61" r="2.5" />
                            <line className="ln ok" x1="58" y1="126" x2="98" y2="126" />
                            <line className="ln" x1="58" y1="127.5" x2="98" y2="124.5" />
                            <circle className="dot" cx="79" cy="30" r="2.5" />
                            <line className="ln" x1="75" y1="52" x2="79" y2="30" />
                          </svg>
                          <span>
                            <span className="k">Posture</span>
                            <span style={{ display: "block", marginTop: 4 }}>
                              <span className="num" style={{ fontSize: 36 }}>72</span> <span className="unit">/ 100</span>
                            </span>
                            <span className="sub" style={{ display: "block", marginTop: 6 }}>
                              Forward head, right shoulder low. Tap for the findings.
                            </span>
                          </span>
                        </button>
                        <div className="scan">
                          <button type="button" onClick={() => handleAction("marker:bmi")}>
                            <span className="k">BMI</span>
                            <span style={{ display: "block", marginTop: 4 }}><span className="num">26.4</span></span>
                          </button>
                          <button type="button" onClick={() => handleAction("marker:bf")}>
                            <span className="k">Body fat</span>
                            <span style={{ display: "block", marginTop: 4 }}><span className="num">36.2</span> <span className="unit">%</span></span>
                          </button>
                          <button type="button" onClick={() => handleAction("marker:waist")}>
                            <span className="k">Waist</span>
                            <span style={{ display: "block", marginTop: 4 }}><span className="num">88</span> <span className="unit">cm</span></span>
                          </button>
                        </div>
                      </div>

                      <div className="card">
                        <div className="hd">
                          <span className="h3">Fitness, recovery, brain</span>
                          <span className="unit">One easy marker each</span>
                        </div>
                        <div className="fit">
                          <button type="button" onClick={() => handleAction("marker:vo2")}>
                            <span className="k">VO₂max</span>
                            <span style={{ display: "block", marginTop: 4 }}><span className="num">28.4</span> <span className="unit">mL</span></span>
                            <span className="d">Priority</span>
                          </button>
                          <button type="button" onClick={() => handleAction("marker:hrv")}>
                            <span className="k">HRV</span>
                            <span style={{ display: "block", marginTop: 4 }}><span className="num">38</span> <span className="unit">ms</span></span>
                            <span className="d up">+3</span>
                          </button>
                          <button type="button" onClick={() => handleAction("marker:rt")}>
                            <span className="k">Reaction time</span>
                            <span style={{ display: "block", marginTop: 4 }}><span className="num">312</span> <span className="unit">ms</span></span>
                            <span className="d dn">-6</span>
                          </button>
                        </div>
                      </div>

                      {GROUPS.map((g) => {
                        const ms = BIOMARKERS.filter(
                          (m) => m.g === g.id && (markerFilter === "all" || m.s === markerFilter),
                        );
                        if (!ms.length) return null;
                        return (
                          <div key={g.id}>
                            <span className="k" style={{ marginTop: "6px" }}>{g.name}</span>
                            <div className="card grp">
                              {ms.map((m) => (
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
                                  {renderRangeBar(m)}
                                  <span className="rbl" style={{ marginTop: "8px" }}>
                                    <span>Optimal {m.opt}</span>
                                    <span className={`pill ${m.s}`}>
                                      {m.s === "p" ? "▲ Priority" : m.s === "b" ? "◆ Borderline" : "● Optimal"}
                                    </span>
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => setActiveSheet("upload")}
                        style={{ marginTop: "6px" }}
                      >
                        <LivIcon name="up" size={18} />
                        Add another report
                      </button>

                      <div style={{ height: "52px", flexShrink: 0 }} />
                    </div>
                  )}

                  {/* TAB: PLAN */}
                  {activeTab === "plan" && (
                    <div className="scroll">
                      {renderHeader(`Your ${planLen} days`, `Day ${dayNumber} of ${planLen} · re-test in ${planLen - dayNumber} days`)}

                      {/* Care plan card */}
                      <div className="card inv">
                        <div className="hd">
                          <div>
                            <span className="k">Care plan · from Dr. Deshmukh · {planLen} days</span>
                            <div className="h3" style={{ fontSize: "17px", marginTop: "4px" }}>
                              Level {planLevel[0]} of {planPhases.length} · {planLevel[1]}
                            </div>
                          </div>
                          <span className="pts" style={{ color: "var(--inv-fg)" }}>{pts} pts</span>
                        </div>
                        <div className="lvl">
                          <LivProgressRing size={64} strokeWidth={5} progress={dayNumber / planLen} onBg={false}>
                            <span className="unit" style={{ color: "var(--inv-fg)" }}>
                              {dayNumber}<small style={{ color: "var(--inv-muted)" }}>/{planLen}</small>
                            </span>
                          </LivProgressRing>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "14px" }}>
                              Metabolic Reset, {Math.round(planLen / 7)} weeks. {milestones.filter((m) => m[2]).length} of {milestones.length} milestones reached.
                            </div>
                            <div className="sub" style={{ marginTop: "3px" }}>
                              Points come from today's steps and sessions logged at the centre.
                            </div>
                          </div>
                        </div>
                        <div
                          className="path"
                          style={{
                            gridTemplateColumns: `repeat(${milestones.length}, ${milestones.length > 5 ? "76px" : "1fr"})`,
                            overflowX: "auto",
                            scrollbarWidth: "none",
                            margin: "0 -18px",
                            padding: "0 18px",
                          }}
                        >
                          {milestones.map(([lbl, , done], idx) => {
                            const isNow = !done && (idx === 0 || milestones[idx - 1][2]);
                            return (
                              <div key={idx} className={`ms ${done ? "done" : isNow ? "now" : ""}`}>
                                <span className="nd">
                                  <LivIcon name="check" size={13} strokeWidth={3} />
                                </span>
                                <span>{lbl}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* This week weekly habit rhythm */}
                      <div className="card pw">
                        <div className="hd">
                          <span className="h3">This week</span>
                          <span className="unit">Week 4 · tap each time you do it</span>
                        </div>
                        {[
                          { k: "str", n: "Strength session", s: "3 a week with Coach Ritu", t: 3 },
                          { k: "walk", n: "Walk after dinner", s: "10 minutes, most days", t: 7 },
                          { k: "sup", n: "Vitamin D and iron", s: "Every day, as prescribed", t: 7 },
                          { k: "br", n: "Coherence breathing", s: "10 minutes with Liv", t: 5 },
                        ].map((w) => {
                          const count = weeklyProgress[w.k] || 0;
                          return (
                            <div key={w.k}>
                              <div className="hd">
                                <span>
                                  <span style={{ fontSize: "14.5px", fontWeight: 500 }}>{w.n}</span>
                                  <span className="sub" style={{ display: "block" }}>
                                    {w.s} {count >= w.t ? "· done for the week" : ""}
                                  </span>
                                </span>
                                <span className="unit">{count}/{w.t}</span>
                              </div>
                              <div style={{ marginTop: "8px" }} className="wk">
                                {Array.from({ length: w.t }).map((_, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    className={count > i ? "on" : ""}
                                    onClick={(e) => handleAction(`wk:${w.k}:${i + 1}`, e)}
                                    aria-pressed={count > i}
                                    aria-label={`${i + 1} of ${w.t}`}
                                  >
                                    <LivIcon name="check" size={12} strokeWidth={3} />
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Today habits */}
                      <div className="card" id="today">
                        <div className="hd">
                          <span className="h3">Today</span>
                          <span className="unit" id="tcount">
                            {Object.values(habitsDone).filter(Boolean).length} of 4 done
                          </span>
                        </div>
                        <div className="prog">
                          <i style={{ width: `${(Object.values(habitsDone).filter(Boolean).length / 4) * 100}%` }} />
                        </div>
                        <div>
                          {DEFAULT_HABITS.map(([id, title, desc]) => {
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

                      {/* Badges row */}
                      <div className="card">
                        <div className="hd">
                          <span className="h3">Badges</span>
                          <span className="unit">4 of 6</span>
                        </div>
                        <div className="badges">
                          {Object.entries(BADGE_DEFINITIONS).map(([key, [title, desc]]) => {
                            const isUnlocked = !!earnedBadges[key];
                            return (
                              <div
                                key={key}
                                className={`bd ${isUnlocked ? "" : "lock"}`}
                              >
                                <span className="ico">
                                  <LivIcon name={isUnlocked ? "check" : "flame"} size={16} strokeWidth={2.4} />
                                </span>
                                <b>{title}</b>
                                <small>{desc}</small>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Your three journeys */}
                      <span className="k" style={{ marginTop: "6px" }}>Your three journeys</span>
                      {JOURNEY_TRACKS.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className="card trow"
                          onClick={() => handleAction(`track:${t.id}`)}
                        >
                          <LivProgressRing size={50} strokeWidth={4} progress={0.5} onBg={true}>
                            <span className="unit" style={{ fontSize: "11px" }}>3/7</span>
                          </LivProgressRing>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span className="h3 block">{t.n}</span>
                            <span className="sub block">{t.short}</span>
                          </span>
                          <LivIcon name="chev" size={18} />
                        </button>
                      ))}

                      {/* Why these three accordion */}
                      <span className="k" style={{ marginTop: "6px" }}>Why these three</span>
                      {PRIORITIES.map((p, idx) => {
                        const isOpen = openPri === idx;
                        return (
                          <div key={idx} className={`card pri ${isOpen ? "open" : ""}`}>
                            <button
                              type="button"
                              onClick={() => setOpenPri(isOpen ? null : idx)}
                              aria-expanded={isOpen}
                            >
                              <span className="no">{idx + 1}</span>
                              <span className="h3" style={{ flex: 1 }}>{p.t}</span>
                              <span className="chev"><LivIcon name="chev" size={18} /></span>
                            </button>
                            <div className="more">
                              <div>
                                <div className="in">
                                  <div>
                                    <span className="k">The signal</span>
                                    <p style={{ margin: "4px 0 0" }}>{p.sig}</p>
                                  </div>
                                  <div>
                                    <span className="k">Your move</span>
                                    <p style={{ margin: "4px 0 0" }}>{p.move}</p>
                                  </div>
                                  <div>
                                    <span className="k">Day-90 target</span>
                                    <p style={{ margin: "4px 0 0", fontWeight: 600 }}>{p.tar}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Wearable trends */}
                      <div className="card">
                        <span className="k">Wearable trends</span>
                        <div>
                          <div className="trk">
                            <div>
                              <div className="h3">Sleep</div>
                              <div className="sub">14-day average · target 7 h or more</div>
                            </div>
                            <button
                              type="button"
                              className="link"
                              style={{ padding: 0 }}
                              onClick={() => handleAction("marker:sleep")}
                            >
                              <span className="num" style={{ fontSize: "24px", color: "var(--text)" }}>6 h 10</span>
                            </button>
                          </div>
                          <div className="trk">
                            <div>
                              <div className="h3">HRV</div>
                              <div className="sub">14-day average · optimal above 45</div>
                            </div>
                            <button
                              type="button"
                              className="link"
                              style={{ padding: 0 }}
                              onClick={() => handleAction("marker:hrv")}
                            >
                              <span className="num" style={{ fontSize: "24px", color: "var(--text)" }}>38</span> <span className="unit">ms</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div style={{ height: "52px", flexShrink: 0 }} />
                    </div>
                  )}

                  {/* TAB: CARE */}
                  {activeTab === "care" && (
                    <div className="scroll">
                      {renderHeader("Care", "Your visits, treatments and team")}

                      <span className="k">Upcoming</span>
                      {appointments.filter((a) => !a.past).length > 0 ? (
                        appointments.filter((a) => !a.past).map((a) => (
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
                                {a.d.toLocaleDateString(undefined, { weekday: "short" })} · {a.h} · in {Math.ceil((a.d.getTime() - Date.now()) / 864e5)} days
                              </span>
                              {a.status && (
                                <span style={{ display: "block", marginTop: "5px" }}>
                                  {a.status === "pending" ? (
                                    <span className="stat-pill wait"><i />Awaiting Dr. Deshmukh's sign-off</span>
                                  ) : (
                                    <span className="stat-pill ok"><i />Approved by Dr. Deshmukh</span>
                                  )}
                                </span>
                              )}
                            </span>
                            <LivIcon name="chev" size={18} />
                          </button>
                        ))
                      ) : (
                        <div className="card empty">
                          <p className="sub">No visits booked. Your next step is one tap away.</p>
                        </div>
                      )}

                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => handleAction("newbook")}
                      >
                        <LivIcon name="cal" size={18} />
                        Book a visit
                      </button>

                      {hasReport && (
                        <>
                          <div className="sec">
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
                                {treatmentPacks[x.id] && (
                                  <div className="sub" style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span className="left">
                                      {Array.from({ length: treatmentPacks[x.id].total }).map((_, i) => (
                                        <i key={i} className={i < treatmentPacks[x.id].left ? "on" : ""} />
                                      ))}
                                    </span>
                                    {treatmentPacks[x.id].left} of {treatmentPacks[x.id].total} sessions left
                                  </div>
                                )}
                              </div>
                              <LivIcon name="chev" size={16} />
                            </button>
                          ))}
                        </>
                      )}

                      <span className="k" style={{ marginTop: "8px" }}>Treatments at the centre</span>
                      <div className="chips">
                        {[
                          ["skin", "Skin"],
                          ["hair", "Hair"],
                          ["iv", "IV drips"],
                        ].map(([cId, cLbl]) => (
                          <button
                            key={cId}
                            type="button"
                            className={`chip ${treatmentCategory === cId ? "on" : ""}`}
                            onClick={() => setTreatmentCategory(cId)}
                            aria-pressed={treatmentCategory === cId}
                          >
                            {cLbl}
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
                            <div className="sub">{x.d}{x.sign ? " · doctor sign-off" : ""}</div>
                            {treatmentPacks[x.id] && (
                              <div className="sub" style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
                                <span className="left">
                                  {Array.from({ length: treatmentPacks[x.id].total }).map((_, i) => (
                                    <i key={i} className={i < treatmentPacks[x.id].left ? "on" : ""} />
                                  ))}
                                </span>
                                {treatmentPacks[x.id].left} of {treatmentPacks[x.id].total} sessions left
                              </div>
                            )}
                          </div>
                          <LivIcon name="chev" size={16} />
                        </button>
                      ))}

                      {hasReport && (
                        <>
                          <span className="k" style={{ marginTop: "8px" }}>Care packages from your report</span>
                          {JOURNEY_TRACKS.map((t, idx) => {
                            const pkg = CARE_PACKAGES[t.id];
                            return (
                              <button
                                key={t.id}
                                type="button"
                                className="opt"
                                onClick={() => handleAction(`sheet:pkg:${t.id}`)}
                              >
                                <div>
                                  <div className="h3">{pkg.n}</div>
                                  <div className="sub">{pkg.f} · {pkg.len}</div>
                                </div>
                                {requestedPackages[t.id] ? (
                                  <span className="pill b">Requested</span>
                                ) : idx === 0 ? (
                                  <span className="pill p">Start here</span>
                                ) : (
                                  <LivIcon name="chev" size={16} />
                                )}
                              </button>
                            );
                          })}
                        </>
                      )}

                      {appointments.filter((a) => a.past).length > 0 && (
                        <>
                          <span className="k" style={{ marginTop: "8px" }}>Past sessions</span>
                          {appointments.filter((a) => a.past).map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              className="card appt"
                              onClick={() => handleAction(`sheet:after:${a.id}`)}
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
                              </span>
                              <LivIcon name="chev" size={18} />
                            </button>
                          ))}
                        </>
                      )}

                      <span className="k" style={{ marginTop: "8px" }}>Your care team</span>
                      <div className="card" style={{ gap: 0, padding: "4px 18px" }}>
                        {[
                          ["Dr. A. Deshmukh", "Supervising physician · signs every report and drip", "newbook:doc"],
                          ["Ritu S.", "Longevity coach · fortnightly check-ins", "newbook:coach"],
                          ["Trupti", "Nurse · runs your kiosk and treatment sessions", "say:Trupti logs each session you take at the centre."],
                          ["Liv", "AI companion · English, Hindi or Marathi, any time", "sheet:liv"],
                        ].map(([docName, subDesc, actKey]) => (
                          <button
                            key={docName}
                            type="button"
                            className="habit"
                            onClick={() => handleAction(actKey)}
                          >
                            <span className="box on" style={{ font: "600 12px var(--sans)" }}>
                              {docName.replace("Dr. ", "").charAt(0)}
                            </span>
                            <span className="t">
                              {docName}
                              <small>{subDesc}</small>
                            </span>
                            <LivIcon name="chev" size={16} />
                          </button>
                        ))}
                      </div>

                      <p className="sub" style={{ textAlign: "center", marginTop: "4px" }}>
                        Aaroogya AI Centre for Women's Wellness
                        <br />
                        Aundh, Pune · open 8 AM to 8 PM
                      </p>

                      <div style={{ height: "52px", flexShrink: 0 }} />
                    </div>
                  )}

                  {/* FAB - Ask Liv button */}
                  {hasReport && (
                    <button
                      type="button"
                      className="fab"
                      onClick={() => setActiveSheet("liv")}
                    >
                      <LivIcon name="spark" size={20} />
                      Ask Liv
                    </button>
                  )}

                  {/* Bottom Nav Bar (Matches prototype lines 141-147: repeat 4, 1fr) */}
                  <nav className="nav" aria-label="Main">
                    {[
                      ["home", "Home", "home"],
                      ["markers", "Markers", "drop"],
                      ["plan", "Plan", "plan"],
                      ["care", "Care", "cal"],
                    ].map(([tabKey, label, iconName]) => (
                      <button
                        key={tabKey}
                        type="button"
                        className={`tab ${activeTab === tabKey ? "on" : ""}`}
                        onClick={() => {
                          setActiveTab(tabKey as any);
                          if (tabKey === "markers") setMarkerFilter("all");
                        }}
                        aria-current={activeTab === tabKey ? "page" : "false"}
                      >
                        <LivIcon name={iconName as any} size={22} />
                        {label}
                      </button>
                    ))}
                  </nav>
                </div>
              )}

              {/* ─── 7. SINGLE MARKER DETAIL SCREEN ─── */}
              {currentView === "marker" && (
                <div className="scroll">
                  <div className="hd">
                    <button
                      type="button"
                      className="icb"
                      onClick={() => setCurrentView("main")}
                      aria-label="Back"
                    >
                      <LivIcon name="back" size={20} />
                    </button>
                    <span className="k">{GROUPS.find((g) => g.id === selectedMarker.g)?.name || "Biomarker"}</span>
                    <span style={{ width: "44px" }} />
                  </div>

                  <div>
                    <h1 className="h1">{selectedMarker.n}</h1>
                    <div className="hd" style={{ marginTop: "14px", alignItems: "flex-end" }}>
                      <span>
                        <span className="num" style={{ fontSize: "68px" }}>{selectedMarker.v}</span>{" "}
                        <span className="unit">{selectedMarker.u}</span>
                      </span>
                      <span className={`pill ${selectedMarker.s}`}>
                        {selectedMarker.s === "p" ? "▲ Priority" : selectedMarker.s === "b" ? "◆ Borderline" : "● Optimal"}
                      </span>
                    </div>
                  </div>

                  {/* ECG intervals or Posture details */}
                  {selectedMarker.id === "ecg" && selectedMarker.iv && (
                    <div className="card">
                      <div className="strip">
                        <svg viewBox="0 0 360 110" preserveAspectRatio="none">
                          <path className="tr" d={getEcgPath(360, 110, 5, 1)} />
                        </svg>
                      </div>
                      <div className="iv">
                        {selectedMarker.iv.map(([ivVal, ivLbl], i) => (
                          <div key={i}>
                            <b>{ivVal}</b>
                            <span>{ivLbl}</span>
                          </div>
                        ))}
                      </div>
                      <p className="sub">Regular rhythm · no ectopic beats in 30 s · read by Dr. A. Deshmukh</p>
                    </div>
                  )}

                  {!selectedMarker.nobar && (
                    <div className="card">
                      {renderRangeBar(selectedMarker)}
                      <div className="rbl">
                        <span>Longevity-optimal {selectedMarker.opt}</span>
                        <span>Clinical {selectedMarker.clin}</span>
                      </div>
                      <p className="sub" style={{ fontSize: "12px" }}>
                        Solid is optimal, hatched is borderline, faint is priority. The clinical range is where illness begins. The optimal range is where healthspan is built.
                      </p>
                    </div>
                  )}

                  <div className="card">
                    <span className="k">What it means</span>
                    <p style={{ margin: 0, font: "400 20px/1.3 var(--serif)" }}>{selectedMarker.m}</p>
                  </div>

                  <div className="card">
                    <div className="hd">
                      <span className="k">{selectedMarker.s === "o" ? "How to protect it" : "How to move it"}</span>
                    </div>
                    <div>
                      {selectedMarker.a.length ? (
                        selectedMarker.a.map((t, idx) => {
                          const actionKey = `${selectedMarker.id}:${idx}`;
                          const isAdded = !!addedActions[actionKey];
                          return (
                            <div key={idx} className="act">
                              <p>{t}</p>
                              <button
                                type="button"
                                className={`add ${isAdded ? "on" : ""}`}
                                onClick={() => handleAction(`add:${selectedMarker.id}:${idx}`)}
                                aria-pressed={isAdded}
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

                  <button
                    type="button"
                    className="card trow"
                    onClick={() => handleAction(`track:${getTrackForMarker(selectedMarker).id}`)}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="k">Part of your journey</span>
                      <span className="h3" style={{ display: "block", marginTop: "5px" }}>
                        {getTrackForMarker(selectedMarker).n}
                      </span>
                    </span>
                    <LivIcon name="chev" size={18} />
                  </button>

                  <div className="split">
                    <div className="card stat">
                      <span className="k">Day-90 target</span>
                      <span className="num" style={{ fontSize: "28px" }}>{selectedMarker.t || "Hold"}</span>
                    </div>
                    <div className="card stat">
                      <span className="k">Re-test</span>
                      <span className="num" style={{ fontSize: "28px" }}>19 Dec</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setBookingForm({ type: "doc", day: null, slot: null });
                      setCurrentView("book");
                    }}
                  >
                    Book a review with Dr. Deshmukh
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => handleAction(`askliv:${selectedMarker.id}`)}
                  >
                    <LivIcon name="spark" size={18} />
                    Ask Liv about this
                  </button>
                </div>
              )}

              {/* ─── 8. JOURNEY TRACK SCREEN ─── */}
              {currentView === "track" && (
                <div className="scroll">
                  <div className="hd">
                    <button
                      type="button"
                      className="icb"
                      onClick={() => setCurrentView("main")}
                      aria-label="Back"
                    >
                      <LivIcon name="back" size={20} />
                    </button>
                    <span className="k">Journey · 3 of {selectedTrack.steps.length} steps done</span>
                    <span style={{ width: "44px" }} />
                  </div>

                  <div>
                    <h1 className="h1">{selectedTrack.n}</h1>
                    <p className="sub" style={{ marginTop: "10px", fontSize: "14.5px" }}>
                      {selectedTrack.find}
                    </p>
                  </div>

                  <div className="prog">
                    <i style={{ width: "42%" }} />
                  </div>

                  <span className="k" style={{ marginTop: "4px" }}>What your report shows</span>
                  <div className="mk">
                    {selectedTrack.mk.map((id) => {
                      const m = getMarkerById(id);
                      if (!m) return null;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleAction(`marker:${id}`)}
                        >
                          {m.n} <b>{m.v}</b> <i>{m.s === "p" ? "▲" : m.s === "b" ? "◆" : "●"}</i>
                        </button>
                      );
                    })}
                  </div>

                  <div className="card">
                    <span className="k">Daily guidelines</span>
                    <div>
                      {selectedTrack.guide.map((g, i) => (
                        <div key={i} className="gl">
                          <b>{i + 1}</b>
                          <span>{g}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <span className="k" style={{ marginTop: "4px" }}>Your journey to Day 90</span>
                  <div className="card">
                    <div className="tl">
                      {selectedTrack.steps.map((s, i) => {
                        const isDone = i < 2;
                        const isNow = i === 2;
                        return (
                          <div key={i} className={`ts ${isDone ? "done" : isNow ? "now" : "up"}`}>
                            <span className="nd">
                              {isDone && <LivIcon name="check" size={14} strokeWidth={2.4} />}
                            </span>
                            <div className="bd">
                              <span className="meta">
                                <span className="k">{s.when}</span>
                                <span className="tagx">{s.tag}</span>
                              </span>
                              <span className="h3">{s.t}</span>
                              <span className="sub">{s.d}</span>
                              {isNow && s.cta && (
                                <span className="acts">
                                  <button
                                    type="button"
                                    className="btn sm"
                                    onClick={() => handleAction(`stepbook:${selectedTrack.id}:${i}`)}
                                  >
                                    {s.cta[0]}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn sm ghost"
                                    onClick={() => showToast(`Marked "${s.t}" done`)}
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
                    <p style={{ margin: 0, font: "500 21px/1.25 var(--serif)", fontVariantNumeric: "lining-nums" }}>
                      {selectedTrack.goal}
                    </p>
                  </div>

                  <span className="k" style={{ marginTop: "4px" }}>The care package for this journey</span>
                  <button
                    type="button"
                    className="card trow"
                    onClick={() => handleAction(`sheet:pkg:${selectedTrack.id}`)}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="h3 block" style={{ fontSize: "16px" }}>{CARE_PACKAGES[selectedTrack.id]?.n}</span>
                      <span className="sub block">
                        {CARE_PACKAGES[selectedTrack.id]?.inc.length} inclusions · {CARE_PACKAGES[selectedTrack.id]?.len}
                      </span>
                    </span>
                    <LivIcon name="chev" size={18} />
                  </button>
                </div>
              )}

              {/* ─── 9. LONGEVITY REPORT (7-CHAPTER VERTICAL SNAP VIEWER) ─── */}
              {currentView === "report" && (
                <div className="flex-1 flex flex-col min-h-0 relative">
                  <div className={`rhead ${activeReportChapter === 0 || activeReportChapter === 6 ? "dark" : ""}`} id="rhead">
                    <button
                      type="button"
                      className="icb"
                      onClick={() => setCurrentView("main")}
                      aria-label="Back"
                    >
                      <LivIcon name="back" size={20} />
                    </button>
                    <span className="ttl" id="rttl">
                      {(["Cover", "Headline", "Systems", "Vitals and body", "Priorities", "Targets", "Signed"][activeReportChapter] || "Cover")} · {activeReportChapter + 1} of 7
                    </span>
                    <button
                      type="button"
                      className="icb"
                      onClick={() => showToast("A PDF of your report is ready in your downloads.")}
                      aria-label="Download PDF"
                    >
                      <LivIcon name="down" size={18} />
                    </button>
                  </div>

                  <div
                    className="scroll rpt"
                    id="rpt"
                    onScroll={(e) => {
                      const target = e.currentTarget;
                      const idx = Math.min(6, Math.max(0, Math.round(target.scrollTop / target.clientHeight)));
                      setActiveReportChapter(idx);
                    }}
                  >
                    {/* Chapter 1: Cover */}
                    <section className="ch inv" style={{ alignItems: "center", textAlign: "center" }}>
                      <LivMark size={72} />
                      <div>
                        <span className="k">Prepared for {fullName} · 18 September 2026</span>
                        <h1 className="h1" style={{ marginTop: "12px" }}>Your Longevity Report</h1>
                      </div>
                      <div>
                        <span className="k">Biological age</span>
                        <div className="big">45.8</div>
                        <span className="sub">calendar age {age} · AIWS score 69 of 100</span>
                      </div>
                      <span className="sub">
                        Living Lab kiosk · Aundh, Pune
                        <br />
                        Reviewed and signed by Dr. A. Deshmukh
                      </span>
                      <button
                        type="button"
                        className="expl"
                        onClick={() => {
                          setActiveSheet("liv");
                          askLiv("Walk me through my longevity report", "Take a breath. This report is 52 numbers, but it only says three things: your body is 45.8 years old against a calendar age of 42, nothing here is alarming, and four movable things explain the gap. I will take you through it one page at a time, in plain words.");
                        }}
                      >
                        <LivIcon name="spark" size={16} />
                        Liv, walk me through this
                      </button>
                    </section>

                    {/* Chapter 2: Headline */}
                    <section className="ch">
                      <span className="k">Your headline</span>
                      <h1 className="h1">Your body is 45.8 years old. You get to change that.</h1>
                      <p className="lead">
                        Nothing here is alarming, and nothing here is fixed. The 3.8-year gap comes from four movable things.
                      </p>
                      <div>
                        {YEARS_CONTRIBUTORS.slice(0, 4).map(([yName, yVal]) => (
                          <div key={yName} className="yr">
                            <span className="n">
                              {yName}
                              <i style={{ width: `${(yVal / 1.4) * 100}%`, marginTop: "6px" }} />
                            </span>
                            <span className="v">+{yVal.toFixed(1)} y</span>
                          </div>
                        ))}
                      </div>
                      <span className="sub">Estimated from nine blood biomarkers, with a margin of about two years.</span>
                      <button
                        type="button"
                        className="expl"
                        onClick={() => {
                          setActiveSheet("liv");
                          askLiv("Explain the 45.8 biological age in plain words", "The number that matters is 45.8. It is an estimate from nine blood markers with a margin of about two years, so read it as a direction, not a verdict. Glucose, ApoB, muscle and two missing nutrients add the years. Your blood pressure, liver and kidneys take years off. A very good position at 42.");
                        }}
                      >
                        <LivIcon name="spark" size={16} />
                        Explain this in plain words
                      </button>
                    </section>

                    {/* Chapter 3: Systems */}
                    <section className="ch">
                      <span className="k">Eight systems, one glance</span>
                      <h1 className="h1">Strong foundations. One clear lever.</h1>
                      <div className="sysg">
                        {SYSTEM_SCORES.map(([sName, sScore], i) => (
                          <div key={sName} className={i === SYSTEM_SCORES.length - 1 ? "top" : ""}>
                            <span className="num">{sScore}</span>
                            <small>{sName} {i === SYSTEM_SCORES.length - 1 ? "· your biggest lever" : i === 0 ? "· your quiet superpower" : ""}</small>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Chapter 4: Vitals and body */}
                    <section className="ch">
                      <span className="k">Kiosk vitals and body scan</span>
                      <h1 className="h1">Heart steady. Posture is the one to train.</h1>
                      <div className="strip">
                        <svg viewBox="0 0 360 110" preserveAspectRatio="none">
                          <path className="tr" d={getEcgPath(360, 110, 5, 1)} />
                        </svg>
                      </div>
                      <div className="iv">
                        {[
                          ["68", "bpm"],
                          ["122/81", "mmHg"],
                          ["72", "posture"],
                          ["26.4", "BMI"],
                        ].map(([x0, x1], i) => (
                          <div key={i}>
                            <b>{x0}</b>
                            <span>{x1}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Chapter 5: Priorities */}
                    <section className="ch">
                      <span className="k">Your plan, distilled</span>
                      <h1 className="h1">Three priorities. Ninety days.</h1>
                      <div>
                        {PRIORITIES.map((p, i) => (
                          <div key={i} className="prio">
                            <span className="num">{i + 1}</span>
                            <div>
                              <div className="h3" style={{ fontSize: "16px" }}>{p.t}</div>
                              <p className="sub" style={{ marginTop: "4px" }}>{p.move}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Chapter 6: Targets */}
                    <section className="ch">
                      <span className="k">Your targets on one line</span>
                      <h1 className="h1">Where you will be on Day 90.</h1>
                      <table className="tt">
                        <tbody>
                          <tr>
                            <td className="k" style={{ border: "none", paddingTop: 0 }}>Measure</td>
                            <td className="k" style={{ border: "none", paddingTop: 0 }}>Today</td>
                            <td className="k" style={{ border: "none", paddingTop: 0 }}>Day 90</td>
                          </tr>
                          {[
                            ["Biological age", "45.8", "≤ 45.0"],
                            ["HbA1c", "5.9%", "≤ 5.7%"],
                            ["ApoB", "102", "< 90"],
                            ["Grip strength", "24 kg", "27 kg"],
                            ["Vitamin D", "16", "> 40"],
                            ["Posture score", "72", "> 80"],
                            ["Waist", "88 cm", "≤ 85 cm"],
                            ["BMI", "26.4", "< 25"],
                          ].map(([mName, curVal, tgtVal]) => (
                            <tr key={mName}>
                              <td>{mName}</td>
                              <td>{curVal}</td>
                              <td>{tgtVal}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>

                    {/* Chapter 7: Signed */}
                    <section className="ch inv">
                      <span className="k">Reviewed and signed</span>
                      <div className="sig">Dr. A. Deshmukh</div>
                      <span className="sub">
                        MBBS, MD (Medicine) · 18 September 2026
                        <br />
                        This report supports, and never replaces, your treating doctor.
                      </span>
                      <h1 className="h1" style={{ marginTop: "10px" }}>Your next chapter is 19 Dec.</h1>
                      <p className="lead" style={{ fontStyle: "italic" }}>We measure again, and watch the gap close.</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
                        <button
                          type="button"
                          className="btn"
                          style={{ background: "var(--inv-fg)", borderColor: "var(--inv-fg)", color: "var(--inv)" }}
                          onClick={() => {
                            setActiveTab("markers");
                            setCurrentView("main");
                          }}
                        >
                          See all {BIOMARKERS.length} markers
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          style={{ color: "var(--inv-fg)", borderColor: "var(--inv-line)" }}
                          onClick={() => showToast("A secure link to your report is ready to send.")}
                        >
                          <LivIcon name="share" size={18} />
                          Share with a doctor
                        </button>
                      </div>
                    </section>
                  </div>

                  {/* Vertical Dot Indicator */}
                  <div className="dotsv" id="rdots">
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                      <button
                        key={i}
                        type="button"
                        className={activeReportChapter === i ? "on" : ""}
                        onClick={() => {
                          const rptEl = document.getElementById("rpt");
                          if (rptEl && rptEl.children[i]) {
                            (rptEl.children[i] as HTMLElement).scrollIntoView({ behavior: "smooth" });
                          }
                        }}
                        aria-label={`Chapter ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ─── 10. BOOKING SCREEN ─── */}
              {currentView === "book" && (() => {
                const isSvc = bookingForm.type === "svc" && Boolean(bookingForm.svc);
                const svcItem = isSvc && bookingForm.svc ? getTreatmentById(bookingForm.svc) : null;
                const ans = isSvc && bookingForm.svc ? treatmentScreening[bookingForm.svc] || {} : {};
                const flag = svcItem ? Boolean(svcItem.sign || (svcItem.scr && svcItem.scr.some((_, i) => ans[i] === true))) : false;
                const ready = Boolean(bookingForm.type && bookingForm.day != null && bookingForm.slot);

                return (
                  <div className="scroll">
                    <div className="hd">
                      <button
                        type="button"
                        className="icb"
                        onClick={() => setCurrentView("main")}
                        aria-label="Back"
                      >
                        <LivIcon name="back" size={20} />
                      </button>
                      <span className="k">
                        Step {ready ? 3 : 2} of 3
                      </span>
                      <span style={{ width: "44px" }} />
                    </div>

                    <h1 className="h1">{isSvc ? "Pick a time" : "Book a visit"}</h1>

                    {isSvc && svcItem ? (
                      <div className="card inv" style={{ gap: "4px" }}>
                        <span className="k">{bookingForm.pack === 1 ? "Single session" : `Pack of ${bookingForm.pack}`}</span>
                        <span className="h3" style={{ fontSize: "17px" }}>{svcItem.n}</span>
                        <span className="sub">{svcItem.d}</span>
                      </div>
                    ) : (
                      Object.entries(VISIT_TYPES_MAP).map(([key, [title, subtitle]]) => (
                        <button
                          key={key}
                          type="button"
                          className={`opt ${bookingForm.type === key ? "on" : ""}`}
                          onClick={() => setBookingForm((prev) => ({ ...prev, type: key }))}
                          aria-pressed={bookingForm.type === key}
                        >
                          <div>
                            <div className="h3">{title}</div>
                            <div className="sub">{subtitle}</div>
                          </div>
                          <span className={`box ${bookingForm.type === key ? "on" : ""}`} style={{ borderRadius: "11px" }}>
                            <LivIcon name="check" size={14} strokeWidth={2.4} />
                          </span>
                        </button>
                      ))
                    )}

                    {bookingForm.type && (
                      <>
                        <span className="k" style={{ marginTop: "6px" }}>Pick a day</span>
                        <div className="chips">
                          {bookingDays.map((d, i) => (
                            <button
                              key={i}
                              type="button"
                              className={`chip ${bookingForm.day === i ? "on" : ""}`}
                              onClick={() => setBookingForm((prev) => ({ ...prev, day: i }))}
                              aria-pressed={bookingForm.day === i}
                            >
                              {d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {bookingForm.type && bookingForm.day != null && (
                      <>
                        <span className="k" style={{ marginTop: "6px" }}>Pick a time</span>
                        <div className="slots">
                          {TIME_SLOTS.map((s) => (
                            <button
                              key={s}
                              type="button"
                              className={`chip ${bookingForm.slot === s ? "on" : ""}`}
                              onClick={() => setBookingForm((prev) => ({ ...prev, slot: s }))}
                              aria-pressed={bookingForm.slot === s}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {flag && (
                      <p className="sub" style={{ fontSize: "12.5px" }}>
                        This booking is held until Dr. Deshmukh signs it off. You will be told in the app.
                      </p>
                    )}

                    <div style={{ flex: 1 }} />
                    <button
                      type="button"
                      className="btn"
                      disabled={!ready}
                      onClick={() => {
                        if (isSvc && svcItem) {
                          const packCount = bookingForm.pack || 1;
                          if (packCount > 1) {
                            setTreatmentPacks((prev) => {
                              const cur = prev[svcItem.id] || { total: 0, left: 0 };
                              return {
                                ...prev,
                                [svcItem.id]: { total: cur.total + packCount, left: cur.left + packCount },
                              };
                            });
                          }
                          const newAppt: AppointmentItem = {
                            id: Date.now(),
                            t: svcItem.n,
                            w: (packCount > 1 ? `Pack of ${packCount} · session 1` : "Single session") + " · " + (svcItem.d.split(" · ")[1] || "45 min"),
                            d: bookingDays[bookingForm.day!],
                            h: bookingForm.slot!,
                            svc: svcItem.id,
                            status: flag ? "pending" : "ok",
                          };
                          setAppointments((prev) => [newAppt, ...prev]);
                          setCurrentView("booked");
                          if (flag) {
                            setTimeout(() => {
                              setAppointments((prev) =>
                                prev.map((a) => (a.id === newAppt.id ? { ...a, status: "ok" } : a))
                              );
                              showToast(
                                `Dr. Deshmukh approved your ${newAppt.t}. See you on ${newAppt.d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}.`
                              );
                            }, 6000);
                          }
                        } else {
                          const newAppt: AppointmentItem = {
                            id: Date.now(),
                            t: VISIT_TYPES_MAP[bookingForm.type!][0],
                            w: VISIT_TYPES_MAP[bookingForm.type!][1],
                            d: bookingDays[bookingForm.day!],
                            h: bookingForm.slot!,
                          };
                          setAppointments((prev) => [newAppt, ...prev]);
                          setCurrentView("booked");
                        }
                      }}
                    >
                      {ready
                        ? `${flag ? "Send for sign-off · " : "Confirm · "}${bookingDays[bookingForm.day!].toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}, ${bookingForm.slot}`
                        : !bookingForm.type
                        ? "Choose a visit type"
                        : "Pick a day and time"}
                    </button>
                  </div>
                );
              })()}

              {/* ─── 11. BOOKED CONFIRMATION SCREEN ─── */}
              {currentView === "booked" && (() => {
                const latest = appointments[0];
                const isPending = latest?.status === "pending";

                if (isPending) {
                  return (
                    <div className="center">
                      <div className="done-mark" style={{ background: "none", border: "1.5px solid var(--liv-text, #F5F5F1)", color: "var(--liv-text, #F5F5F1)" }}>
                        <span className="spin" style={{ width: "28px", height: "28px" }} />
                      </div>
                      <div>
                        <h1 className="h1">Sent for sign-off</h1>
                        <p className="sub" style={{ marginTop: "10px" }}>
                          {latest.t}
                          <br />
                          {latest.d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} at {latest.h}
                        </p>
                      </div>
                      <p className="sub">
                        Dr. Deshmukh reviews it against your labs. Usually within a day. The demo answers in a few seconds.
                      </p>
                      <button
                        type="button"
                        className="btn"
                        style={{ marginTop: "8px" }}
                        onClick={() => {
                          setActiveTab("care");
                          setCurrentView("main");
                        }}
                      >
                        See my visits
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => {
                          setActiveTab("home");
                          setCurrentView("main");
                        }}
                      >
                        Back to Home
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="center">
                    <div className="done-mark">
                      <LivIcon name="check" size={40} strokeWidth={2} />
                    </div>
                    <div>
                      <h1 className="h1">Visit booked</h1>
                      <p className="sub" style={{ marginTop: "10px" }}>
                        {latest?.t}
                        <br />
                        {latest?.d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} at {latest?.h}
                        <br />
                        {latest?.w}
                      </p>
                    </div>
                    <p className="sub">Liv will remind you the day before.</p>
                    <button
                      type="button"
                      className="btn"
                      style={{ marginTop: "8px" }}
                      onClick={() => {
                        setActiveTab("care");
                        setCurrentView("main");
                      }}
                    >
                      See my visits
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => {
                        setActiveTab("home");
                        setCurrentView("main");
                      }}
                    >
                      Back to Home
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* ─── SHEETS & DIALOG OVERLAYS ─── */}
            {activeSheet && (
              <div className="scrim" onClick={() => setActiveSheet(null)}>
                <div
                  className="sheet"
                  role="dialog"
                  aria-modal="true"
                  style={activeSheet === "liv" ? { height: "88%" } : undefined}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="grab" />

                  {/* SHEET: ASK LIV CHAT */}
                  {activeSheet === "liv" && (
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="hd" style={{ padding: "14px 20px 0" }}>
                        <div>
                          <span className="k">Your AI companion</span>
                          <h2 className="h2" style={{ marginTop: "4px" }}>Liv</h2>
                        </div>
                        <button
                          type="button"
                          className="icb"
                          onClick={() => setActiveSheet(null)}
                          aria-label="Close"
                        >
                          <LivIcon name="x" size={18} />
                        </button>
                      </div>

                      <div className="scroll flex-1 min-h-[260px]" style={{ gap: "10px" }}>
                        <div className="bub liv">
                          Hi {firstName}. Ask me about your results, your plan or your next visit.
                        </div>
                        {chatLog.map((msg, i) => (
                          <div key={i} className={`bub ${msg.me ? "me" : "liv"}`}>
                            {msg.wait ? (
                              <span className="typing">
                                <i /><i /><i />
                              </span>
                            ) : (
                              msg.t
                            )}
                          </div>
                        ))}

                        {chatLog.length === 0 && (
                          <div className="sugs" style={{ marginTop: "6px" }}>
                            {LIV_PRESET_QUESTIONS.map(([q, ans], idx) => (
                              <button
                                key={idx}
                                type="button"
                                className="chip"
                                onClick={() => askLiv(q, ans)}
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: "8px", padding: "10px 16px calc(14px + env(safe-area-inset-bottom, 0px))", borderTop: "1px solid var(--line)" }}>
                        <input
                          className="inp"
                          placeholder="Ask about your health"
                          aria-label="Message Liv"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") sendCustomChat();
                          }}
                        />
                        <button
                          type="button"
                          className="icb"
                          onClick={sendCustomChat}
                          aria-label="Send"
                          style={{ width: "52px", height: "52px", borderRadius: "26px" }}
                        >
                          <LivIcon name="send" size={20} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SHEET: BIOLOGICAL AGE EXPLANATION & TRAJECTORY SVG */}
                  {activeSheet === "age" && (
                    <div className="scroll">
                      <div>
                        <span className="k">Biological age · calendar age {age}</span>
                        <h2 className="h2" style={{ marginTop: "8px" }}>
                          Your body is 45.8 years old. You get to change that.
                        </h2>
                        <p className="sub" style={{ marginTop: "6px" }}>
                          An estimate from nine blood biomarkers, with a margin of about two years.
                        </p>
                      </div>

                      <span className="k">What adds and subtracts years</span>
                      <div className="bars">
                        {YEARS_CONTRIBUTORS.map(([yName, yVal], i) => (
                          <div key={yName} className="bar">
                            <span>{yName}</span>
                            <span>
                              <i
                                className={yVal < 0 ? "neg" : ""}
                                style={{
                                  width: `${Math.max(6, (Math.abs(yVal) / 1.4) * 100)}%`,
                                  animationDelay: `${i * 50}ms`,
                                }}
                              />
                            </span>
                            <span>{yVal > 0 ? `+${yVal.toFixed(1)} y` : `${yVal.toFixed(1)} y`}</span>
                          </div>
                        ))}
                      </div>

                      <span className="k" style={{ marginTop: "6px" }}>Projected with your plan</span>
                      <svg
                        viewBox="0 0 310 104"
                        width="100%"
                        fill="none"
                        role="img"
                        aria-label="Projected biological age falling from 45.8 today to 43.5 in twelve months"
                      >
                        <polyline
                          points="18,22.0 86.5,38.0 155.0,50.0 223.5,60.0 292,68.0"
                          stroke="var(--text)"
                          strokeWidth="1.6"
                        />
                        {[
                          [18, 22.0, "Today", "45.8"],
                          [86.5, 38.0, "Day 90", "45.0"],
                          [155.0, 50.0, "6 mo", "44.4"],
                          [223.5, 60.0, "9 mo", "43.9"],
                          [292, 68.0, "12 mo", "43.5"],
                        ].map(([cx, cy, label, val], i) => (
                          <g key={i}>
                            <circle cx={cx as number} cy={cy as number} r="3.5" fill="var(--text)" />
                            <text
                              x={cx as number}
                              y={(cy as number) - 9}
                              textAnchor="middle"
                              fill="var(--text)"
                              fontFamily="DM Mono,monospace"
                              fontSize="10"
                            >
                              {val as string}
                            </text>
                            <text
                              x={cx as number}
                              y="98"
                              textAnchor="middle"
                              fill="var(--muted)"
                              fontFamily="DM Mono,monospace"
                              fontSize="9"
                            >
                              {label as string}
                            </text>
                          </g>
                        ))}
                      </svg>
                      <p className="sub" style={{ fontSize: "12px" }}>
                        Projection based on members with a similar starting profile who completed two programme cycles.
                      </p>
                    </div>
                  )}

                  {/* SHEET: AIWS SCORE EXPLANATION */}
                  {activeSheet === "score" && (
                    <div className="scroll">
                      <div>
                        <span className="k">AIWS score · 69 of 100</span>
                        <h2 className="h2" style={{ marginTop: "8px" }}>Eight systems, one number</h2>
                        <p className="sub" style={{ marginTop: "6px" }}>
                          Each system is scored against longevity-optimal ranges for women aged 40 to 44. 100 means every marker is optimal.
                        </p>
                      </div>

                      <div className="bars">
                        {SYSTEM_SCORES.map(([sName, sScore], i) => (
                          <div key={sName} className="bar">
                            <span>{sName}</span>
                            <span>
                              <i style={{ width: `${sScore}%`, animationDelay: `${i * 50}ms` }} />
                            </span>
                            <span>{sScore}</span>
                          </div>
                        ))}
                      </div>

                      <p className="sub">
                        Members on the programme typically gain 6 to 10 points in the first 90 days.
                      </p>

                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setActiveSheet(null);
                          setCurrentView("report");
                        }}
                      >
                        View my longevity report
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => {
                          setActiveSheet(null);
                          setActiveTab("plan");
                        }}
                      >
                        See my 90-day plan
                      </button>
                    </div>
                  )}

                  {/* SHEET: UPLOAD LAB REPORT */}
                  {activeSheet === "upload" && (
                    <div className="scroll">
                      <div>
                        <h2 className="h2">Add a report</h2>
                        <p className="sub" style={{ marginTop: "6px" }}>
                          One report can hold many tests. We find them for you.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="opt"
                        onClick={() => {
                          setActiveSheet(null);
                          startAnalysis("kiosk");
                        }}
                      >
                        <LivIcon name="down" size={22} />
                        <div>
                          <div className="h3">Fetch from the Living Lab kiosk</div>
                          <div className="sub">Your latest longevity report</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="opt"
                        onClick={() => {
                          setActiveSheet(null);
                          startAnalysis("upload", "Photo screening");
                        }}
                      >
                        <LivIcon name="cam" size={22} />
                        <div>
                          <div className="h3">Take a photo</div>
                          <div className="sub">Of a printed report</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="opt"
                        onClick={() => {
                          setActiveSheet(null);
                          startAnalysis("upload", "Health_Report_2026.pdf");
                        }}
                      >
                        <LivIcon name="file" size={22} />
                        <div>
                          <div className="h3">Choose a PDF or image</div>
                          <div className="sub">From your phone</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="opt"
                        onClick={() => {
                          setActiveSheet(null);
                          startAnalysis("upload", "Sample longevity report");
                        }}
                      >
                        <LivIcon name="spark" size={22} />
                        <div>
                          <div className="h3">Use the sample report</div>
                          <div className="sub">Demo data, to see how it works</div>
                        </div>
                      </button>

                      <p className="sub" style={{ fontSize: "12px", textAlign: "center" }}>
                        In this demo every source shows the sample member's results.
                      </p>
                    </div>
                  )}

                  {/* SHEET: REPORT DETAILS */}
                  {activeSheet === "report" && (
                    <div className="scroll">
                      <div>
                        <span className="k">Longevity report</span>
                        <h2 className="h2" style={{ marginTop: "8px" }}>
                          {analysisSource === "upload" ? "From your uploaded report" : "Fetched from the Living Lab kiosk"}
                        </h2>
                        <p className="sub" style={{ marginTop: "6px" }}>
                          Everything in this app is built from this one report.
                        </p>
                      </div>

                      <div className="card" style={{ gap: 0, padding: "4px 18px" }}>
                        {[
                          ["Source", analysisSource === "upload" ? analysisFileName : "Living Lab kiosk · Aundh, Pune"],
                          ["Assessed", "18 Sep 2026"],
                          ["Contains", `${BIOMARKERS.length} biomarkers, AIWS score, biological age, 90-day plan`],
                          ["Reviewed by", "Dr. A. Deshmukh, MBBS, MD"],
                          ["Next report", "After your kiosk screening on 19 Dec"],
                        ].map(([r0, r1]) => (
                          <div key={r0} className="trk" style={{ alignItems: "flex-start" }}>
                            <span className="k" style={{ paddingTop: "3px", flexShrink: 0 }}>{r0}</span>
                            <span style={{ textAlign: "right", fontSize: "14px" }}>{r1}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setActiveSheet(null);
                          startAnalysis("kiosk");
                        }}
                      >
                        <LivIcon name="redo" size={18} />
                        Check the kiosk for a newer report
                      </button>

                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => showToast("A secure link to your report is ready to send.")}
                      >
                        <LivIcon name="share" size={18} />
                        Share with a doctor
                      </button>
                    </div>
                  )}

                  {/* SHEET: PROFILE & SETTINGS */}
                  {activeSheet === "profile" && (
                    <div className="scroll">
                      <div className="hd" style={{ justifyContent: "flex-start", gap: "14px" }}>
                        <span className="date" style={{ width: "56px", height: "56px", borderRadius: "28px" }}>
                          <b>{firstName.charAt(0).toUpperCase()}</b>
                        </span>
                        <div>
                          <h2 className="h2">{fullName}</h2>
                          <p className="sub">Member LL-PNE-0247 · sample data</p>
                        </div>
                      </div>

                      <div className="field">
                        <label>Appearance</label>
                        <div className="seg" role="group">
                          <span
                            className="thumb"
                            style={{
                              width: "calc((100% - 8px) / 2)",
                              transform: `translateX(${appTheme === "dark" ? "0%" : "100%"})`,
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setAppTheme("dark")}
                            aria-pressed={appTheme === "dark"}
                          >
                            Black
                          </button>
                          <button
                            type="button"
                            onClick={() => setAppTheme("light")}
                            aria-pressed={appTheme === "light"}
                          >
                            White
                          </button>
                        </div>
                      </div>

                      <div className="field">
                        <label>Programme length · set by the doctor (demo)</label>
                        <div className="seg" role="group">
                          <span
                            className="thumb"
                            style={{
                              width: "calc((100% - 8px) / 3)",
                              transform: `translateX(${planLen === 90 ? "0%" : planLen === 160 ? "100%" : "200%"})`,
                            }}
                          />
                          {[
                            [90, "90 days"],
                            [160, "160 days"],
                            [180, "180 days"],
                          ].map(([len, lbl]) => (
                            <button
                              key={len}
                              type="button"
                              onClick={() => {
                                const n = len as number;
                                setPlanLen(n);
                                setAppointments((prev) =>
                                  prev.map((a) => (a.fixed ? { ...a, t: `Day-${n} re-measure` } : a))
                                );
                                showToast(`Programme set to ${n} days by the doctor. Levels and milestones re-flowed.`);
                              }}
                              aria-pressed={planLen === len}
                            >
                              {lbl}
                            </button>
                          ))}
                        </div>
                      </div>

                      <span className="k">Your consent</span>
                      <div className="card" style={{ gap: 0, padding: "4px 18px" }}>
                        {[
                          {
                            id: "capture" as const,
                            title: "Capture at the kiosk",
                            desc: "Measurements and what you tell Liv",
                          },
                          {
                            id: "share" as const,
                            title: "Share with Dr. Deshmukh",
                            desc: "Reports reach a doctor only with this on",
                          },
                          {
                            id: "remind" as const,
                            title: "Reminders",
                            desc: "Appointments, re-tests and aftercare",
                          },
                        ].map((c) => {
                          const isChecked = consentSettings[c.id];
                          return (
                            <button
                              key={c.id}
                              type="button"
                              className="sw"
                              role="switch"
                              aria-checked={isChecked}
                              onClick={() => {
                                setConsentSettings((prev) => {
                                  const updated = { ...prev, [c.id]: !prev[c.id] };
                                  if (c.id === "share" && !updated.share) {
                                    showToast("Sharing with doctors is off. Reports stay with you.");
                                  }
                                  return updated;
                                });
                              }}
                            >
                              <span className="t">
                                {c.title}
                                <small>{c.desc}</small>
                              </span>
                              <span className={`tog ${isChecked ? "on" : ""}`} />
                            </button>
                          );
                        })}
                      </div>

                      <div className="card" style={{ gap: 0, padding: "4px 18px" }}>
                        <button
                          type="button"
                          className="habit"
                          onClick={() => setActiveSheet("report")}
                        >
                          <LivIcon name="share" size={20} />
                          <span className="t">Share my report with a doctor</span>
                          <LivIcon name="chev" size={16} />
                        </button>

                        <button
                          type="button"
                          className="habit"
                          onClick={() =>
                            showToast("Your data is stored in India. Export or deletion is confirmed by SMS.")
                          }
                        >
                          <LivIcon name="shield" size={20} />
                          <span className="t">Export or delete my data</span>
                          <LivIcon name="chev" size={16} />
                        </button>

                        <button
                          type="button"
                          className="habit"
                          onClick={() => {
                            setHasReport(false);
                            if (typeof window !== "undefined") {
                              localStorage.removeItem("liv_has_report");
                            }
                            setActiveSheet(null);
                            setCurrentView("splash");
                          }}
                        >
                          <LivIcon name="redo" size={20} />
                          <span className="t">Restart the demo</span>
                          <LivIcon name="chev" size={16} />
                        </button>

                        {/* Navigation link to Aaha Consumer App */}
                        <Link to="/home" className="habit" onClick={() => setActiveSheet(null)}>
                          <LivIcon name="home" size={20} />
                          <span className="t">Return to Aaha Consumer App</span>
                          <LivIcon name="chev" size={16} />
                        </Link>
                      </div>

                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => {
                          setActiveSheet(null);
                          setCurrentView("signin");
                        }}
                      >
                        Sign out
                      </button>
                    </div>
                  )}

                  {/* SHEET: APPOINTMENT DETAILS */}
                  {activeSheet?.startsWith("appt:") && (() => {
                    const apptId = parseInt(activeSheet.split(":")[1], 10);
                    const appt = appointments.find((a) => a.id === apptId) || appointments[0];
                    return (
                      <div className="scroll">
                        <div>
                          <span className="k">in {Math.ceil((appt.d.getTime() - Date.now()) / 864e5)} days</span>
                          <h2 className="h2" style={{ marginTop: "8px" }}>{appt.t}</h2>
                          <p className="sub" style={{ marginTop: "6px" }}>
                            {appt.d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} at {appt.h}
                            <br />
                            {appt.w}
                          </p>
                        </div>

                        {appt.fixed ? (
                          <p className="sub">
                            Re-measured that day: HbA1c, insulin, ApoB, hs-CRP, vitamin D, ferritin, grip and body composition.
                          </p>
                        ) : null}

                        <button
                          type="button"
                          className="btn"
                          onClick={() => {
                            setActiveSheet(null);
                            setBookingForm({ type: "coach", day: 2, slot: "10:30 AM" });
                            setCurrentView("book");
                          }}
                        >
                          Reschedule
                        </button>
                        {!appt.fixed && (
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={() => {
                              setAppointments((prev) => prev.filter((a) => a.id !== appt.id));
                              setActiveSheet(null);
                              showToast("Appointment cancelled");
                            }}
                          >
                            Cancel this visit
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* SHEET: CARE PACKAGE DETAILS */}
                  {activeSheet?.startsWith("pkg:") && (() => {
                    const pkgId = activeSheet.split(":")[1];
                    const pkg = CARE_PACKAGES[pkgId];
                    const trkItem = getTrackById(pkgId);
                    const isReq = !!requestedPackages[pkgId];
                    if (!pkg || !trkItem) return null;
                    return (
                      <div className="scroll">
                        <div>
                          <span className="k">Care package · {pkg.len}</span>
                          <h2 className="h2" style={{ marginTop: "8px" }}>{pkg.n}</h2>
                          <p className="sub" style={{ marginTop: "6px" }}>
                            {pkg.f}. Built from your {trkItem.n.toLowerCase()} journey.
                          </p>
                        </div>

                        <div className="card" style={{ gap: 0, padding: "6px 18px" }}>
                          {pkg.inc.map((item, idx) => (
                            <div key={idx} className="gl">
                              <span className="box on">
                                <LivIcon name="check" size={12} strokeWidth={2.6} />
                              </span>
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>

                        <p className="sub" style={{ fontSize: "12.5px" }}>
                          Every therapy is physician-screened first, and drips are given only against your labs. The centre shares the price when you request.
                        </p>

                        <button
                          type="button"
                          className="btn"
                          disabled={isReq}
                          onClick={() => {
                            setRequestedPackages((prev) => ({ ...prev, [pkgId]: true }));
                            showToast("Requested. The centre will call you.");
                          }}
                        >
                          {isReq ? "Requested. The centre will call you" : "Request this package"}
                        </button>

                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => {
                            setActiveSheet(null);
                            setSelectedTrackId(pkgId);
                            setCurrentView("track");
                          }}
                        >
                          See the journey
                        </button>
                      </div>
                    );
                  })()}

                  {/* SHEET: TREATMENT SERVICE DETAILS */}
                  {activeSheet?.startsWith("svc:") && (() => {
                    const svcId = activeSheet.split(":")[1];
                    const x = getTreatmentById(svcId);
                    if (!x) return null;
                    const pk = treatmentPacks[svcId];
                    const selPack = bookingForm.svc === svcId ? bookingForm.pack : (x.packs[0] || 1);
                    const ans = treatmentScreening[svcId] || {};
                    const allAnswered = !x.scr || x.scr.every((_, i) => ans[i] !== undefined);
                    const flag = x.scr && x.scr.some((_, i) => ans[i] === true);
                    const catName = x.cat === "skin" ? "Skin" : x.cat === "hair" ? "Hair" : "IV drips";

                    return (
                      <div className="scroll">
                        <div>
                          <span className="k">{catName}{x.sign ? " · doctor sign-off" : ""}</span>
                          <h2 className="h2" style={{ marginTop: "8px" }}>{x.n}</h2>
                          <p className="sub" style={{ marginTop: "6px" }}>{x.d}</p>
                        </div>
                        <p style={{ margin: 0, font: "400 17px/1.4 var(--serif)" }}>{x.s}</p>
                        {x.rec && (
                          <div className="card inv" style={{ gap: "6px" }}>
                            <span className="k">Why Dr. Deshmukh recommends it</span>
                            <p style={{ margin: 0, fontSize: "14px" }}>{x.rec}</p>
                          </div>
                        )}
                        {pk && (
                          <div className="card" style={{ gap: "8px" }}>
                            <div className="hd">
                              <span className="h3">Your pack</span>
                              <span className="unit">{pk.left} of {pk.total} left</span>
                            </div>
                            <span className="left">
                              {Array.from({ length: pk.total }).map((_, i) => (
                                <i key={i} className={i < pk.left ? "on" : ""} style={{ flex: 1 }} />
                              ))}
                            </span>
                            <p className="sub">A session is deducted when the centre logs it.</p>
                          </div>
                        )}
                        <span className="k">{pk ? "Add more sessions" : "Choose sessions"}</span>
                        <div className="packs">
                          {x.packs.map((n) => (
                            <button
                              key={n}
                              type="button"
                              className={`pack ${selPack === n ? "on" : ""}`}
                              onClick={() => setBookingForm((prev) => ({ ...prev, svc: svcId, pack: n }))}
                            >
                              <b>{n}</b>
                              <span>{n === 1 ? "single" : "pack"}</span>
                            </button>
                          ))}
                        </div>
                        <p className="sub" style={{ fontSize: "12.5px" }}>
                          Price set by the centre, shown at checkout. Packs are deducted one session at a time.
                        </p>
                        {x.scr && (
                          <div className="card" style={{ gap: "4px" }}>
                            <span className="k">Before you book</span>
                            <div>
                              {x.scr.map((q, i) => (
                                <div key={i} className="qa">
                                  <span>{q}</span>
                                  <span className="yn">
                                    <button
                                      type="button"
                                      className={ans[i] === true ? "on" : ""}
                                      onClick={() =>
                                        setTreatmentScreening((prev) => ({
                                          ...prev,
                                          [svcId]: { ...(prev[svcId] || {}), [i]: true },
                                        }))
                                      }
                                    >
                                      Yes
                                    </button>
                                    <button
                                      type="button"
                                      className={ans[i] === false ? "on" : ""}
                                      onClick={() =>
                                        setTreatmentScreening((prev) => ({
                                          ...prev,
                                          [svcId]: { ...(prev[svcId] || {}), [i]: false },
                                        }))
                                      }
                                    >
                                      No
                                    </button>
                                  </span>
                                </div>
                              ))}
                            </div>
                            {flag && (
                              <p className="sub" style={{ fontSize: "12.5px" }}>
                                A yes here goes to Dr. Deshmukh before the session is confirmed.
                              </p>
                            )}
                          </div>
                        )}
                        <button
                          type="button"
                          className="btn"
                          disabled={!selPack || !allAnswered}
                          onClick={() => {
                            setActiveSheet(null);
                            setBookingForm((prev) => ({
                              ...prev,
                              type: "svc",
                              svc: svcId,
                              pack: selPack || 1,
                              day: null,
                              slot: null,
                            }));
                            setCurrentView("book");
                          }}
                        >
                          {!selPack
                            ? "Choose sessions"
                            : !allAnswered
                            ? "Answer the questions above"
                            : x.sign || flag
                            ? "Pick a time, then send for sign-off"
                            : "Pick a time"}
                        </button>
                      </div>
                    );
                  })()}

                  {/* SHEET: PAST LOGGED SESSION AFTERCARE */}
                  {activeSheet?.startsWith("after:") && (() => {
                    const apptId = parseInt(activeSheet.split(":")[1], 10);
                    const appt = appointments.find((a) => a.id === apptId) || appointments[0];
                    const x = appt?.svc ? getTreatmentById(appt.svc) : null;
                    return (
                      <div className="scroll">
                        <div>
                          <span className="k">Session logged · {appt.d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
                          <h2 className="h2" style={{ marginTop: "8px" }}>{appt.t}</h2>
                          <p className="sub" style={{ marginTop: "6px" }}>{appt.w}</p>
                        </div>
                        <div className="card" style={{ gap: 0, padding: "4px 18px" }}>
                          {[
                            ["Protocol", "The Edit · step 2 strength"],
                            ["Duration", "42 min"],
                            ["Observations", "Mild redness on the cheeks, settled in 10 min"],
                            ["Pack", "Session 1 of 3 deducted"],
                          ].map(([lbl, val], idx) => (
                            <div key={idx} className="trk" style={{ alignItems: "flex-start" }}>
                              <span className="k" style={{ paddingTop: "3px" }}>{lbl}</span>
                              <span style={{ textAlign: "right", fontSize: "14px" }}>{val}</span>
                            </div>
                          ))}
                        </div>
                        {x?.care && (
                          <div className="card inv" style={{ gap: "6px" }}>
                            <span className="k">Aftercare</span>
                            <p style={{ margin: 0, fontSize: "14px" }}>{x.care}</p>
                          </div>
                        )}
                        {appt.svc && (
                          <button
                            type="button"
                            className="btn"
                            onClick={() => handleAction(`sheet:svc:${appt.svc}`)}
                          >
                            Book the next session
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ─── TOAST NOTIFICATION ─── */}
            {toastMessage && (
              <div className="toast" role="status">
                <span>{toastMessage}</span>
                <button
                  type="button"
                  onClick={() => setToastMessage(null)}
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </LivScope>
  );
}

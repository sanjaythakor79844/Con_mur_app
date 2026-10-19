import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiService } from "@/lib/api-service";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { saveUserProfile, type UserProfile } from "@/lib/user-profile";
import {
  LivScope,
  LivCard,
  LivHeading,
  LivLabel,
  LivNumber,
  LivSubtext,
  LivPill,
  LivButton,
  LivSegmented,
  LivMark,
} from "@/components/liv";
import { Icon } from "@/components/aaha";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier | null;
  }
}

export const Route = createFileRoute("/liv")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { view?: "splash" | "story" | "signup" | "signin" | "welcome" } => {
    const v = search.view;
    if (v === "splash" || v === "story" || v === "signup" || v === "signin" || v === "welcome") {
      return { view: v };
    }
    return { view: "splash" };
  },
  head: () => ({
    meta: [
      { title: "Liv Living Lab — Preventive Longevity | Aaha Companion" },
      {
        name: "description",
        content:
          "Longevity, measured. Connect with your Living Lab kiosk screening, your AIWS score, and your 90-day plan.",
      },
    ],
  }),
  component: LivOnboardingScreen,
});

// ─── 4-Part Story Data (from liv-app-prototype.html) ──────────────────────────

interface StorySlide {
  title: string;
  description: string;
  visual: "pulse" | "range" | "ring" | "path";
}

const STORIES: StorySlide[] = [
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
      "Blood, body, sleep and lifestyle in a single score out of 100.",
    visual: "ring",
  },
  {
    title: "Measure. Act. Re-measure.",
    description:
      "A 90-day plan, a care team and Liv by your side until your next kiosk visit.",
    visual: "path",
  },
];

const isValidIndianPhone = (v: string) => /^[6-9]\d{9}$/.test(v.trim());

// ─── Main Liv Onboarding Component ───────────────────────────────────────────

function LivOnboardingScreen() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const { t } = useI18n();

  // Active view: splash | story | signup | signin | welcome
  const [currentView, setCurrentView] = useState<
    "splash" | "story" | "signup" | "signin" | "welcome"
  >(search.view || "splash");

  // Story state
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyPaused, setStoryPaused] = useState(false);

  // Authentication form fields
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"Female" | "Male" | "Other">("Female");
  const [referralName, setReferralName] = useState("");
  const [consentGiven, setConsentGiven] = useState(true);

  // Auth flow state
  const [authMode, setAuthMode] = useState<"otp" | "google">("otp");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpErrorShake, setOtpErrorShake] = useState(false);

  const otpInputRef = useRef<HTMLInputElement>(null);

  // Sync with search parameter if changed externally
  useEffect(() => {
    if (search.view) {
      setCurrentView(search.view);
    }
  }, [search.view]);

  // Clean up reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch {
          // ignore
        }
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  // Countdown timer for resending OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto-advance splash after 3.5s
  useEffect(() => {
    if (currentView === "splash") {
      const timer = setTimeout(() => {
        setCurrentView("story");
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [currentView]);

  // Auto-advance story slides if not paused
  useEffect(() => {
    if (currentView === "story" && !storyPaused) {
      const timer = setTimeout(() => {
        setStoryIndex((prev) => (prev + 1) % STORIES.length);
      }, 5200);
      return () => clearTimeout(timer);
    }
  }, [currentView, storyIndex, storyPaused]);

  // Focus OTP input once sent
  useEffect(() => {
    if (otpSent && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [otpSent]);

  // Initialize invisible reCAPTCHA
  const getOrCreateRecaptcha = () => {
    if (typeof window === "undefined") return null;

    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch {
        // ignore
      }
      window.recaptchaVerifier = null;
    }

    const container = document.getElementById("recaptcha-container");
    if (container) {
      container.innerHTML = "";
    }

    const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: () => {
        console.log("✅ Liv reCAPTCHA solved");
      },
      "expired-callback": () => {
        toast.error("Security verification expired. Please try again.");
      },
    });

    window.recaptchaVerifier = verifier;
    return verifier;
  };

  // ─── Firebase OTP Sending ───────────────────────────────────────────────────

  const handleSendOtp = async (isSignup: boolean) => {
    if (busy) return;

    if (!isValidIndianPhone(phoneNumber)) {
      toast.error(t("Enter a 10-digit mobile number"));
      return;
    }

    if (isSignup) {
      if (fullName.trim().length < 2) {
        toast.error(t("Enter your full name"));
        return;
      }
      const ageNum = parseInt(age, 10);
      if (!age || ageNum < 18 || ageNum > 110) {
        toast.error(t("Age must be 18 or older"));
        return;
      }
      if (!consentGiven) {
        toast.error(t("Tick the consent box to continue"));
        return;
      }
    }

    setBusy(true);

    try {
      const verifier = getOrCreateRecaptcha();
      if (!verifier) throw new Error("Could not initialize security verification");

      const formattedPhone = "+91" + phoneNumber.trim();
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);

      setConfirmationResult(confirmation);
      setOtpSent(true);
      setCountdown(30);
      toast.success(t("Code sent"), {
        description: `${t("We sent a 6-digit code by SMS to")} ${formattedPhone}`,
      });
    } catch (err) {
      console.error("Firebase OTP error:", err);
      const fbErr = err as { code?: string; message?: string };
      if (fbErr?.code === "auth/too-many-requests") {
        toast.error(t("Too many attempts. Please wait a few minutes."));
      } else if (fbErr?.code === "auth/invalid-phone-number") {
        toast.error(t("Invalid mobile number."));
      } else {
        toast.error(t("Could not send code. Please check your connection."));
      }
    } finally {
      setBusy(false);
    }
  };

  // ─── Firebase OTP Verification ─────────────────────────────────────────────

  const handleVerifyOtp = async (isSignup: boolean) => {
    if (busy) return;
    if (otpCode.length !== 6) {
      setOtpErrorShake(true);
      setTimeout(() => setOtpErrorShake(false), 500);
      toast.error(t("Enter the 6-digit code"));
      return;
    }

    setBusy(true);

    try {
      if (!confirmationResult) {
        throw new Error("Request an OTP code first");
      }

      const result = await confirmationResult.confirm(otpCode);
      const token = await result.user.getIdToken();

      localStorage.removeItem("aaha_demo_session");
      apiService.setToken(token);

      // Check for existing patient profile
      let patientFound = false;
      try {
        await apiService.getMyProfile();
        patientFound = true;
      } catch {
        try {
          await apiService.linkPatientByPhone(result.user.phoneNumber || "+91" + phoneNumber);
          patientFound = true;
        } catch {
          console.log("No existing kiosk profile found for mobile.");
        }
      }

      // If signin and not found, inform user
      if (!isSignup && !patientFound) {
        await auth.signOut();
        apiService.setToken(null);
        toast.error(t("Account not found"), {
          description: t("Please create an account first to continue."),
        });
        setCurrentView("signup");
        setOtpSent(false);
        setOtpCode("");
        setBusy(false);
        return;
      }

      // If signup and not found, create new patient record
      if (isSignup && !patientFound) {
        const parts = fullName.trim().split(/\s+/);
        const fName = parts[0] || "Patient";
        const lName = parts.slice(1).join(" ") || "";
        const ageNum = parseInt(age, 10) || 25;

        const profile: UserProfile = {
          uid: result.user.uid,
          phoneNumber: result.user.phoneNumber || "+91" + phoneNumber,
          firstName: fName,
          lastName: lName,
          age: ageNum,
          gender: sex.toLowerCase() as "male" | "female" | "other",
          createdAt: new Date().toISOString(),
        };

        saveUserProfile(profile);

        try {
          await apiService.createPatient({
            mobile_number: result.user.phoneNumber || "+91" + phoneNumber,
            full_name: fullName.trim(),
            age: ageNum,
            gender: sex,
            referred_by: referralName.trim() || undefined,
          });
        } catch (apiErr) {
          console.error("Patient creation note:", apiErr);
        }
      }

      // Save consent flag
      if (typeof window !== "undefined") {
        window.localStorage.setItem("aaha.onboarded", "true");
        window.localStorage.setItem("liv.onboarded", "true");
        window.localStorage.setItem("aaha.consent", JSON.stringify(["health", "report", "liv"]));
      }

      toast.success(isSignup ? t("Account created") : t("Signed in"), {
        description: t("Welcome to Liv."),
      });

      // Move to Liv welcome / post-auth confirmation view
      setCurrentView("welcome");
    } catch (err) {
      console.error("Verification error:", err);
      setOtpErrorShake(true);
      setTimeout(() => setOtpErrorShake(false), 500);
      toast.error(t("The code is incorrect or expired"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <LivScope
      theme="dark"
      className="h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-full flex flex-col items-center justify-start sm:justify-center p-0 overflow-hidden"
    >
      {/* Invisible container for Firebase reCAPTCHA */}
      <div id="recaptcha-container" />

      {/* Main container simulating the phone shell or responsive card */}
      <main className="w-full max-w-[430px] h-[100dvh] max-h-[100dvh] flex flex-col bg-[var(--liv-bg)] text-[var(--liv-text)] relative overflow-hidden sm:my-6 sm:h-auto sm:min-h-[840px] sm:max-h-[90vh] sm:rounded-[36px] sm:border sm:border-[var(--liv-line)] sm:shadow-2xl">

        {/* ─── Top Brand Navigation Bar (for non-splash views) ─── */}
        {currentView !== "splash" && (
          <header className="flex items-center justify-between px-5 pt-4 pb-2 z-10 shrink-0">
            <button
              type="button"
              onClick={() => setCurrentView("splash")}
              className="flex items-center gap-2 group focus-visible:outline-none"
              aria-label="Return to Liv Splash"
            >
              <LivMark size={22} />
              <span className="liv-wm text-[12px] tracking-[0.3em]">Liv</span>
            </button>

            <div className="flex items-center gap-2">
              <Link
                to="/home"
                className="text-[11px] font-mono uppercase tracking-wider text-[var(--liv-text)] hover:opacity-80 transition-opacity px-2.5 py-1 rounded-lg border border-[var(--liv-line2)] bg-[var(--liv-surf2)]"
              >
                Dashboard
              </Link>
              <Link
                to="/welcome"
                className="text-[11px] font-mono uppercase tracking-wider text-[var(--liv-muted)] hover:text-[var(--liv-text)] transition-colors px-2 py-1 rounded-lg"
              >
                Overview
              </Link>
            </div>
          </header>
        )}

        {/* ─── 1. SPLASH SCREEN ─── */}
        {currentView === "splash" && (
          <section
            className="liv-splash flex-1 flex flex-col items-center justify-center cursor-pointer select-none"
            onClick={() => setCurrentView("story")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setCurrentView("story");
            }}
            aria-label="Liv Longevity, measured. Click to start."
          >
            <LivMark size={118} />
            <div className="space-y-1">
              <span className="liv-wm text-[15px] tracking-[0.45em]">Liv</span>
              <p className="liv-tag text-[19px]">Longevity, measured.</p>
            </div>

            <div className="mt-8 flex flex-col items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-[var(--liv-faint)]">
                {t("Tap anywhere to begin")}
              </span>
              <span className="text-[18px] text-[var(--liv-muted)] animate-bounce">↓</span>
            </div>
          </section>
        )}

        {/* ─── 2. STORY / EXPLAINER SCREEN (4 PARTS) ─── */}
        {currentView === "story" && (
          <div className="flex-1 min-h-0 flex flex-col px-5 pt-2 pb-8 overflow-y-auto no-scrollbar touch-pan-y overscroll-contain">
            {/* Story Card Component */}
            <div
              className={`liv-story mb-4 ${storyPaused ? "paused" : ""}`}
              role="region"
              aria-label="What Liv is, in four short stories"
            >
              {/* Progress bars (1 to 4) */}
              <div className="liv-sbars">
                {STORIES.map((_, idx) => (
                  <i
                    key={idx}
                    className={
                      idx < storyIndex ? "done" : idx === storyIndex ? "on" : ""
                    }
                  />
                ))}
              </div>

              {/* Story Header */}
              <div className="liv-stop">
                <div className="who">
                  <LivMark size={18} />
                  <span>Liv</span>
                  <span className="font-mono text-[10px] text-[var(--liv-muted)]">
                    {storyIndex + 1}/{STORIES.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setStoryPaused((p) => !p)}
                  aria-label={storyPaused ? "Resume story" : "Pause story"}
                  className="size-8 rounded-full flex items-center justify-center text-[var(--liv-text)] hover:bg-[var(--liv-line)] transition-colors"
                >
                  <Icon name={storyPaused ? "play_arrow" : "pause"} className="text-[18px]" />
                </button>
              </div>

              {/* Animated Visual Slot */}
              <div className="liv-sv" aria-hidden="true">
                {STORIES[storyIndex].visual === "pulse" && (
                  <svg viewBox="0 0 92 92" fill="none" className="w-full h-full">
                    <circle
                      className="pulse"
                      cx="46"
                      cy="46"
                      r="42"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                    <circle
                      className="pulse d2"
                      cx="46"
                      cy="46"
                      r="42"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                    <circle cx="46" cy="46" r="6" fill="currentColor" />
                  </svg>
                )}

                {STORIES[storyIndex].visual === "range" && (
                  <svg viewBox="0 0 92 92" fill="none" className="w-full h-full">
                    <path
                      d="M6 46h30"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M42 46h20"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeDasharray="2 4"
                    />
                    <path
                      d="M68 46h18"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeLinecap="round"
                      opacity="0.3"
                    />
                    <g className="slide">
                      <circle
                        cx="62"
                        cy="46"
                        r="8"
                        fill="var(--liv-surf)"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <circle cx="62" cy="46" r="3" fill="currentColor" />
                    </g>
                  </svg>
                )}

                {STORIES[storyIndex].visual === "ring" && (
                  <svg viewBox="0 0 92 92" fill="none" className="w-full h-full">
                    <circle
                      cx="46"
                      cy="46"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="3"
                      opacity="0.2"
                    />
                    <circle
                      className="ringdraw"
                      cx="46"
                      cy="46"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      transform="rotate(-90 46 46)"
                    />
                    <text
                      x="46"
                      y="56"
                      textAnchor="middle"
                      fill="currentColor"
                      fontFamily="Cormorant Garamond, Georgia, serif"
                      fontSize="30"
                      fontWeight="500"
                    >
                      69
                    </text>
                  </svg>
                )}

                {STORIES[storyIndex].visual === "path" && (
                  <svg viewBox="0 0 92 92" fill="none" className="w-full h-full">
                    <path
                      d="M13 60 46 38 79 60"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeDasharray="2 4"
                    />
                    <circle cx="13" cy="60" r="3" fill="currentColor" />
                    <circle cx="46" cy="38" r="3" fill="currentColor" />
                    <circle cx="79" cy="60" r="3" fill="currentColor" />
                    <circle
                      className="hop"
                      cx="13"
                      cy="60"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                  </svg>
                )}
              </div>

              {/* Story Copy */}
              <div className="liv-sbody">
                <h2>{STORIES[storyIndex].title}</h2>
                <p>{STORIES[storyIndex].description}</p>
              </div>

              {/* Tap Left / Right Nav Overlays */}
              <button
                type="button"
                className="liv-snav l"
                onClick={() =>
                  setStoryIndex((prev) => (prev - 1 + STORIES.length) % STORIES.length)
                }
                aria-label="Previous story"
              />
              <button
                type="button"
                className="liv-snav r"
                onClick={() =>
                  setStoryIndex((prev) => (prev + 1) % STORIES.length)
                }
                aria-label="Next story"
              />

              <span className="liv-shint">{t("Tap to skip")}</span>
            </div>

            {/* Stepper Dots & Skip */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-1.5">
                {STORIES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setStoryIndex(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      i === storyIndex
                        ? "w-6 bg-[var(--liv-text)]"
                        : "w-2 bg-[var(--liv-line2)] hover:bg-[var(--liv-muted)]"
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCurrentView("signup")}
                className="text-[12px] font-mono uppercase tracking-wider text-[var(--liv-muted)] hover:text-[var(--liv-text)] transition-colors"
              >
                {t("Skip intro")} →
              </button>
            </div>

            {/* Onboarding Value Highlights */}
            <div className="my-auto space-y-3 py-3">
              <LivCard className="p-3.5 space-y-1">
                <LivLabel>{t("Living Lab Kiosk Sync")}</LivLabel>
                <LivHeading level={3}>300+ biomarkers, 1 single report</LivHeading>
                <LivSubtext>
                  No manual data entry required. Your measurements from the centre sync directly with your mobile number.
                </LivSubtext>
              </LivCard>

              <LivCard className="p-3.5 space-y-1">
                <LivLabel>{t("Form Over Hue")}</LivLabel>
                <LivHeading level={3}>Precision clinical thresholds</LivHeading>
                <LivSubtext>
                  Solid markers highlight priority targets, outlined markers indicate borderline drift, and muted markers represent optimal longevity.
                </LivSubtext>
              </LivCard>
            </div>

            {/* Bottom Actions */}
            <div className="mt-auto pt-4 space-y-2.5">
              <LivButton
                variant="primary"
                onClick={() => setCurrentView("signup")}
              >
                {t("Create Account")}
              </LivButton>

              <LivButton
                variant="ghost"
                onClick={() => setCurrentView("signin")}
              >
                {t("Already a member? Sign In")}
              </LivButton>
            </div>
          </div>
        )}

        {/* ─── 3. SIGN UP FORM WITH REAL FIREBASE AUTH ─── */}
        {currentView === "signup" && (
          <div className="flex-1 min-h-0 flex flex-col px-5 pt-2 pb-12 overflow-y-auto no-scrollbar touch-pan-y overscroll-contain">
            {!otpSent ? (
              // Step 1: Account Information Form
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSendOtp(true);
                }}
                className="flex flex-col gap-3.5"
              >
                <div>
                  <LivHeading level={1}>Create your account</LivHeading>
                  <LivSubtext className="mt-1">
                    Four details. Under a minute.
                  </LivSubtext>
                </div>

                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="liv-k block" htmlFor="liv-name">
                    {t("Full name")} *
                  </label>
                  <input
                    id="liv-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Kaveri Bhosle"
                    className="w-full h-12 rounded-2xl border border-[var(--liv-line)] bg-[var(--liv-surf)] px-4 text-[15px] text-[var(--liv-text)] outline-none focus:border-[var(--liv-text)] transition-colors"
                  />
                </div>

                {/* Mobile Number */}
                <div className="space-y-1.5">
                  <label className="liv-k block" htmlFor="liv-phone">
                    {t("Mobile number")} *
                  </label>
                  <div className="flex items-center h-12 rounded-2xl border border-[var(--liv-line)] bg-[var(--liv-surf)] overflow-hidden focus-within:border-[var(--liv-text)] transition-colors">
                    <span className="px-3.5 text-sm font-mono text-[var(--liv-muted)] bg-[var(--liv-surf2)] h-full flex items-center border-r border-[var(--liv-line)]">
                      +91
                    </span>
                    <input
                      id="liv-phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="9876543210"
                      className="w-full h-full px-4 text-[15px] text-[var(--liv-text)] bg-transparent outline-none"
                    />
                  </div>
                </div>

                {/* Age & Sex Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="liv-k block" htmlFor="liv-age">
                      {t("Age")} *
                    </label>
                    <input
                      id="liv-age"
                      type="number"
                      min={18}
                      max={110}
                      required
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="42"
                      className="w-full h-12 rounded-2xl border border-[var(--liv-line)] bg-[var(--liv-surf)] px-4 text-[15px] text-[var(--liv-text)] outline-none focus:border-[var(--liv-text)] transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="liv-k block">{t("Sex")} *</label>
                    <LivSegmented
                      value={sex}
                      onChange={(val) => setSex(val as "Female" | "Male" | "Other")}
                      options={[
                        { id: "Female", label: "F" },
                        { id: "Male", label: "M" },
                        { id: "Other", label: "O" },
                      ]}
                      className="h-12"
                    />
                  </div>
                </div>

                {/* Referral / Centre Code (Optional) */}
                <div className="space-y-1.5">
                  <label className="liv-k block" htmlFor="liv-ref">
                    {t("Referred by or Nurse name (optional)")}
                  </label>
                  <input
                    id="liv-ref"
                    type="text"
                    value={referralName}
                    onChange={(e) => setReferralName(e.target.value)}
                    placeholder="e.g. Trupti / Aundh Kiosk"
                    className="w-full h-12 rounded-2xl border border-[var(--liv-line)] bg-[var(--liv-surf)] px-4 text-[15px] text-[var(--liv-text)] outline-none focus:border-[var(--liv-text)] transition-colors"
                  />
                </div>

                {/* Health Data Consent Checkbox */}
                <button
                  type="button"
                  onClick={() => setConsentGiven((c) => !c)}
                  className="flex items-start gap-3 text-left pt-1 group cursor-pointer focus-visible:outline-none"
                  role="checkbox"
                  aria-checked={consentGiven}
                >
                  <span
                    className={`size-5 rounded-md border mt-0.5 flex items-center justify-center transition-all ${
                      consentGiven
                        ? "bg-[var(--liv-inv)] border-[var(--liv-inv)] text-[var(--liv-inv-fg)]"
                        : "border-[var(--liv-line2)] bg-transparent text-transparent"
                    }`}
                  >
                    <Icon name="check" className="text-[14px] font-bold" />
                  </span>
                  <span className="text-[12px] leading-relaxed text-[var(--liv-muted)] group-hover:text-[var(--liv-text)] transition-colors">
                    I agree to my health data being securely stored in India and used to calculate my longevity score and 90-day plan. I can export or delete it at any time.
                  </span>
                </button>

                {/* Submit CTA */}
                <div className="pt-3 space-y-2">
                  <LivButton
                    variant="primary"
                    type="submit"
                    disabled={busy}
                  >
                    {busy ? (
                      <span className="flex items-center gap-2">
                        <Icon name="progress_activity" className="animate-spin text-[18px]" />
                        {t("Sending verification code...")}
                      </span>
                    ) : (
                      t("Send Verification Code")
                    )}
                  </LivButton>

                  <button
                    type="button"
                    onClick={() => setCurrentView("signin")}
                    className="w-full text-center py-2 text-[13px] text-[var(--liv-muted)] hover:text-[var(--liv-text)] transition-colors"
                  >
                    {t("Already a member?")}{" "}
                    <b className="text-[var(--liv-text)] underline underline-offset-4 font-semibold">
                      {t("Sign in")}
                    </b>
                  </button>
                </div>
              </form>
            ) : (
              // Step 2: Real Firebase 6-Digit OTP Verification
              <div className="flex flex-col gap-4 py-2">
                <div>
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="flex items-center gap-1 text-[12px] font-mono uppercase tracking-wider text-[var(--liv-muted)] hover:text-[var(--liv-text)] transition-colors mb-2"
                  >
                    ← {t("Change Number")}
                  </button>
                  <LivHeading level={1}>{t("Verify mobile")}</LivHeading>
                  <LivSubtext className="mt-1">
                    {t("Enter the 6-digit code sent to")}{" "}
                    <b className="text-[var(--liv-text)] font-mono">+91 {phoneNumber}</b>
                  </LivSubtext>
                </div>

                <div
                  className={`flex justify-center my-3 ${
                    otpErrorShake ? "animate-shake" : ""
                  }`}
                >
                  <input
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="w-full max-w-[280px] h-16 text-center font-serif text-[32px] tracking-[0.5em] rounded-2xl border-2 border-[var(--liv-line2)] bg-[var(--liv-surf)] text-[var(--liv-text)] outline-none focus:border-[var(--liv-text)] transition-all"
                  />
                </div>

                <LivButton
                  variant="primary"
                  onClick={() => handleVerifyOtp(true)}
                  disabled={busy || otpCode.length !== 6}
                >
                  {busy ? (
                    <span className="flex items-center gap-2">
                      <Icon name="progress_activity" className="animate-spin text-[18px]" />
                      {t("Verifying...")}
                    </span>
                  ) : (
                    t("Verify & Complete Registration")
                  )}
                </LivButton>

                <div className="text-center pt-2">
                  {countdown > 0 ? (
                    <p className="text-[12px] font-mono text-[var(--liv-muted)]">
                      {t("Resend code in")} 0:{countdown < 10 ? `0${countdown}` : countdown}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOtp(true)}
                      className="text-[12px] font-mono text-[var(--liv-text)] underline underline-offset-4 hover:opacity-80"
                    >
                      {t("Resend code")}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── 4. SIGN IN FORM WITH REAL FIREBASE AUTH ─── */}
        {currentView === "signin" && (
          <div className="flex-1 min-h-0 flex flex-col px-5 pt-4 pb-12 overflow-y-auto no-scrollbar touch-pan-y overscroll-contain">
            <div className="flex flex-col items-center text-center mb-4">
              <LivMark size={72} />
              <LivHeading level={1} className="mt-3">
                {t("Welcome back")}
              </LivHeading>
              <LivSubtext className="mt-1">
                {t("Sign in to see your longevity score and plan.")}
              </LivSubtext>
            </div>

            {/* Mode Segmented Control: Mobile OTP vs Google */}
            <div className="mb-4">
              <LivSegmented
                value={authMode}
                onChange={(m) => {
                  setAuthMode(m as "otp" | "google");
                  setOtpSent(false);
                }}
                options={[
                  { id: "otp", label: "Mobile OTP" },
                  { id: "google", label: "Google" },
                ]}
                className="h-11"
              />
            </div>

            {authMode === "google" ? (
              // Google Provider notice per specification:
              // "Do not add Google Sign-In unless the existing Firebase Google provider and its complete working flow are verified.
              // If not implemented, mark it as a separate pending feature rather than displaying a fake working button."
              <LivCard className="p-5 text-center space-y-3 border-dashed">
                <LivLabel>{t("Coming Soon")}</LivLabel>
                <LivHeading level={3}>Google Sign-In at Living Lab</LivHeading>
                <LivSubtext>
                  Google Authentication is currently available on Living Lab Kiosk stations. For the Consumer App, please sign in using your verified Mobile OTP.
                </LivSubtext>
                <LivButton
                  variant="primary"
                  onClick={() => setAuthMode("otp")}
                  className="sm:min-h-[44px]"
                >
                  {t("Use Mobile OTP")}
                </LivButton>
              </LivCard>
            ) : !otpSent ? (
              // Mobile Number Input
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSendOtp(false);
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="liv-k block" htmlFor="signin-phone">
                    {t("Mobile number")}
                  </label>
                  <div className="flex items-center h-12 rounded-2xl border border-[var(--liv-line)] bg-[var(--liv-surf)] overflow-hidden focus-within:border-[var(--liv-text)] transition-colors">
                    <span className="px-3.5 text-sm font-mono text-[var(--liv-muted)] bg-[var(--liv-surf2)] h-full flex items-center border-r border-[var(--liv-line)]">
                      +91
                    </span>
                    <input
                      id="signin-phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="9876543210"
                      className="w-full h-full px-4 text-[15px] text-[var(--liv-text)] bg-transparent outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-[var(--liv-muted)]">
                    {t("We send a 6-digit code by SMS to confirm it is you.")}
                  </p>
                </div>

                <LivButton
                  variant="primary"
                  type="submit"
                  disabled={busy}
                >
                  {busy ? (
                    <span className="flex items-center gap-2">
                      <Icon name="progress_activity" className="animate-spin text-[18px]" />
                      {t("Sending code...")}
                    </span>
                  ) : (
                    t("Send code")
                  )}
                </LivButton>
              </form>
            ) : (
              // 6-digit OTP code verification
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <LivSubtext>
                    Code sent to <b className="text-[var(--liv-text)] font-mono">+91 {phoneNumber}</b>
                  </LivSubtext>
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="text-[12px] font-mono text-[var(--liv-text)] underline"
                  >
                    {t("Change")}
                  </button>
                </div>

                <div
                  className={`flex justify-center ${
                    otpErrorShake ? "animate-shake" : ""
                  }`}
                >
                  <input
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="w-full max-w-[280px] h-16 text-center font-serif text-[32px] tracking-[0.5em] rounded-2xl border-2 border-[var(--liv-line2)] bg-[var(--liv-surf)] text-[var(--liv-text)] outline-none focus:border-[var(--liv-text)] transition-all"
                  />
                </div>

                <LivButton
                  variant="primary"
                  onClick={() => handleVerifyOtp(false)}
                  disabled={busy || otpCode.length !== 6}
                >
                  {busy ? (
                    <span className="flex items-center gap-2">
                      <Icon name="progress_activity" className="animate-spin text-[18px]" />
                      {t("Verifying...")}
                    </span>
                  ) : (
                    t("Verify and continue")
                  )}
                </LivButton>

                <div className="text-center pt-2">
                  {countdown > 0 ? (
                    <p className="text-[12px] font-mono text-[var(--liv-muted)]">
                      {t("Resend code in")} 0:{countdown < 10 ? `0${countdown}` : countdown}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOtp(false)}
                      className="text-[12px] font-mono text-[var(--liv-text)] underline underline-offset-4 hover:opacity-80"
                    >
                      {t("Resend code")}
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="mt-auto pt-6 text-center">
              <button
                type="button"
                onClick={() => setCurrentView("signup")}
                className="text-[13px] text-[var(--liv-muted)] hover:text-[var(--liv-text)] transition-colors"
              >
                {t("New here?")}{" "}
                <b className="text-[var(--liv-text)] underline underline-offset-4 font-semibold">
                  {t("Create an account")}
                </b>
              </button>
            </div>
          </div>
        )}

        {/* ─── 5. POST-AUTH WELCOME / CONFIRMATION SCREEN (vWelcome) ─── */}
        {currentView === "welcome" && (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-start text-center px-6 pt-6 pb-12 overflow-y-auto no-scrollbar touch-pan-y overscroll-contain">
            {/* Animated Tick Circle */}
            <div className="relative size-24 rounded-full border border-[var(--liv-line2)] flex items-center justify-center my-2">
              <svg
                className="absolute inset-0 size-full -rotate-90"
                viewBox="0 0 96 96"
                fill="none"
              >
                <circle
                  cx="48"
                  cy="48"
                  r="46"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeDasharray="289"
                  strokeDashoffset="0"
                  className="text-[var(--liv-text)]"
                />
              </svg>
              <Icon name="check" className="text-[36px] text-[var(--liv-text)]" />
            </div>

            {/* Headline */}
            <div className="space-y-2 max-w-[320px]">
              <LivLabel>{t("Account active")}</LivLabel>
              <LivHeading level={1}>
                {fullName ? `You're in, ${fullName.split(" ")[0]}.` : "You're in."}
              </LivHeading>
              <p className="font-serif italic text-[17px] leading-snug text-[var(--liv-muted)]">
                Your longevity story starts with one visit. Everything after that lives here.
              </p>
            </div>

            {/* AIWS Score Explainer */}
            <LivCard className="p-4 flex items-center gap-3.5 text-left border-[var(--liv-line)] my-3">
              <div className="size-11 rounded-2xl bg-[var(--liv-surf2)] border border-[var(--liv-line2)] flex items-center justify-center shrink-0">
                <span className="font-mono text-[11px] font-bold text-[var(--liv-text)]">
                  AIWS
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-[var(--liv-text)] leading-tight">
                  Active Integrated Wellness Score
                </p>
                <p className="text-[11px] text-[var(--liv-muted)] mt-0.5 leading-relaxed">
                  One number out of 100 for your whole body. Your longevity benchmark across 8 systems.
                </p>
              </div>
            </LivCard>

            {/* 3 Steps Forward */}
            <div className="w-full space-y-2.5 text-left my-2">
              <div className="flex items-start gap-3 text-[13px]">
                <b className="font-serif text-[18px] text-[var(--liv-muted)] w-4 shrink-0">1</b>
                <div>
                  <span className="font-semibold text-[var(--liv-text)]">Mobile synced</span>
                  <small className="block text-[var(--liv-muted)] text-[11px]">
                    Firebase phone verification completed.
                  </small>
                </div>
              </div>

              <div className="flex items-start gap-3 text-[13px]">
                <b className="font-serif text-[18px] text-[var(--liv-muted)] w-4 shrink-0">2</b>
                <div>
                  <span className="font-semibold text-[var(--liv-text)]">We find your kiosk screening</span>
                  <small className="block text-[var(--liv-muted)] text-[11px]">
                    Your longevity report arrives in the app by itself.
                  </small>
                </div>
              </div>

              <div className="flex items-start gap-3 text-[13px]">
                <b className="font-serif text-[18px] text-[var(--liv-muted)] w-4 shrink-0">3</b>
                <div>
                  <span className="font-semibold text-[var(--liv-text)]">Your AIWS score and plan</span>
                  <small className="block text-[var(--liv-muted)] text-[11px]">
                    Three priorities, daily steps, and care team access.
                  </small>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="w-full pt-4 space-y-2.5">
              <LivButton
                variant="primary"
                onClick={() => navigate({ to: "/home" })}
              >
                {t("Continue to Health Dashboard")} →
              </LivButton>

              <LivButton
                variant="ghost"
                onClick={() => navigate({ to: "/welcome" })}
              >
                {t("Go to Classic Aaha Home")}
              </LivButton>
            </div>
          </div>
        )}
      </main>
    </LivScope>
  );
}

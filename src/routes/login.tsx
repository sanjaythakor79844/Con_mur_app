import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Btn, Icon } from "@/components/aaha";
import { useAuth } from "@/hooks/use-auth";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { saveUserProfile, type UserProfile } from "@/lib/user-profile";
import { apiService } from "@/lib/api-service";
import { useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier | null;
  }
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { mode?: "signin" | "signup"; redirect?: string } => {
    return {
      mode: search.mode === "signup" ? "signup" : search.mode === "signin" ? "signin" : undefined,
      redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Sign in with your mobile | Aaha Consumer App" },
      {
        name: "description",
        content:
          "Sign in with your mobile number to reach your screening results, reports and consultations.",
      },
      { property: "og:title", content: "Sign in with your mobile | Aaha Consumer App" },
      { property: "og:description", content: "Secure mobile sign in to your Aaha health records." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginScreen,
});

const isValidPhone = (value: string) => /^[6-9]\d{9}$/.test(value.trim());

function LoginScreen() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { lang, setLang, t } = useI18n();
  const { session, loading } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">(search.mode || "signin");

  // Form fields
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [referralName, setReferralName] = useState(""); // Referral / Nurse Name
  const [consented, setConsented] = useState(true);

  const [busy, setBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  const otpInputRef = useRef<HTMLInputElement>(null);

  // Sync mode with query parameter if present
  useEffect(() => {
    if (search.mode && (search.mode === "signin" || search.mode === "signup")) {
      setMode(search.mode);
    }
  }, [search.mode]);

  // If already logged in, navigate to destination or /home
  useEffect(() => {
    if (!loading && session) {
      const dest = search.redirect || "/home";
      void navigate({ to: dest as any, replace: true });
    }
  }, [loading, session, navigate, search.redirect]);

  // Resend OTP countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto-focus OTP input once sent
  useEffect(() => {
    if (otpSent && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [otpSent]);

  // Cleanup reCAPTCHA on unmount
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

  const getOrCreateRecaptcha = () => {
    if (typeof window === "undefined") return null;

    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {
        console.log("Cleared old recaptcha", e);
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
        console.log("reCAPTCHA verified");
      },
      "expired-callback": () => {
        console.warn("reCAPTCHA expired");
        toast.error("Security verification expired. Please try again.");
      },
    });

    window.recaptchaVerifier = verifier;
    setRecaptchaVerifier(verifier);
    return verifier;
  };

  const friendlyError = (message: string) => {
    if (/invalid.*code|wrong.*code/i.test(message))
      return "The OTP code is incorrect. Please check and try again.";
    if (/code.*expired/i.test(message))
      return "The OTP code has expired. Please request a new one.";
    if (/too many.*request|quota.*exceeded/i.test(message))
      return "Too many attempts. Please wait a moment and try again.";
    if (/invalid.*phone/i.test(message)) return "Please enter a valid 10-digit mobile number.";
    return "Something went wrong. Please check your connection and try again.";
  };

  const validatePhone = () => {
    if (!isValidPhone(phoneNumber)) {
      toast.error(t("Please enter a valid 10-digit mobile number."));
      return false;
    }
    return true;
  };

  const validateSignup = () => {
    if (!validatePhone()) return false;
    if (firstName.trim().length < 2) {
      toast.error(t("Please enter your first name."));
      return false;
    }
    if (lastName.trim().length < 2) {
      toast.error(t("Please enter your last name."));
      return false;
    }
    const ageNum = parseInt(age);
    if (!age || ageNum < 1 || ageNum > 120) {
      toast.error(t("Please enter a valid age."));
      return false;
    }
    if (!gender) {
      toast.error(t("Please select your gender."));
      return false;
    }
    if (!consented) {
      toast.error(t("Please accept health data consent to create your account."));
      return false;
    }
    return true;
  };

  const sendOTP = async () => {
    if (busy) return;
    if (mode === "signup" ? !validateSignup() : !validatePhone()) return;

    setBusy(true);

    try {
      console.log("Initializing reCAPTCHA verifier for real OTP...");
      const verifier = getOrCreateRecaptcha();
      if (!verifier) {
        throw new Error("Could not initialize security verification");
      }

      const formattedPhone = "+91" + phoneNumber.trim();
      console.log("Sending real OTP to:", formattedPhone);

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      setCountdown(30); // 30s resend cooldown
      toast.success(t("OTP sent!"), {
        description: `${t("Verification code sent to")} ${formattedPhone}`,
      });

      console.log("Real Firebase OTP sent successfully");
    } catch (error) {
      console.error("OTP send error:", error);

      if (typeof window !== "undefined" && window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch {
          // ignore
        }
        window.recaptchaVerifier = null;
      }

      const fbError = error as { code?: string; message?: string };
      let errorMessage = "Couldn't send OTP";
      let errorDescription = fbError?.message || "Please check your network and try again.";

      if (fbError?.code === "auth/invalid-app-credential") {
        errorMessage = "Phone authentication not configured";
        errorDescription = "Firebase Phone Authentication needs to be enabled in Firebase Console";
      } else if (fbError?.code === "auth/captcha-check-failed") {
        errorMessage = "Security verification failed";
        errorDescription = "Please try again or check browser settings";
      } else if (fbError?.code === "auth/too-many-requests") {
        errorMessage = "Too many attempts";
        errorDescription = "Please wait a few minutes and try again";
      } else if (fbError?.code === "auth/invalid-phone-number") {
        errorMessage = "Invalid phone number";
        errorDescription = "Please enter a valid 10-digit mobile number";
      }

      toast.error(errorMessage, {
        description: errorDescription,
      });
    } finally {
      setBusy(false);
    }
  };

  const verifyOTP = async () => {
    if (busy) return;
    if (otp.length !== 6) {
      toast.error(t("Please enter the 6-digit OTP."));
      return;
    }

    setBusy(true);
    try {
      if (!confirmationResult) {
        throw new Error("Please request OTP first");
      }

      const result = await confirmationResult.confirm(otp);
      const token = await result.user.getIdToken();

      localStorage.removeItem("aaha_demo_session");
      apiService.setToken(token);

      // Check if patient exists in backend
      let patientExists = false;
      try {
        await apiService.getMyProfile();
        patientExists = true;
      } catch (error) {
        const err = error as { message?: string };
        console.log("Patient profile check on login:", err?.message);
        // Do NOT call POST /patients/link-by-phone until confirmed live by backend developer.
      }

      if (mode === "signin" && !patientExists) {
        // Patient record not yet linked to this Firebase UID in backend
        // Do NOT call POST /patients/link-by-phone until confirmed live by backend developer.
        toast.info(t("Welcome to Aaha"), {
          description: t("Kiosk profile linking will sync once backend confirms linking."),
        });
      }

      if (mode === "signup" && !patientExists) {
        const safeFirstName = firstName.trim() || "Patient";
        const safeLastName = lastName.trim() || "";
        const safeAge = parseInt(age) || 25;
        const safeGender = (gender as "male" | "female" | "other") || "male";

        const profile: UserProfile = {
          uid: result.user.uid,
          phoneNumber: result.user.phoneNumber || "+91" + phoneNumber,
          firstName: safeFirstName,
          lastName: safeLastName,
          age: safeAge,
          gender: safeGender,
          createdAt: new Date().toISOString(),
        };

        saveUserProfile(profile);

        const formattedGender = safeGender.charAt(0).toUpperCase() + safeGender.slice(1);
        try {
          await apiService.createPatient({
            mobile_number: result.user.phoneNumber || "+91" + phoneNumber,
            full_name: `${safeFirstName} ${safeLastName}`.trim(),
            age: safeAge,
            gender: formattedGender,
            referred_by: referralName.trim() || undefined,
          });
          console.log("Patient created in backend");
        } catch (error) {
          console.error("Backend patient note:", error);
          throw new Error("Failed to create profile. Please try again.");
        }
      }

      // Record required consent and onboarding state
      if (typeof window !== "undefined") {
        window.localStorage.setItem("aaha.onboarded", "true");
        if (!window.localStorage.getItem("aaha.consent")) {
          window.localStorage.setItem("aaha.consent", JSON.stringify(["health", "report"]));
        }
      }

      toast.success(mode === "signup" ? t("Account created") : t("Signed in"), {
        description: t("Welcome to Aaha."),
      });

      const dest = search.redirect || "/home";
      void navigate({ to: dest as any });
    } catch (error) {
      console.error("OTP verification error:", error);
      toast.error("Verification failed", {
        description: error instanceof Error ? friendlyError(error.message) : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background sm:border-x sm:border-border/60">
      <div id="recaptcha-container"></div>

      {/* Top Header with Back to Selector & Language Switcher */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/80 bg-card/95 px-4 backdrop-blur">
        <button
          type="button"
          onClick={() => {
            if (otpSent) {
              setOtpSent(false);
              setOtp("");
              setConfirmationResult(null);
            } else {
              void navigate({ to: "/" });
            }
          }}
          className="flex size-9 items-center justify-center rounded-xl text-foreground hover:bg-muted/60 transition-colors"
          aria-label="Back"
        >
          <Icon name="arrow_back" className="text-[20px]" />
        </button>

        <div className="flex items-center gap-1.5">
          <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
            <Icon name="favorite" className="text-[16px]" />
          </span>
          <span className="text-base font-bold tracking-tight text-foreground">Aaha Consumer</span>
        </div>

        {/* Quick Language Toggle */}
        <div className="flex items-center rounded-full border border-border/80 bg-muted/60 p-0.5">
          {[
            { code: "en", label: "EN" },
            { code: "hi", label: "हिं" },
            { code: "mr", label: "मरा" },
          ].map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => setLang(item.code as Lang)}
              className={cn(
                "h-6 px-2 rounded-full text-[11px] font-semibold transition-all",
                lang === item.code
                  ? "bg-card text-primary shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Form Canvas */}
      <div className="flex-1 px-5 pt-5 pb-8 sm:px-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {otpSent
              ? t("Verify your mobile")
              : mode === "signin"
                ? t("Sign in with your mobile")
                : t("Create your account")}
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {otpSent
              ? t("Enter the 6-digit verification code sent to your mobile.")
              : mode === "signin"
                ? t("Access your screening results, medical reports, and consultations.")
                : t("Enter your basic details to link your kiosk screening and reports.")}
          </p>
        </div>

        {/* Mode Toggle (Sign In / Sign Up) */}
        {!otpSent && (
          <div className="mb-5 grid grid-cols-2 rounded-2xl border border-border/80 bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                void navigate({ to: "/login", search: { mode: "signin", redirect: search.redirect } });
              }}
              className={cn(
                "h-10 rounded-xl text-xs font-bold transition-all",
                mode === "signin"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t("Sign In")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                void navigate({ to: "/login", search: { mode: "signup", redirect: search.redirect } });
              }}
              className={cn(
                "h-10 rounded-xl text-xs font-bold transition-all",
                mode === "signup"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t("Create Account")}
            </button>
          </div>
        )}

        {!otpSent ? (
          <div className="space-y-4">
            {/* Phone Number Input */}
            <div>
              <label
                htmlFor="phone-input"
                className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                {t("Mobile Number")} *
              </label>
              <div className="h-[52px] rounded-2xl border border-border/80 bg-card px-3.5 flex items-center gap-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                <span className="flex items-center gap-1.5 border-r border-border/80 pr-2.5 text-sm font-bold text-foreground">
                  <span className="text-base">🇮🇳</span>
                  <span>+91</span>
                </span>
                <input
                  id="phone-input"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && phoneNumber.length === 10 && !busy) void sendOTP();
                  }}
                  placeholder="98765 43210"
                  maxLength={10}
                  className="w-full bg-transparent text-[16px] font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground/50 tracking-wider"
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {t("We'll send an OTP to verify your mobile number.")}
              </p>
            </div>

            {/* Additional Fields for Sign Up */}
            {mode === "signup" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="first-name-input"
                      className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5"
                    >
                      {t("First Name")} *
                    </label>
                    <div className="h-[52px] rounded-2xl border border-border/80 bg-card px-3.5 flex items-center focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                      <input
                        id="first-name-input"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="e.g. Ramesh"
                        maxLength={50}
                        className="w-full bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground/40"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="last-name-input"
                      className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5"
                    >
                      {t("Last Name")} *
                    </label>
                    <div className="h-[52px] rounded-2xl border border-border/80 bg-card px-3.5 flex items-center focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                      <input
                        id="last-name-input"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="e.g. Patil"
                        maxLength={50}
                        className="w-full bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground/40"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="age-input"
                      className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5"
                    >
                      {t("Age")} *
                    </label>
                    <div className="h-[52px] rounded-2xl border border-border/80 bg-card px-3.5 flex items-center focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                      <input
                        id="age-input"
                        type="number"
                        inputMode="numeric"
                        value={age}
                        onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 3))}
                        placeholder="e.g. 42"
                        className="w-full bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground/40"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      {t("Gender")} *
                    </label>
                    <div className="h-[52px] rounded-2xl border border-border/80 bg-card p-1 flex items-center gap-1">
                      {[
                        { id: "female", label: t("Female") },
                        { id: "male", label: t("Male") },
                        { id: "other", label: t("Other") },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setGender(item.id as any)}
                          className={cn(
                            "flex-1 h-full rounded-xl text-xs font-bold transition-all",
                            gender === item.id
                              ? "bg-primary text-primary-foreground shadow-2xs"
                              : "text-muted-foreground hover:bg-muted/60",
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Referral or Healthcare Worker ID */}
                <div>
                  <label
                    htmlFor="referral-name-input"
                    className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5"
                  >
                    {t("Referral / ASHA Worker Name")} (Optional)
                  </label>
                  <div className="h-[52px] rounded-2xl border border-border/80 bg-card px-3.5 flex items-center focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                    <input
                      id="referral-name-input"
                      type="text"
                      value={referralName}
                      onChange={(e) => setReferralName(e.target.value)}
                      placeholder={t("e.g. Sister Anita or Kiosk ID")}
                      maxLength={100}
                      className="w-full bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground/40"
                    />
                  </div>
                </div>

                {/* Explicit Health Data Consent Checkbox */}
                <div
                  onClick={() => setConsented(!consented)}
                  className={cn(
                    "flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer select-none transition-all",
                    consented ? "bg-accent/40 border-primary/30" : "bg-card border-border/80",
                  )}
                  role="checkbox"
                  aria-checked={consented}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      setConsented(!consented);
                    }
                  }}
                >
                  <div className="pt-0.5">
                    <span
                      className={cn(
                        "grid size-5 place-items-center rounded-md border text-xs transition-colors",
                        consented
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border bg-card text-transparent",
                      )}
                    >
                      <Icon name="check" className="text-[14px]" />
                    </span>
                  </div>
                  <div className="flex-1 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-bold text-foreground">
                      {t("Health Data & Care Consent")}
                    </span>
                    <p className="mt-0.5">
                      {t(
                        "I consent to Aaha securely storing my screening records and lab reports to explain results and support doctor care. You can view or change this anytime in Profile.",
                      )}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Terms and Privacy Notice */}
            <p className="pt-2 text-center text-xs text-muted-foreground leading-relaxed">
              {t("By continuing you agree to our")}{" "}
              <span className="font-semibold text-primary">{t("Terms")}</span> {t("and")}{" "}
              <span className="font-semibold text-primary">{t("Privacy Policy")}</span>.
            </p>
          </div>
        ) : (
          /* OTP Verification Stage */
          <div className="mt-5 space-y-4">
            {/* Phone Info Chip with Change option */}
            <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-card p-3.5">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-accent text-primary">
                  <Icon name="smartphone" className="text-[18px]" />
                </span>
                <div>
                  <span className="block text-xs text-muted-foreground">{t("Code sent to")}</span>
                  <span className="block text-sm font-bold text-foreground">+91 {phoneNumber}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                  setConfirmationResult(null);
                }}
                className="text-xs font-bold text-primary hover:underline px-2 py-1 rounded-lg hover:bg-muted/60 transition-colors"
              >
                {t("Change")}
              </button>
            </div>

            {/* OTP 6-Digit Input */}
            <div>
              <label
                htmlFor="otp-input"
                className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                {t("Enter 6-digit OTP")}
              </label>
              <div className="h-[56px] rounded-2xl border border-border/80 bg-card px-4 flex items-center gap-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                <Icon
                  name="password"
                  className="text-[20px] text-muted-foreground shrink-0 select-none"
                />
                <input
                  ref={otpInputRef}
                  id="otp-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && otp.length === 6 && !busy) void verifyOTP();
                  }}
                  placeholder="• • • • • •"
                  maxLength={6}
                  className="w-full bg-transparent text-[22px] font-bold tracking-[0.4em] text-foreground outline-none text-center placeholder:text-muted-foreground/30 placeholder:tracking-widest"
                />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon name="lock" className="text-[14px] text-primary" />
                <span>{t("Enter the verification code sent via SMS")}</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Area */}
      <div
        className="sticky bottom-0 z-20 border-t border-border/80 bg-card/95 px-5 py-3.5 backdrop-blur shadow-[0_-4px_16px_rgba(11,79,80,0.04)] sm:px-6"
        style={{
          paddingBottom: "max(0.875rem, calc(0.875rem + env(safe-area-inset-bottom, 0px)))",
        }}
      >
        {!otpSent ? (
          <Btn onClick={sendOTP} icon={busy ? undefined : "send"} disabled={busy} size="lg">
            {busy ? (
              <span className="flex items-center gap-2">
                <Icon name="progress_activity" className="animate-spin text-[18px]" />
                <span>{t("Sending OTP...")}</span>
              </span>
            ) : (
              t("Send OTP")
            )}
          </Btn>
        ) : (
          <div className="space-y-2.5">
            <Btn
              onClick={verifyOTP}
              icon={busy ? undefined : "verified"}
              disabled={busy || otp.length !== 6}
              size="lg"
            >
              {busy ? (
                <span className="flex items-center gap-2">
                  <Icon name="progress_activity" className="animate-spin text-[18px]" />
                  <span>{t("Verifying...")}</span>
                </span>
              ) : (
                t("Verify OTP")
              )}
            </Btn>

            {/* Resend OTP button with 30s countdown */}
            <button
              type="button"
              onClick={sendOTP}
              disabled={busy || countdown > 0}
              className={cn(
                "flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-border/80 bg-card text-xs font-bold transition-all",
                countdown > 0
                  ? "text-muted-foreground opacity-60 cursor-not-allowed"
                  : "text-foreground hover:bg-muted/60 active:scale-[0.99]",
              )}
            >
              <Icon
                name="refresh"
                className={cn("text-[16px]", countdown === 0 && "text-primary")}
              />
              <span>{countdown > 0 ? `${t("Resend OTP")} (${countdown}s)` : t("Resend OTP")}</span>
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

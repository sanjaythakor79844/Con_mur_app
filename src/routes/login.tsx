import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  GoogleAuthProvider,
  type ConfirmationResult,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { saveUserProfile, type UserProfile } from "@/lib/user-profile";
import { apiService } from "@/lib/api-service";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  LivMark,
  LivStories,
  LivIcon,
  LivPhone,
} from "@/components/liv";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier | null;
  }
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { mode?: "signin" | "signup" } => {
    return {
      mode: search.mode === "signup" ? "signup" : search.mode === "signin" ? "signin" : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Liv — Sign in or Create Account" },
      {
        name: "description",
        content: "Sign in with your mobile number to reach your screening results, reports, and 90-day plan.",
      },
      { property: "og:title", content: "Liv — Sign in or Create Account" },
      { property: "og:description", content: "Active Integrated Wellness Score and Living Lab records." },
    ],
  }),
  component: LivLoginScreen,
});

const isValidPhone = (value: string) => /^[6-9]\d{9}$/.test(value.trim());

export function LivLoginScreen() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { t } = useI18n();
  const { session, loading } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">(search.mode || "signup");
  const [authMethod, setAuthMethod] = useState<"otp" | "google">("otp");

  // Signup form fields
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"Female" | "Male" | "Other">("Female");
  const [consented, setConsented] = useState(true);

  // OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [shake, setShake] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Sync mode with query parameter
  useEffect(() => {
    if (search.mode && (search.mode === "signin" || search.mode === "signup")) {
      setMode(search.mode);
      setErrors({});
    }
  }, [search.mode]);

  // If already authenticated, redirect
  useEffect(() => {
    if (!loading && session) {
      void navigate({ to: "/home", replace: true });
    }
  }, [loading, session, navigate]);

  // Resend OTP countdown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

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
        toast.error("Security verification expired. Please try again.");
      },
    });

    window.recaptchaVerifier = verifier;
    return verifier;
  };

  const validateSignupForm = () => {
    const errs: Record<string, string> = {};
    if (fullName.trim().length < 2) {
      errs.name = "Enter your full name";
    }
    const cleanPh = phoneNumber.replace(/\D/g, "");
    if (cleanPh.length !== 10) {
      errs.phone = "Enter a 10-digit mobile number";
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      errs.email = "Enter an email like name@example.com";
    }
    const ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum) || ageNum < 18 || ageNum > 110) {
      errs.age = "18 or older";
    }
    if (!consented) {
      errs.consent = "Tick the box to continue";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSendCode = async () => {
    if (busy) return;
    if (mode === "signup" && !validateSignupForm()) return;
    if (mode === "signin") {
      const cleanPh = phoneNumber.replace(/\D/g, "");
      if (cleanPh.length !== 10) {
        setErrors({ phone: "Enter a 10-digit mobile number" });
        return;
      }
    }

    setBusy(true);
    setErrors({});

    try {
      const verifier = getOrCreateRecaptcha();
      if (!verifier) throw new Error("Could not initialize security verification");

      const cleanPh = phoneNumber.replace(/\D/g, "");
      const formattedPhone = "+91" + cleanPh;

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      setCountdown(30);
      setOtpDigits(["", "", "", "", "", ""]);
      toast.success(t("Code sent"), {
        description: `SMS code sent to ${formattedPhone}`,
      });

      setTimeout(() => {
        digitRefs.current[0]?.focus();
      }, 100);
    } catch (error: any) {
      console.error("OTP send error:", error);
      if (typeof window !== "undefined" && window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch {}
        window.recaptchaVerifier = null;
      }
      toast.error("Could not send code", {
        description: error?.message || "Please check your network and try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyCode = async (codeToVerify?: string) => {
    const fullCode = codeToVerify || otpDigits.join("");
    if (busy) return;
    if (fullCode.length !== 6) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      toast.error("Enter all six digits");
      return;
    }

    setBusy(true);

    try {
      if (!confirmationResult) throw new Error("Please request code first");

      const result = await confirmationResult.confirm(fullCode);
      const token = await result.user.getIdToken();

      localStorage.removeItem("aaha_demo_session");
      apiService.setToken(token);

      // Check if patient exists
      let patientExists = false;
      try {
        await apiService.getMyProfile();
        patientExists = true;
      } catch {
        try {
          await apiService.linkPatientByPhone(result.user.phoneNumber || "+91" + phoneNumber.replace(/\D/g, ""));
          patientExists = true;
        } catch {
          // not found
        }
      }

      if (mode === "signin" && !patientExists) {
        await auth.signOut();
        apiService.setToken(null);
        toast.error("Account not found", {
          description: "Please create your account first to continue.",
        });
        setMode("signup");
        setOtpSent(false);
        setOtpDigits(["", "", "", "", "", ""]);
        setBusy(false);
        return;
      }

      if (mode === "signup" && !patientExists) {
        const parts = fullName.trim().split(/\s+/);
        const safeFirstName = parts[0] || "Member";
        const safeLastName = parts.slice(1).join(" ") || "";
        const safeAge = parseInt(age, 10) || 42;
        const safeGender = gender || "Female";

        const profile: UserProfile = {
          uid: result.user.uid,
          phoneNumber: result.user.phoneNumber || "+91" + phoneNumber.replace(/\D/g, ""),
          firstName: safeFirstName,
          lastName: safeLastName,
          age: safeAge,
          gender: safeGender.toLowerCase() as "male" | "female" | "other",
          createdAt: new Date().toISOString(),
        };

        saveUserProfile(profile);

        try {
          await apiService.createPatient({
            mobile_number: result.user.phoneNumber || "+91" + phoneNumber.replace(/\D/g, ""),
            full_name: fullName.trim() || `${safeFirstName} ${safeLastName}`.trim(),
            age: safeAge,
            gender: safeGender,
          });
        } catch (e) {
          console.error("Patient creation note:", e);
        }
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("aaha.onboarded", "true");
        window.localStorage.setItem("aaha.consent", JSON.stringify(["health", "report"]));
      }

      if (mode === "signup") {
        void navigate({ to: "/welcome" });
      } else {
        toast.success("Welcome back");
        void navigate({ to: "/home" });
      }
    } catch (error: any) {
      console.error("OTP verify error:", error);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      toast.error("Verification failed", {
        description: error?.message || "Invalid verification code. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleAuth = async () => {
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const token = await result.user.getIdToken();

      apiService.setToken(token);
      toast.success("Signed in with Google");
      void navigate({ to: "/home" });
    } catch (e: any) {
      console.error("Google sign in error:", e);
      toast.error("Google sign in failed", {
        description: e?.message || "Please try mobile OTP instead.",
      });
    } finally {
      setBusy(false);
    }
  };

  // OTP box keyboard handling
  const handleDigitChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);

    if (digit && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }

    if (updated.every((d) => d !== "") && digit) {
      handleVerifyCode(updated.join(""));
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      const updated = [...otpDigits];
      updated[index - 1] = "";
      setOtpDigits(updated);
      digitRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      e.preventDefault();
      handleVerifyCode();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const updated = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || "";
    }
    setOtpDigits(updated);

    const nextIndex = Math.min(5, pasted.length);
    digitRefs.current[nextIndex]?.focus();

    if (pasted.length === 6) {
      handleVerifyCode(pasted);
    }
  };

  const cleanPh = phoneNumber.replace(/\D/g, "");
  const maskedPh = cleanPh.length >= 4 ? `${cleanPh.slice(0, 2)}•••• ••${cleanPh.slice(-2)}` : cleanPh;

  return (
    <LivPhone theme="dark">
      <div id="recaptcha-container" />

      {/* Mode A: Sign Up with Story Video (Reference vSignup) */}
      {mode === "signup" && (
        <form
          className="scroll"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendCode();
          }}
          noValidate
        >
          {/* Story Video Header */}
          <LivStories />

          {/* Heading */}
          <div>
            <h1 className="h1">Create your account</h1>
            <p className="sub" style={{ marginTop: "6px" }}>
              Four details. Under a minute.
            </p>
          </div>

          {/* Full Name Field */}
          <div className="field">
            <label htmlFor="f-name">Full name</label>
            <input
              className={cn("inp", errors.name && "bad")}
              id="f-name"
              type="text"
              placeholder="Kaveri Bhosle"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
              }}
              autoComplete="name"
            />
            {errors.name && <span className="err">{errors.name}</span>}
          </div>

          {/* Mobile Number Field (+91) */}
          <div className="field">
            <label htmlFor="f-phone">Mobile number</label>
            <div className={cn("pre", errors.phone && "border-dashed border-[var(--liv-text)]")}>
              <span>+91</span>
              <input
                className="inp"
                id="f-phone"
                type="tel"
                placeholder="98765 43210"
                value={phoneNumber}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
                  const formatted = raw.length > 5 ? `${raw.slice(0, 5)} ${raw.slice(5)}` : raw;
                  setPhoneNumber(formatted);
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
                }}
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={11}
              />
            </div>
            {errors.phone && <span className="err">{errors.phone}</span>}
          </div>

          {/* Email Address Field */}
          <div className="field">
            <label htmlFor="f-email">Email address</label>
            <input
              className={cn("inp", errors.email && "bad")}
              id="f-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
              }}
              autoComplete="email"
            />
            {errors.email && <span className="err">{errors.email}</span>}
          </div>

          {/* Two-Column Grid: Age & Sex */}
          <div className="two">
            <div className="field">
              <label htmlFor="f-age">Age</label>
              <input
                className={cn("inp", errors.age && "bad")}
                id="f-age"
                type="text"
                placeholder="42"
                value={age}
                onChange={(e) => {
                  setAge(e.target.value.replace(/\D/g, "").slice(0, 3));
                  if (errors.age) setErrors((prev) => ({ ...prev, age: "" }));
                }}
                inputMode="numeric"
                maxLength={3}
              />
              {errors.age && <span className="err">{errors.age}</span>}
            </div>

            <div className="field">
              <label>Sex</label>
              <div className="seg" role="group">
                <span
                  className="thumb"
                  style={{
                    width: "calc((100% - 8px) / 3)",
                    transform: `translateX(${gender === "Female" ? "0%" : gender === "Male" ? "100%" : "200%"})`,
                  }}
                />
                {(["Female", "Male", "Other"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    aria-pressed={gender === g}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Consent Checkbox */}
          <button
            type="button"
            className="consent"
            onClick={() => {
              setConsented(!consented);
              if (errors.consent) setErrors((prev) => ({ ...prev, consent: "" }));
            }}
            role="checkbox"
            aria-checked={consented}
          >
            <span className={cn("box", consented && "on")}>
              <LivIcon name="check" size={14} strokeWidth={2.4} />
            </span>
            <span>
              I agree to my health data being stored in India and used to build my report. I can export or erase it at any time.
            </span>
          </button>
          {errors.consent && <span className="err">{errors.consent}</span>}

          {/* Submit Button */}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? (
              <>
                <span className="spin" />
                <span>Creating your account</span>
              </>
            ) : (
              "Create account"
            )}
          </button>

          {/* Switch to Sign In */}
          <button
            type="button"
            className="link"
            onClick={() => {
              setMode("signin");
              setOtpSent(false);
              setErrors({});
            }}
          >
            Already a member? <b>Sign in</b>
          </button>
        </form>
      )}

      {/* Mode B: Sign In (Reference vSignin) */}
      {mode === "signin" && (
        <div className="scroll">
          {/* Liv Animated Mark */}
          <div className="illo flex justify-center">
            <LivMark size={104} />
          </div>

          {/* Title & Sub */}
          <div style={{ textAlign: "center" }}>
            <h1 className="h1">Welcome back</h1>
            <p className="sub" style={{ marginTop: "6px" }}>
              Sign in to see your score and your plan.
            </p>
          </div>

          {/* Segment: Mobile OTP vs Google */}
          <div className="seg" role="group">
            <span
              className="thumb"
              style={{
                width: "calc((100% - 8px) / 2)",
                transform: `translateX(${authMethod === "otp" ? "0%" : "100%"})`,
              }}
            />
            <button
              type="button"
              onClick={() => setAuthMethod("otp")}
              aria-pressed={authMethod === "otp"}
            >
              Mobile OTP
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod("google")}
              aria-pressed={authMethod === "google"}
            >
              Google
            </button>
          </div>

          {/* Auth Panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {authMethod === "google" ? (
              <>
                <button
                  type="button"
                  className="btn"
                  onClick={handleGoogleAuth}
                  disabled={busy}
                >
                  <span className="gmark">G</span>
                  <span>Continue with Google</span>
                </button>
                <p className="sub" style={{ textAlign: "center" }}>
                  We read only your name and email address.
                </p>
              </>
            ) : !otpSent ? (
              <>
                <div className="field">
                  <label htmlFor="f-phone-in">Mobile number</label>
                  <div className={cn("pre", errors.phone && "border-dashed border-[var(--liv-text)]")}>
                    <span>+91</span>
                    <input
                      className="inp"
                      id="f-phone-in"
                      type="tel"
                      placeholder="98765 43210"
                      value={phoneNumber}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
                        const formatted = raw.length > 5 ? `${raw.slice(0, 5)} ${raw.slice(5)}` : raw;
                        setPhoneNumber(formatted);
                        if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSendCode();
                        }
                      }}
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={11}
                    />
                  </div>
                  {errors.phone && <span className="err">{errors.phone}</span>}
                </div>

                <button
                  type="button"
                  className="btn"
                  onClick={handleSendCode}
                  disabled={busy}
                >
                  {busy ? (
                    <>
                      <span className="spin" />
                      <span>Sending code</span>
                    </>
                  ) : (
                    "Send code"
                  )}
                </button>

                <p className="sub" style={{ textAlign: "center" }}>
                  We send a 6-digit code by SMS to confirm it is you.
                </p>
              </>
            ) : (
              <>
                <div className="hd">
                  <p className="sub">
                    Code sent to <b style={{ color: "var(--liv-text)" }}>+91 {maskedPh}</b>
                  </p>
                  <button
                    type="button"
                    className="link"
                    style={{ padding: "4px" }}
                    onClick={() => {
                      setOtpSent(false);
                      setOtpDigits(["", "", "", "", "", ""]);
                    }}
                  >
                    <b>Change</b>
                  </button>
                </div>

                <div className={cn("otp grid-cols-6", shake && "shake")}>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        digitRefs.current[i] = el;
                      }}
                      id={`otp${i}`}
                      inputMode="numeric"
                      maxLength={1}
                      value={otpDigits[i] || ""}
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(i, e)}
                      onPaste={handlePaste}
                      aria-label={`Digit ${i + 1}`}
                      autoComplete={i === 0 ? "one-time-code" : "off"}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  className="btn"
                  onClick={() => handleVerifyCode()}
                  disabled={busy}
                >
                  {busy ? (
                    <>
                      <span className="spin" />
                      <span>Verifying</span>
                    </>
                  ) : (
                    "Verify and continue"
                  )}
                </button>

                <p className="sub" style={{ textAlign: "center" }}>
                  {countdown > 0 ? (
                    `Resend code in 0:${countdown < 10 ? "0" : ""}${countdown}`
                  ) : (
                    <button
                      type="button"
                      className="link"
                      style={{ padding: 0 }}
                      onClick={handleSendCode}
                    >
                      <b>Resend code</b>
                    </button>
                  )}
                </p>
              </>
            )}
          </div>

          {/* Switch to Sign Up */}
          <button
            type="button"
            className="link"
            onClick={() => {
              setMode("signup");
              setOtpSent(false);
              setErrors({});
            }}
          >
            New here? <b>Create an account</b>
          </button>
        </div>
      )}
    </LivPhone>
  );
}

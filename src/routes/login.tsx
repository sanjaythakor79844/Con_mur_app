import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Btn, Icon, TopBar } from "@/components/aaha";
import { useAuth } from "@/hooks/use-auth";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { saveUserProfile, type UserProfile } from "@/lib/user-profile";
import { apiService } from "@/lib/api-service";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in with your mobile | Aaha Companion" },
      {
        name: "description",
        content:
          "Sign in with your mobile number to reach your screening results, reports and consultations.",
      },
      { property: "og:title", content: "Sign in with your mobile | Aaha Companion" },
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
  const { t } = useI18n();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  // Form fields
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [referralName, setReferralName] = useState(""); // Referral / Nurse Name

  const [busy, setBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/welcome" });
  }, [loading, session, navigate]);

  useEffect(() => {
    return () => {
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (e) {
          // ignore
        }
        (window as any).recaptchaVerifier = null;
      }
    };
  }, []);

  const getOrCreateRecaptcha = () => {
    if (typeof window === "undefined") return null;

    if ((window as any).recaptchaVerifier) {
      try {
        (window as any).recaptchaVerifier.clear();
      } catch (e) {
        console.log("Cleared old recaptcha", e);
      }
      (window as any).recaptchaVerifier = null;
    }

    const container = document.getElementById("recaptcha-container");
    if (container) {
      container.innerHTML = "";
    }

    const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: () => {
        console.log("✅ reCAPTCHA solved");
      },
      "expired-callback": () => {
        console.warn("⚠️ reCAPTCHA expired");
        toast.error("Security verification expired. Please try again.");
      },
    });

    (window as any).recaptchaVerifier = verifier;
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
    return true;
  };

  const sendOTP = async () => {
    if (busy) return;
    if (mode === "signup" ? !validateSignup() : !validatePhone()) return;

    setBusy(true);

    try {
      // Real Firebase Phone OTP flow using invisible reCAPTCHA
      console.log("🔧 Initializing reCAPTCHA verifier for real OTP...");
      const verifier = getOrCreateRecaptcha();
      if (!verifier) {
        throw new Error("Could not initialize security verification");
      }

      const formattedPhone = "+91" + phoneNumber.trim();
      console.log("📱 Sending real OTP to:", formattedPhone);

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      toast.success(t("OTP sent!"), { description: `${t("Verification code sent to")} ${formattedPhone}` });

      console.log("✅ Real Firebase OTP sent successfully");
    } catch (error: any) {
      console.error("❌ OTP send error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);

      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (e) {
          // ignore
        }
        (window as any).recaptchaVerifier = null;
      }

      // User-friendly error messages
      let errorMessage = "Couldn't send OTP";
      let errorDescription = error.message;

      if (error.code === "auth/invalid-app-credential") {
        errorMessage = "Phone authentication not configured";
        errorDescription = "Firebase Phone Authentication needs to be enabled in Firebase Console";
      } else if (error.code === "auth/captcha-check-failed") {
        errorMessage = "Security verification failed";
        errorDescription = "Please try again or check browser settings";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many attempts";
        errorDescription = "Please wait a few minutes and try again";
      } else if (error.code === "auth/invalid-phone-number") {
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
      // Real Firebase OTP verification
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
      } catch (error: any) {
        console.log("Patient not found by token, attempting to link by phone...");
        try {
          await apiService.linkPatientByPhone(result.user.phoneNumber || "+91" + phoneNumber);
          patientExists = true;
          toast.success("Account linked!", { description: "Your kiosk data is now synced" });
        } catch {
          console.log("No existing patient found by phone.");
        }
      }

      if (mode === "signin" && !patientExists) {
        await auth.signOut();
        apiService.setToken(null);
        toast.error(t("Account not found"), { description: t("Please sign up first to continue.") });
        setMode("signup");
        setBusy(false);
        return;
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
            referred_by: referralName === "" ? null : referralName,
          } as any);
          console.log("✅ Patient created in backend");
        } catch (error) {
          console.error("Backend patient note:", error);
          throw new Error("Failed to create profile. Please try again.");
        }
      }

      toast.success(mode === "signup" ? t("Account created") : t("Signed in"), {
        description: t("Welcome to Aaha."),
      });
      navigate({ to: "/welcome" });
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
      <TopBar
        title={mode === "signin" ? t("Sign in") : t("Create account")}
        subtitle={t("Safe and simple")}
      />

      {/* Main scrollable form canvas */}
      <div className="flex-1 px-5 pt-5 pb-8 sm:px-6">
        <div className="mb-4">
          <h2 className="text-[22px] font-bold tracking-tight text-foreground sm:text-2xl">
            {mode === "signin" ? t("Sign in with your mobile") : t("Create your account")}
          </h2>
          <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
            {mode === "signin"
              ? t("Your reports, results and appointments stay private to you.")
              : t("Enter your details to create your Aaha account.")}
          </p>
        </div>

        {/* Compact Segmented Control */}
        <div className="flex rounded-[12px] border border-border/70 bg-muted/70 p-1">
          {(["signin", "signup"] as const).map((m) => {
            const isActive = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setOtpSent(false);
                  setOtp("");
                }}
                disabled={otpSent || busy}
                className={cn(
                  "flex-1 h-[38px] rounded-[9px] text-[13.5px] font-semibold transition-all select-none",
                  isActive
                    ? "bg-card text-primary shadow-[0_1px_3px_rgba(36,27,31,0.08)]"
                    : "text-muted-foreground hover:text-foreground",
                  (otpSent || busy) && "opacity-50 cursor-not-allowed"
                )}
              >
                {m === "signin" ? t("Sign in") : t("Create account")}
              </button>
            );
          })}
        </div>

        {!otpSent ? (
          <div className="mt-5 space-y-4">
            {/* Phone Number Field */}
            <div>
              <label htmlFor="phone-input" className="block text-[13px] font-semibold text-foreground mb-1.5">
                {t("Mobile Number")}
              </label>
              <div className="h-[52px] rounded-[14px] border border-border/80 bg-card px-3.5 flex items-center gap-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                <Icon name="phone" className="text-[18px] text-muted-foreground shrink-0 select-none" />
                <span className="text-[15px] font-semibold text-foreground shrink-0 select-none pr-2.5 border-r border-border/80">
                  +91
                </span>
                <input
                  id="phone-input"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="98765 43210"
                  maxLength={10}
                  className="w-full bg-transparent text-[15px] font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground/50 tracking-wide"
                />
              </div>
              {phoneNumber.length > 0 && !isValidPhone(phoneNumber) && (
                <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-destructive">
                  <Icon name="error" className="text-[14px]" />
                  <span>{t("Please enter a valid 10-digit mobile number.")}</span>
                </p>
              )}
            </div>

            {/* Create Account Fields */}
            {mode === "signup" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="first-name-input" className="block text-[13px] font-semibold text-foreground mb-1.5">
                      {t("First Name")}
                    </label>
                    <div className="h-[52px] rounded-[14px] border border-border/80 bg-card px-3.5 flex items-center gap-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                      <Icon name="person" className="text-[18px] text-muted-foreground shrink-0 select-none" />
                      <input
                        id="first-name-input"
                        type="text"
                        autoComplete="given-name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder={t("e.g. Rahul")}
                        className="w-full bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="last-name-input" className="block text-[13px] font-semibold text-foreground mb-1.5">
                      {t("Last Name")}
                    </label>
                    <div className="h-[52px] rounded-[14px] border border-border/80 bg-card px-3.5 flex items-center gap-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                      <Icon name="badge" className="text-[18px] text-muted-foreground shrink-0 select-none" />
                      <input
                        id="last-name-input"
                        type="text"
                        autoComplete="family-name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder={t("e.g. Sharma")}
                        className="w-full bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="age-input" className="block text-[13px] font-semibold text-foreground mb-1.5">
                    {t("Age")}
                  </label>
                  <div className="h-[52px] rounded-[14px] border border-border/80 bg-card px-3.5 flex items-center gap-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                    <Icon name="cake" className="text-[18px] text-muted-foreground shrink-0 select-none" />
                    <input
                      id="age-input"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="120"
                      value={age}
                      onChange={(e) => setAge(e.target.value.slice(0, 3))}
                      placeholder={t("e.g. 32")}
                      className="w-full bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground/50"
                    />
                  </div>
                </div>

                <div>
                  <span className="block text-[13px] font-semibold text-foreground mb-1.5">
                    {t("Gender")}
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(["male", "female", "other"] as const).map((g) => {
                      const isSelected = gender === g;
                      const icons = { male: "man", female: "woman", other: "person" };
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGender(g)}
                          className={cn(
                            "h-[48px] rounded-[12px] border text-[13.5px] font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]",
                            isSelected
                              ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/25"
                              : "border-border/80 bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          )}
                        >
                          <Icon
                            name={icons[g]}
                            className={cn("text-[18px]", isSelected ? "text-primary" : "text-muted-foreground")}
                          />
                          <span>{t(g.charAt(0).toUpperCase() + g.slice(1))}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Referral / Nurse Name (Optional) */}
                <div>
                  <label htmlFor="referral-name-input" className="flex items-center justify-between text-[13px] font-semibold text-foreground mb-1.5">
                    <span>{t("Referred By (Nurse / Health Worker)")}</span>
                    <span className="text-[12px] font-normal text-muted-foreground">({t("Optional")})</span>
                  </label>
                  <div className="h-[52px] rounded-[14px] border border-border/80 bg-card px-3.5 flex items-center gap-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                    <Icon name="stethoscope" className="text-[18px] text-muted-foreground shrink-0 select-none" />
                    <input
                      id="referral-name-input"
                      type="text"
                      value={referralName}
                      onChange={(e) => setReferralName(e.target.value)}
                      placeholder={t("e.g. Sister Anita or Kiosk ID")}
                      maxLength={100}
                      className="w-full bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground/50"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Subtle Terms and Privacy Notice */}
            <p className="pt-2 text-center text-[12px] text-muted-foreground leading-relaxed">
              {t("By continuing you agree to our")}{" "}
              <span className="font-semibold text-primary">{t("Terms")}</span>{" "}
              {t("and")}{" "}
              <span className="font-semibold text-primary">{t("Privacy Policy")}</span>.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between rounded-[12px] border border-border/80 bg-card px-3.5 py-2.5 text-xs">
              <div className="flex items-center gap-2">
                <Icon name="smartphone" className="text-[16px] text-primary" />
                <span className="font-medium text-muted-foreground">{t("Code sent to")}</span>
                <span className="font-bold text-foreground">+91 {phoneNumber}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                  setConfirmationResult(null);
                }}
                className="font-semibold text-primary hover:underline text-xs"
              >
                {t("Change")}
              </button>
            </div>

            <div>
              <label htmlFor="otp-input" className="block text-[13px] font-semibold text-foreground mb-1.5">
                {t("Enter 6-digit OTP")}
              </label>
              <div className="h-[54px] rounded-[14px] border border-border/80 bg-card px-4 flex items-center gap-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                <Icon name="password" className="text-[18px] text-muted-foreground shrink-0 select-none" />
                <input
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
                  className="w-full bg-transparent text-[18px] font-bold tracking-[0.35em] text-foreground outline-none text-center placeholder:text-muted-foreground/30 placeholder:tracking-widest"
                />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <Icon name="lock" className="text-[14px] text-primary" />
                <span>{t("Enter the verification code sent via SMS")}</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Area */}
      <div
        className="sticky bottom-0 z-20 border-t border-border/70 bg-card/95 px-5 py-3.5 backdrop-blur shadow-[0_-4px_16px_rgba(36,27,31,0.04)] sm:px-6"
        style={{ paddingBottom: "max(0.875rem, calc(0.875rem + env(safe-area-inset-bottom, 0px)))" }}
      >
        {!otpSent ? (
          <Btn onClick={sendOTP} icon={busy ? undefined : "send"} disabled={busy} className="h-[54px] rounded-[14px]">
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
              className="h-[54px] rounded-[14px]"
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
            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setOtp("");
                setConfirmationResult(null);
              }}
              disabled={busy}
              className="flex h-[44px] w-full items-center justify-center gap-1.5 rounded-[12px] border border-border/80 bg-card text-[13.5px] font-semibold text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              <Icon name="refresh" className="text-[16px] text-muted-foreground" />
              <span>{t("Resend OTP")}</span>
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

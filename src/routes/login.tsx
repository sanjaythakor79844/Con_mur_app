import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Btn, Icon, TopBar } from "@/components/aaha";
import { useAuth } from "@/hooks/use-auth";
import { 
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { saveUserProfile, type UserProfile } from "@/lib/user-profile";
import { apiService } from "@/lib/api-service";

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

// Demo phone numbers for testing (bypass real Firebase OTP)
const DEMO_PHONES = ["9999999999", "8888888888", "7777777777", "7984460572"];
const DEMO_OTP = "123456";

const isValidPhone = (value: string) => /^[6-9]\d{9}$/.test(value.trim());

function LoginScreen() {
  const navigate = useNavigate();
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
  const [isDemo, setIsDemo] = useState(false);
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
    if (/invalid.*phone/i.test(message))
      return "Please enter a valid 10-digit mobile number.";
    return "Something went wrong. Please check your connection and try again.";
  };

  const validatePhone = () => {
    if (!isValidPhone(phoneNumber)) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return false;
    }
    return true;
  };

  const validateSignup = () => {
    if (!validatePhone()) return false;
    if (firstName.trim().length < 2) {
      toast.error("Please enter your first name.");
      return false;
    }
    if (lastName.trim().length < 2) {
      toast.error("Please enter your last name.");
      return false;
    }
    const ageNum = parseInt(age);
    if (!age || ageNum < 1 || ageNum > 120) {
      toast.error("Please enter a valid age.");
      return false;
    }
    if (!gender) {
      toast.error("Please select your gender.");
      return false;
    }
    return true;
  };

  const sendOTP = async () => {
    if (mode === "signup" ? !validateSignup() : !validatePhone()) return;
    
    setBusy(true);
    
    const demoMode = DEMO_PHONES.includes(phoneNumber.trim());
    setIsDemo(demoMode);

    try {
      // 🎭 DEMO MODE: Test phone numbers bypass real Firebase OTP
      if (demoMode) {
        console.log("🎭 DEMO MODE: Using test phone number");
        toast.success("Demo Mode Activated!", { 
          description: `Use OTP: ${DEMO_OTP} to login` 
        });
        setOtpSent(true);
        setBusy(false);
        return;
      }
      
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
      toast.success("OTP sent!", { description: `Verification code sent to ${formattedPhone}` });
      
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
    if (otp.length !== 6) {
      toast.error("Please enter the 6-digit OTP.");
      return;
    }
    
    setBusy(true);
    try {
      // 🎭 DEMO MODE: Test phone numbers with demo OTP
      if (isDemo) {
        console.log("🎭 DEMO MODE: Verifying demo OTP");
        
        if (otp !== DEMO_OTP) {
          toast.error("Invalid OTP", {
            description: `Demo OTP is ${DEMO_OTP}`
          });
          setBusy(false);
          return;
        }
        
        console.log("✅ Demo OTP verified");
        
        const mockFirebaseUID = `demo_${phoneNumber}_${Date.now()}`;
        const formattedPhone = "+91" + phoneNumber.trim();
        const mockToken = `demo_token_${mockFirebaseUID}`;
        
        apiService.setToken(mockToken);
        
        if (mode === "signup") {
          const safeFirstName = firstName.trim() || "Demo";
          const safeLastName = lastName.trim() || "User";
          const safeAge = parseInt(age) || 25;
          const safeGender = (gender as "male" | "female" | "other") || "male";

          const profile: UserProfile = {
            uid: mockFirebaseUID,
            phoneNumber: formattedPhone,
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
              mobile_number: formattedPhone,
              full_name: `${safeFirstName} ${safeLastName}`.trim(),
              age: safeAge,
              gender: formattedGender,
              referral_name: referralName.trim() || undefined,
            });
            console.log("✅ Demo patient created in backend");
          } catch (error) {
            console.warn("Backend unavailable, continuing in offline mode:", error);
          }
        }
        
        // Save demo session to localStorage
        const demoSession = {
          uid: mockFirebaseUID,
          phoneNumber: formattedPhone,
          token: mockToken,
          timestamp: Date.now(),
        };
        localStorage.setItem("aaha_demo_session", JSON.stringify(demoSession));
        console.log("✅ Demo session saved");
        
        toast.success("Login Successful! 🎉", { 
          description: "You're now in demo mode" 
        });
        
        window.location.href = "/welcome";
        return;
      }

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
      } catch {
        try {
          await apiService.linkPatientByPhone(
            result.user.phoneNumber || "+91" + phoneNumber
          );
          patientExists = true;
          toast.success("Account linked!", { description: "Your kiosk data is now synced" });
        } catch {
          console.log("No existing patient found by phone, will create new...");
        }
      }
      
      if (mode === "signup" || !patientExists) {
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
            referral_name: referralName.trim() || undefined,
          });
          console.log("✅ Patient created in backend");
        } catch (error) {
          console.error("Backend patient note:", error);
        }
      }
      
      toast.success(mode === "signup" ? "Account created" : "Signed in", { 
        description: "Welcome to Aaha." 
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
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <div id="recaptcha-container"></div>
      <TopBar title="Sign in" subtitle="Safe and simple" />
      <div className="flex-1 px-5 py-6">
        <h2 className="text-2xl font-bold leading-snug">
          {mode === "signin" ? "Sign in with your mobile" : "Create your account"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Your reports, results and appointments stay private to you."
            : "Enter your details to create your Aaha account."}
        </p>

        <div className="mt-6 flex rounded-2xl bg-muted p-1">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setOtpSent(false);
                setOtp("");
                setIsDemo(false);
              }}
              disabled={otpSent}
              className={`flex-1 rounded-xl py-2 text-sm font-bold transition ${
                mode === m ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
              } ${otpSent ? "opacity-50" : ""}`}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        {!otpSent ? (
          <>
            {/* Phone Number Field */}
            <div className="mt-6">
              <span className="text-xs font-semibold text-muted-foreground">Mobile Number</span>
              <div className="mt-2 flex items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 focus-within:border-primary/60">
                <Icon name="phone" className="text-muted-foreground" />
                <span className="text-base font-semibold text-muted-foreground">+91</span>
                <input
                  id="phone-input"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="9876543210"
                  maxLength={10}
                  className="min-h-14 w-full bg-transparent text-base font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground"
                />
              </div>
              {phoneNumber.length > 0 && !isValidPhone(phoneNumber) && (
                <p className="mt-2 text-xs font-semibold text-destructive">
                  Please enter a valid 10-digit mobile number.
                </p>
              )}

            </div>

            {/* Additional fields for signup */}
            {mode === "signup" && (
              <>
                <div className="mt-5">
                  <span className="text-xs font-semibold text-muted-foreground">First Name</span>
                  <div className="mt-2 flex items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 focus-within:border-primary/60">
                    <Icon name="person" className="text-muted-foreground" />
                    <input
                      id="first-name-input"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter your first name"
                      className="min-h-14 w-full bg-transparent text-base font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <span className="text-xs font-semibold text-muted-foreground">Last Name</span>
                  <div className="mt-2 flex items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 focus-within:border-primary/60">
                    <Icon name="person" className="text-muted-foreground" />
                    <input
                      id="last-name-input"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Enter your last name"
                      className="min-h-14 w-full bg-transparent text-base font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <span className="text-xs font-semibold text-muted-foreground">Age</span>
                  <div className="mt-2 flex items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 focus-within:border-primary/60">
                    <Icon name="cake" className="text-muted-foreground" />
                    <input
                      id="age-input"
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Enter your age"
                      min="1"
                      max="120"
                      className="min-h-14 w-full bg-transparent text-base font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <span className="text-xs font-semibold text-muted-foreground">Gender</span>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(["male", "female", "other"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`rounded-xl border-2 py-3 text-sm font-bold transition ${
                          gender === g
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground"
                        }`}
                      >
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Referral / Nurse Name (Optional) */}
                <div className="mt-5">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Referral / Nurse Name{" "}
                    <span className="font-normal text-muted-foreground/60">(Optional)</span>
                  </span>
                  <div className="mt-2 flex items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 focus-within:border-primary/60">
                    <Icon name="badge" className="text-muted-foreground" />
                    <input
                      id="referral-name-input"
                      type="text"
                      value={referralName}
                      onChange={(e) => setReferralName(e.target.value)}
                      placeholder="Enter referral or nurse name"
                      className="min-h-14 w-full bg-transparent text-base font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="mt-6">
            <span className="text-xs font-semibold text-muted-foreground">Enter OTP</span>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 focus-within:border-primary/60">
              <Icon name="pin" className="text-muted-foreground" />
              <input
                id="otp-input"
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void verifyOTP();
                }}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                className="min-h-14 w-full bg-transparent text-base font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {isDemo
                ? `🎭 Demo mode — use OTP: ${DEMO_OTP}`
                : `OTP sent to +91 ${phoneNumber}`}
            </p>
          </div>
        )}

        <div className="mt-8 flex items-start gap-2 rounded-2xl bg-muted p-3 text-xs text-muted-foreground">
          <Icon name="verified_user" className="text-primary" />
          <p>
            By continuing you agree to our <span className="font-semibold text-primary">Terms</span>{" "}
            and <span className="font-semibold text-primary">Privacy Policy</span>.
          </p>
        </div>
      </div>

      <div className="sticky bottom-0 space-y-3 border-t border-border/60 bg-card/95 p-4 backdrop-blur">
        {!otpSent ? (
          <Btn id="send-otp-btn" onClick={sendOTP} icon="send" disabled={busy}>
            {busy ? "Sending OTP..." : "Send OTP"}
          </Btn>
        ) : (
          <>
            <Btn id="verify-otp-btn" onClick={verifyOTP} icon="verified" disabled={busy}>
              {busy ? "Verifying..." : "Verify OTP"}
            </Btn>
            <Btn
              id="resend-otp-btn"
              onClick={() => {
                setOtpSent(false);
                setOtp("");
                setIsDemo(false);
                setConfirmationResult(null);
              }}
              variant="outline"
              icon="refresh"
              disabled={busy}
            >
              Resend OTP
            </Btn>
          </>
        )}
      </div>
    </main>
  );
}

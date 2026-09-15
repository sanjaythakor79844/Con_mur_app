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
  
  const [busy, setBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/welcome" });
  }, [loading, session, navigate]);

  useEffect(() => {
    // Initialize reCAPTCHA only on client side
    if (typeof window === "undefined") return;
    
    // Cleanup any existing recaptcha
    const existingContainer = document.getElementById('recaptcha-container');
    if (existingContainer) {
      existingContainer.innerHTML = '';
    }
    
    return () => {
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch (e) {
          console.log("Recaptcha already cleared");
        }
        setRecaptchaVerifier(null);
      }
    };
  }, [recaptchaVerifier]);

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
    
    try {
      // 🎯 DEMO MODE: Test phone numbers with automatic OTP
      const DEMO_PHONES = ['9999999999', '8888888888', '7777777777'];
      const isDemo = DEMO_PHONES.includes(phoneNumber.trim());
      
      if (isDemo) {
        console.log('🎭 DEMO MODE: Using test phone number');
        toast.success("Demo Mode Activated!", { 
          description: "Use OTP: 123456 to login" 
        });
        
        // Simulate OTP sent
        setOtpSent(true);
        setBusy(false);
        return;
      }
      
      // Normal Firebase OTP flow
      // Clear any existing recaptcha
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch (e) {
          console.log("Clearing old recaptcha");
        }
      }
      
      console.log('🔧 Creating reCAPTCHA verifier...');
      toast.info("Preparing security verification...");
      
      // Create new recaptcha verifier
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'normal',
        callback: (response: any) => {
          console.log('✅ reCAPTCHA solved', response);
        },
        'expired-callback': () => {
          console.warn('⚠️ reCAPTCHA expired');
          toast.error("Security verification expired. Please try again.");
        }
      });
      
      setRecaptchaVerifier(verifier);
      
      console.log('📦 Rendering reCAPTCHA...');
      
      // Render the recaptcha with timeout
      const renderTimeout = setTimeout(() => {
        toast.error("reCAPTCHA taking too long. Please refresh the page.");
        setBusy(false);
      }, 10000); // 10 second timeout
      
      await verifier.render();
      clearTimeout(renderTimeout);
      
      console.log('✅ reCAPTCHA rendered, waiting for user to complete...');
      toast.success("Please complete the security check above");
      
      const formattedPhone = "+91" + phoneNumber.trim();
      console.log('📱 Sending OTP to:', formattedPhone);
      
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      toast.success("OTP sent", { description: `We've sent a code to ${phoneNumber}` });
      
      console.log('✅ OTP sent successfully');
      
    } catch (error: any) {
      console.error("❌ OTP send error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      
      // Clear recaptcha on error
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
          setRecaptchaVerifier(null);
        } catch (e) {
          console.log("Error clearing recaptcha");
        }
      }
      
      // User-friendly error messages
      let errorMessage = "Couldn't send OTP";
      let errorDescription = error.message;
      
      if (error.code === 'auth/invalid-app-credential') {
        errorMessage = "Phone authentication not configured";
        errorDescription = "Firebase Phone Authentication needs to be enabled in Firebase Console";
      } else if (error.code === 'auth/captcha-check-failed') {
        errorMessage = "Security verification failed";
        errorDescription = "Please complete the reCAPTCHA and try again";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many attempts";
        errorDescription = "Please wait 15 minutes and try again";
      } else if (error.code === 'auth/invalid-phone-number') {
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
      // 🎯 DEMO MODE: Test phone numbers with demo OTP
      const DEMO_PHONES = ['9999999999', '8888888888', '7777777777'];
      const isDemo = DEMO_PHONES.includes(phoneNumber.trim());
      
      if (isDemo) {
        console.log('🎭 DEMO MODE: Verifying demo OTP');
        
        // Check demo OTP
        if (otp !== '123456') {
          toast.error("Invalid OTP", {
            description: "Demo OTP is 123456"
          });
          setBusy(false);
          return;
        }
        
        console.log('✅ Demo OTP verified');
        
        // Create mock Firebase user for demo
        const mockFirebaseUID = `demo_${phoneNumber}_${Date.now()}`;
        const formattedPhone = "+91" + phoneNumber.trim();
        const mockToken = `demo_token_${mockFirebaseUID}`;
        
        // Set mock token in API service
        apiService.setToken(mockToken);
        
        // Check if patient exists in backend
        let patientExists = false;
        try {
          const profile = await apiService.getMyProfile();
          console.log("✅ Patient exists in backend:", profile.patient);
          patientExists = true;
        } catch (error) {
          console.log("❌ Patient not found in backend, will create...");
        }
        
        // If signup mode or patient doesn't exist, create profile
        if (mode === "signup" || !patientExists) {
          const profile: UserProfile = {
            uid: mockFirebaseUID,
            phoneNumber: formattedPhone,
            firstName: firstName.trim() || "Demo",
            lastName: lastName.trim() || "User",
            age: parseInt(age) || 25,
            gender: gender || "male",
            createdAt: new Date().toISOString(),
          };
          
          // Save to localStorage
          saveUserProfile(profile);
          
          // Create patient in backend
          try {
            await apiService.createPatient({
              mobile_number: formattedPhone,
              full_name: `${profile.firstName} ${profile.lastName}`,
              age: profile.age,
              gender: profile.gender,
            });
            console.log("✅ Demo patient created in backend");
          } catch (error) {
            console.error("Failed to create demo patient in backend:", error);
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
        
        toast.success("Demo Login Successful! 🎉", { 
          description: "You're now in demo mode" 
        });
        
        // Force page reload to trigger auth state change
        window.location.href = '/welcome';
        return;
      }
      
      // Normal Firebase OTP verification
      if (!confirmationResult) {
        throw new Error("Please request OTP first");
      }
      
      const result = await confirmationResult.confirm(otp);
      const token = await result.user.getIdToken();
      
      // Set token in API service
      apiService.setToken(token);
      
      // Check if patient exists in backend
      let patientExists = false;
      try {
        const profile = await apiService.getMyProfile();
        console.log("✅ Patient exists in backend:", profile.patient);
        patientExists = true;
      } catch (error) {
        console.log("❌ Patient not found in backend, will create...");
      }
      
      // If signup mode or patient doesn't exist, create/update profile
      if (mode === "signup" || !patientExists) {
        const profile: UserProfile = {
          uid: result.user.uid,
          phoneNumber: result.user.phoneNumber || "+91" + phoneNumber,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          age: parseInt(age),
          gender,
          createdAt: new Date().toISOString(),
        };
        
        // Save to localStorage
        saveUserProfile(profile);
        
        // Create patient in backend
        try {
          await apiService.createPatient({
            mobile_number: result.user.phoneNumber || "+91" + phoneNumber,
            full_name: `${firstName.trim()} ${lastName.trim()}`,
            age: parseInt(age),
            gender,
          });
          console.log("✅ Patient created in backend");
        } catch (error) {
          console.error("Failed to create patient in backend:", error);
          toast.error("Profile created locally, but backend sync failed");
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
              
              {/* Demo Mode Notice */}
              <div className="mt-3 rounded-xl bg-blue-50 border-2 border-blue-200 p-3">
                <div className="flex items-start gap-2">
                  <Icon name="info" className="text-blue-600 text-lg" />
                  <div>
                    <p className="text-xs font-bold text-blue-900">🎭 Demo Mode Available</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Use demo numbers: <span className="font-mono font-bold">9999999999</span>, 
                      <span className="font-mono font-bold"> 8888888888</span>, or 
                      <span className="font-mono font-bold"> 7777777777</span>
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Demo OTP: <span className="font-mono font-bold">123456</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional fields for signup */}
            {mode === "signup" && (
              <>
                <div className="mt-5">
                  <span className="text-xs font-semibold text-muted-foreground">First Name</span>
                  <div className="mt-2 flex items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 focus-within:border-primary/60">
                    <Icon name="person" className="text-muted-foreground" />
                    <input
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
              </>
            )}
          </>
        ) : (
          <div className="mt-6">
            <span className="text-xs font-semibold text-muted-foreground">Enter OTP</span>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 focus-within:border-primary/60">
              <Icon name="pin" className="text-muted-foreground" />
              <input
                type="text"
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
              OTP sent to +91 {phoneNumber}
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
          <Btn onClick={sendOTP} icon="send" disabled={busy}>
            {busy ? "Sending OTP..." : "Send OTP"}
          </Btn>
        ) : (
          <>
            <Btn onClick={verifyOTP} icon="verified" disabled={busy}>
              {busy ? "Verifying..." : "Verify OTP"}
            </Btn>
            <Btn
              onClick={() => {
                setOtpSent(false);
                setOtp("");
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

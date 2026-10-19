// src/hooks/use-auth.ts
// Firebase Phone OTP Authentication - replaces Supabase auth
// Same mobile number works on both Kiosk and Consumer App
// Integrated with Backend API for patient data

import { useEffect, useState } from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiService, type Patient } from "@/lib/api-service";

export interface AuthSession {
  uid: string;
  phoneNumber: string | null;
  email: string | null;
  token: string;
  isDemo?: boolean;
}

// Demo session storage key
const DEMO_SESSION_KEY = "aaha_demo_session";

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for demo session first
    const checkDemoSession = () => {
      if (typeof window === "undefined") return null;
      try {
        const saved = localStorage.getItem(DEMO_SESSION_KEY);
        if (!saved) return null;
        return JSON.parse(saved);
      } catch {
        return null;
      }
    };

    const demoSession = checkDemoSession();
    if (demoSession) {
      console.log("🎭 Using demo session");
      setSession({
        uid: (demoSession as any).uid || "demo_patient_6",
        phoneNumber: (demoSession as any).phoneNumber || "+918077224457",
        email: (demoSession as any).email || "demo@aaha.health",
        token: (demoSession as any).token || "demo_token",
        isDemo: true,
      });

      apiService.setToken((demoSession as any).token || "demo_token");

      // Load patient profile from backend with fallback
      apiService
        .getMyProfile()
        .then((response) => {
          console.log("✅ Demo patient loaded:", response.patient);
          setPatient(response.patient);
        })
        .catch(() => {
          setPatient({
            patient_id: 6,
            full_name: (demoSession as any).fullName || "Kaveri Bhosle",
            mobile_number: (demoSession as any).phoneNumber || "+919999999999",
            age: 42,
            gender: "Female",
            firebase_uid: (demoSession as any).uid || "demo_patient_6",
            created_at: new Date().toISOString(),
          });
        })
        .finally(() => setLoading(false));

      return;
    }

    // Firebase auth state listener
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        setSession({
          uid: firebaseUser.uid,
          phoneNumber: firebaseUser.phoneNumber,
          email: firebaseUser.email,
          token,
          isDemo: false,
        });

        // Set token in API service
        apiService.setToken(token);

        // Try to load patient profile from backend
        try {
          const response = await apiService.getMyProfile();
          setPatient(response.patient);
        } catch (error: any) {
          if (error.status === 404) {
            console.log("Patient profile not found in backend:", error.message);
            // Do NOT sign out here. The login screen handles profile creation.
          } else {
            console.error("Server Error fetching patient profile:", error);
          }
          // Do not overwrite patient state to null if we already have it during a token refresh
          if (!patient) setPatient(null);
        }
      } else {
        setSession(null);
        setPatient(null);
        apiService.setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [patient]);

  const user = session
    ? {
        id: session.uid,
        phone: session.phoneNumber,
        email: session.email,
        name: patient?.full_name,
        age: patient?.age,
        gender: patient?.gender,
      }
    : null;

  return {
    session,
    user,
    patient,
    userId: session?.uid ?? null,
    loading,
  };
}

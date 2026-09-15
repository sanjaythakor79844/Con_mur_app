// src/hooks/use-auth.ts
// Firebase Phone OTP Authentication - replaces Supabase auth
// Same mobile number works on both Kiosk and Consumer App
// Integrated with Backend API for patient data

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
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
      const demoSessionStr = localStorage.getItem(DEMO_SESSION_KEY);
      if (demoSessionStr) {
        try {
          const demoSession = JSON.parse(demoSessionStr);
          console.log("📱 Demo session found:", demoSession);
          return demoSession;
        } catch (e) {
          console.error("Failed to parse demo session");
          localStorage.removeItem(DEMO_SESSION_KEY);
        }
      }
      return null;
    };

    const demoSession = checkDemoSession();
    if (demoSession) {
      console.log("🎭 Using demo session");
      setSession({
        uid: demoSession.uid,
        phoneNumber: demoSession.phoneNumber,
        email: null,
        token: demoSession.token,
        isDemo: true,
      });
      
      apiService.setToken(demoSession.token);
      
      // Load patient profile
      apiService.getMyProfile()
        .then(response => {
          console.log("✅ Demo patient loaded:", response.patient);
          setPatient(response.patient);
        })
        .catch(error => {
          console.log("❌ Demo patient not found:", error);
        })
        .finally(() => setLoading(false));
      
      return;
    }

    // Firebase auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
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
        } catch (error) {
          console.log("Patient profile not found in backend:", error);
          setPatient(null);
        }
      } else {
        setSession(null);
        setPatient(null);
        apiService.setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

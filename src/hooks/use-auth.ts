// src/hooks/use-auth.ts
// Real Firebase Phone OTP & Google Authentication
// Integrated with Backend API & User Profile

import { useEffect, useState } from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiService, type Patient } from "@/lib/api-service";
import { getUserProfile } from "@/lib/user-profile";

export interface AuthSession {
  uid: string;
  phoneNumber: string | null;
  email: string | null;
  token: string;
}

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real Firebase auth state listener
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          setSession({
            uid: firebaseUser.uid,
            phoneNumber: firebaseUser.phoneNumber,
            email: firebaseUser.email,
            token,
          });

          // Set token in API service
          apiService.setToken(token);

          // Try to load patient profile from backend
          try {
            const response = await apiService.getMyProfile();
            if (response?.patient) {
              setPatient(response.patient);
            }
          } catch (error: any) {
            console.log("Backend profile sync check:", error?.message);
            // Fallback to local profile saved during signup if backend record is still syncing
            const local = getUserProfile();
            if (local && local.uid === firebaseUser.uid) {
              setPatient({
                patient_id: 0,
                full_name: `${local.firstName} ${local.lastName}`.trim(),
                mobile_number: local.phoneNumber || firebaseUser.phoneNumber || "",
                age: local.age || 35,
                gender: local.gender || "Female",
                firebase_uid: firebaseUser.uid,
                created_at: local.createdAt,
              });
            } else if (!patient) {
              setPatient({
                patient_id: 0,
                full_name: firebaseUser.displayName || "Patient",
                mobile_number: firebaseUser.phoneNumber || "",
                age: 35,
                gender: "Female",
                firebase_uid: firebaseUser.uid,
                created_at: new Date().toISOString(),
              });
            }
          }
        } catch (e) {
          console.error("Auth state error:", e);
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

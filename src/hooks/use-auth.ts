// src/hooks/use-auth.ts
// Real Firebase Phone OTP & Google Authentication
// Integrated with Backend API & User Profile

import { useEffect, useState } from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiService, type Patient } from "@/lib/api-service";
import { getUserProfile } from "@/lib/user-profile";
import { resetPatientLinkingFlag } from "@/lib/aaha-api";

export interface AuthSession {
  uid: string;
  phoneNumber: string | null;
  email: string | null;
  token: string;
}

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isUnlinked, setIsUnlinked] = useState(false);
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
              setIsUnlinked(false);
            }
          } catch (error: any) {
            console.log("Backend profile sync check:", error?.message);
            // 404: Patient record not linked to this Firebase UID yet
            // Per instructions: Do NOT call POST /patients/link-by-phone until confirmed live by backend developer.
            if (error?.status === 404) {
              setIsUnlinked(true);
            }

            // Fallback to local profile saved during signup if backend record is still syncing
            const local = getUserProfile();
            if (local && local.uid === firebaseUser.uid) {
              setPatient({
                patient_id: 0,
                full_name: `${local.firstName} ${local.lastName}`.trim(),
                mobile_number: local.phoneNumber || firebaseUser.phoneNumber || "",
                age: local.age || undefined,
                gender: local.gender || undefined,
                firebase_uid: firebaseUser.uid,
                created_at: local.createdAt,
              });
            } else {
              setPatient(null);
            }
          }
        } catch (e) {
          console.error("Auth state error:", e);
        }
      } else {
        setSession(null);
        setPatient(null);
        setIsUnlinked(false);
        apiService.setToken(null);
        resetPatientLinkingFlag();
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
    isUnlinked,
  };
}

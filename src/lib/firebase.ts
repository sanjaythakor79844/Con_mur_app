// src/lib/firebase.ts
// Firebase initialization - used by both Kiosk and Consumer App

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "REDACTED_FIREBASE_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "REDACTED_AUTH_DOMAIN",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "kiosk-e6b59",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "REDACTED_STORAGE_BUCKET",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "REDACTED_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "REDACTED_APP_ID",
};

// Prevent duplicate initialization during HMR
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);

// Set language for OTP SMS (Hindi/English based on preference)
auth.languageCode = "en"; // Change to 'hi' for Hindi

export default app;

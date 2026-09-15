// src/lib/firebase.ts
// Firebase initialization - used by both Kiosk and Consumer App

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCA89d5jpafJrB19XqS9MkwGlWja0GXZmI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "kiosk-e6b59.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "kiosk-e6b59",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "kiosk-e6b59.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "405281288207",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:405281288207:web:0ed997bf9b7e5252dab37a",
};

// Prevent duplicate initialization during HMR
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);

// Set language for OTP SMS (Hindi/English based on preference)
auth.languageCode = 'en'; // Change to 'hi' for Hindi

export default app;

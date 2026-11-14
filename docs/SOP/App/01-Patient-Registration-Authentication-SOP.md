# SOP-LIV-01: Patient Registration and Authentication

> **DRAFT – NOT APPROVED FOR CLINICAL USE**
> Document version: 1.0 | Audit date: 2025 | Status: Internal review only

---

## 1. Purpose

Define the verified registration and authentication flows in the LIV Patient Application. All behaviour described here is confirmed by code inspection of `src/routes/liv.tsx`, `src/hooks/use-auth.ts`, `src/lib/firebase.ts`, and `src/lib/api-service.ts`.

---

## 2. Scope

Covers: new patient registration, returning patient sign-in, session management, profile linking, and sign-out.

---

## 3. Authentication Provider

Firebase Authentication (Google Firebase SDK 10.8.0) is the sole identity provider.

Two sign-in methods are implemented:

| Method | Implementation |
|---|---|
| **Phone OTP** | `signInWithPhoneNumber` + `RecaptchaVerifier` (invisible) |
| **Google Sign-In** | `signInWithPopup` + `GoogleAuthProvider` |

Language code for OTP SMS is set to `"en"` in `firebase.ts`. Changing to `"hi"` would switch to Hindi SMS — this is a one-line config change, not yet exposed as a user setting.

---

## 4. New Patient Registration Flow

### 4.1 Trigger

User opens the app for the first time with no active Firebase session. After the 3-second splash screen, the app navigates to the Sign Up screen (`currentView = "signup"`).

### 4.2 Sign Up Form Fields

| Field | Validation |
|---|---|
| Full name | Minimum 2 characters |
| Mobile number | 10 digits, India (+91) |
| Email address | Standard email format |
| Age | Integer 18–110 |
| Sex | Female / Male / Other (segmented selector) |
| Data consent checkbox | Must be checked to proceed |

### 4.3 On Submit

1. Client-side validation runs. First failing field is focused.
2. If valid: `busy = true`, form disables, 900 ms simulated delay.
3. Navigate to **Welcome screen** (`currentView = "welcome"`).

> **⚠️ INCOMPLETE:** The sign-up form does **not** call `POST /api/v2/patients` at this point. Patient record creation on the backend happens separately (kiosk linkage or nurse-side creation). The form data is stored temporarily in component state and in `localStorage` via `src/lib/user-profile.ts` under the key `aaha_user_profile`.

### 4.4 Welcome Screen

Shows account confirmation with a decorative AIWS ring (not a real score), three onboarding steps, and a "Continue to sign in" button. No API calls are made here.

---

## 5. Returning Patient Sign-In Flow

### 5.1 Phone OTP Path

1. Patient enters 10-digit mobile number.
2. App calls `signInWithPhoneNumber(auth, "+91" + number, recaptchaVerifier)`.
3. An invisible reCAPTCHA completes silently.
4. Firebase sends a 6-digit OTP via SMS.
5. Patient enters the 6-digit code in the OTP input grid (6 boxes).
6. App calls `confirmationResult.confirm(code)`.
7. On success: `apiService.setToken(token)`, `setCurrentView("main")`, `setActiveTab("home")`.
8. On failure: OTP shake animation, error message displayed.

> **Note:** The prototype OTP input is 6 digits. The sign-in screen shows a 6-box OTP grid. The sign-up story shows a 4-digit reference — this is a UI inconsistency in comment copy only; the actual OTP input uses 6 digits matching Firebase's standard.

### 5.2 Google Sign-In Path

1. Patient taps "Continue with Google".
2. App calls `signInWithPopup(auth, new GoogleAuthProvider())`.
3. On success: token set, navigate to main.
4. On failure: error message shown.

---

## 6. Session Management

### 6.1 Session Restoration

`useAuth()` hook subscribes to `onIdTokenChanged`. On every page load:

1. If Firebase has a valid cached session → token refreshed, `session` state set, navigate to `"main"` (if currently at `signin` or `signup`).
2. If no session → `session = null`, `loading = false` after max 2 000 ms safety timeout.

### 6.2 Token Handling

- Firebase ID token is set on `apiService` via `apiService.setToken(token)`.
- All API calls include `Authorization: Bearer <token>` header.
- Token is refreshed automatically by `onIdTokenChanged` on expiry (~1 hour).

### 6.3 Profile Linking

After sign-in, `useAuth()` calls `GET /api/v2/patients/me`:

- **200 OK**: Patient profile loaded, `isUnlinked = false`.
- **404**: Patient record not yet linked to this Firebase UID. `isUnlinked = true`. Profile data falls back to `localStorage` (`aaha_user_profile`).

> **⚠️ PENDING:** `POST /api/v2/patients/link-by-phone` is explicitly commented out in `use-auth.ts` with the note: *"Do NOT call POST /patients/link-by-phone until confirmed live by backend developer."* Auto-linking is therefore not active.

### 6.4 Unlinked Patient State

When `isUnlinked = true`, the Profile sheet shows "Mobile Verified · Kiosk Link Pending" in amber. The patient can still use the app but no kiosk data will appear until the backend links the records.

---

## 7. Profile Edit

Accessible from the Profile sheet (top-right avatar button in main view).

Editable fields:
- Full name
- Age
- Sex (Female / Male / Other)
- Preferred nurse (shown only for unlinked patients — `!activePatient?.patient_id`)

On save: calls `PUT /api/v2/patients/me` with changed fields. On error: toast notification shown, changes reverted.

A separate segment selector sets appearance theme (Black / White), saved via `PUT /api/v2/preferences/me` and `localStorage("liv.theme")`.

---

## 8. Sign Out

Located in the Profile sheet (bottom of consent section).

1. Calls `signOut(auth)`.
2. Clears `apiService.setToken(null)`.
3. Removes `localStorage("aaha_demo_session")`.
4. Navigates to `"splash"`.
5. Clears all TanStack Query cache via `qc.clear()`.
6. Resets `demoHasReport = false`.

---

## 9. Consent Settings

Three toggles in the Profile sheet:

| ID | Label | Description |
|---|---|---|
| `capture` | Capture at the kiosk | Measurements and what the patient tells Liv |
| `share` | Share with physician | Reports reach a doctor only with this on |
| `remind` | Reminders | Appointments, re-tests and aftercare |

> **⚠️ MOCK:** These toggles update local component state (`consentSettings`) only. No API call persists consent to the backend. This is a placeholder UI pending a consent management endpoint.

---

## 10. Nurse Assignment (Booking only)

During profile completion for unlinked patients, a nurse selector appears. Nurses are fetched from `GET /api/v2/nurses`. On save with nurse selected: calls `POST /api/v2/nurses/:nurse_id/assign-patient`.

---

## 11. Mock / Incomplete Items

| Item | Status |
|---|---|
| Sign-up form → `POST /api/v2/patients` | ❌ Not called — form navigates to Welcome without creating backend record |
| `POST /patients/link-by-phone` | ❌ Commented out, pending backend confirmation |
| Consent toggles → backend persistence | ❌ Local state only |
| SMS language toggle (Hindi) | ⚠️ Code exists, not exposed as user setting |

---

*End of SOP-LIV-01.*

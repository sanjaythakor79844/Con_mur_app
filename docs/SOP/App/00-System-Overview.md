# LIV Patient Application — App System Overview

> **DRAFT – NOT APPROVED FOR CLINICAL USE**
> Document version: 1.0 | Audit date: 2025 | Status: Internal review only

---

## 1. Purpose

This document describes the LIV Patient Application as it exists in the codebase at the time of audit. It is intended to support accreditation-oriented SOP documentation. It records only verified, code-confirmed behaviour. All mock features, incomplete integrations and pending items are explicitly marked.

---

## 2. Application Identity

| Field | Value |
|---|---|
| Application name | LIV — Longevity, measured |
| Organisation | Aaroogya AI / AAHA Health |
| Route path | `/liv` |
| Framework | React 18.3 + TanStack Router 1.170 + TanStack Start 1.168 |
| Build tool | Vite 7.3 |
| Language | TypeScript 5.8 (strict) |
| Styling | Custom monochrome CSS design system (`.liv-scope`) + Tailwind CSS v4 (outer wrapper only) |
| Native wrapper | Capacitor 6.2 (Android) |
| Auth provider | Firebase Authentication (Phone OTP + Google Sign-In) |
| AI companion | Vercel AI SDK + `useChat` with `DefaultChatTransport` |
| State management | React `useState` / `useMemo` + TanStack Query v5 |

---

## 3. Architecture Summary

```
Browser / Capacitor Android
  └─ /liv  (TanStack Router file-based route)
       └─ LivAppScreen (single React component, ~7 500 lines)
            ├─ Firebase Auth  (phone OTP / Google)
            ├─ TanStack Query  (server state cache)
            │    ├─ GET /api/v2/patients/me          → patient profile
            │    ├─ GET /api/v2/assessments/me       → kiosk assessments
            │    ├─ GET /api/v2/blood-reports/me     → uploaded lab reports
            │    ├─ GET /api/v2/care-plans/me        → active care plan
            │    ├─ GET /api/v2/appointments/me      → upcoming appointments
            │    ├─ GET /api/v2/preferences/me       → user preferences
            │    ├─ GET /api/v2/notifications/me     → notifications
            │    └─ GET /api/v2/nurses               → nurse list (booking)
            ├─ AI Chat  (POST /api/chat via useChat)
            └─ PDF Parser  (pdfjs-dist, all pages)
```

### Backend endpoints (3 hosts)

| Label | Base URL source | Purpose |
|---|---|---|
| `common` | `VITE_API_BASE_URL` | Patients, assessments, care plans, appointments, preferences, notifications |
| `blood_report` | `VITE_BLOOD_REPORT_API_BASE_URL` | Blood report upload, retrieval, file blob |
| `feature` | `VITE_FEATURE_API_BASE_URL` | FCM token registration, nurse assignment |

---

## 4. User Journey States

The application determines which home/markers/plan experience to render via a `journey` constant computed from real API data:

| Value | Condition | Experience |
|---|---|---|
| **Journey 1** | No report (new user, API loaded with zero data) | Kiosk-waiting home, Learn basics, empty markers/plan |
| **Journey 2** | Kiosk assessment present (`source === "kiosk"`) | Full report home, Pod-completed card, AIWS + age stat cards |
| **Journey 3** | Uploaded report only (no kiosk assessment) | Upload card, age "Needs more results", blood-only markers, results-to-review plan |

During API loading (`isAssessmentsLoading || uploadsQuery.isLoading`) the app always renders Journey 1 to avoid showing demo data.

---

## 5. Screen Inventory (verified)

| Screen | Trigger | Real data |
|---|---|---|
| Splash | App open, no session | None |
| Sign Up | First visit | Form fields saved to localStorage + backend |
| Welcome | After sign-up form submit | Decorative AIWS ring (not real score) |
| Sign In | Returning user / post sign-up | Firebase OTP / Google |
| Analyzing | After kiosk fetch or file upload | Real assessment/report processing |
| Main — Home | After sign-in | Journey 1/2/3 from API |
| Main — Markers | Tab | BIOMARKERS merged with API readings |
| Main — Plan | Tab | CarePlan from API or Journey 3 results list |
| Main — Care | Tab | Appointments + care team + Learn section |
| Marker Detail | Tap any marker row | Real or demo biomarker data |
| Journey Track | Tap track card | Static JOURNEY_TRACKS + API appointments |
| Longevity Report | View report button | PDF viewer (kiosk PDF) |
| Book / Booked | Book a visit | Appointment API |
| Sheets: Age, Score, Upload, Report, Profile, Learn, Glossary, Pod, Centres, Therapy, Pkg, Svc, Appt, After, Ask Liv | Context taps | Mixed real/demo |

---

## 6. Data Sources — Real vs Demo

| Data | Source | Status |
|---|---|---|
| Patient profile | `GET /api/v2/patients/me` | ✅ Real |
| Kiosk assessments | `GET /api/v2/assessments/me` | ✅ Real |
| Uploaded blood reports | `GET /api/v2/blood-reports/me` | ✅ Real |
| Biological age | PhenoAge model from PDF extraction + assessment | ✅ Real (when kiosk PDF available) |
| AIWS score | `latestAssessment.score` | ✅ Real |
| Care plan | `GET /api/v2/care-plans/me` | ✅ Real |
| Appointments | `GET /api/v2/appointments/me` | ✅ Real |
| AI chat responses | POST `/api/chat` → AI gateway | ✅ Real |
| AI preset questions | Computed from real biomarkers + age | ✅ Real (as of 2025-07) |
| BIOMARKERS template data | `src/lib/liv-data.ts` static constants | ⚠️ Demo defaults, overwritten by real readings |
| Streaks, XP points | Hardcoded demo values | ❌ Mock — not from API |
| Trajectory SVG chart (age sheet) | Hardcoded coordinates | ❌ Mock |
| "Day-90 re-measure 19 Dec" date | Hardcoded in appointment list seed | ⚠️ Partially real via care plan |
| Video placeholders (Learn sheets) | Placeholder UI, no video recorded | ❌ Pending |
| Centre directory | Static single-centre record | ❌ Mock — no live endpoint |
| Organ age | Not implemented | ❌ Pending |

---

## 7. Environment Variables Required

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_API_BASE_URL
VITE_BLOOD_REPORT_API_BASE_URL
VITE_FEATURE_API_BASE_URL
```

---

## 8. Known Limitations at Audit Date

1. **Single-file component** — The entire Liv app lives in `src/routes/liv.tsx` (~7 500 lines). This creates maintainability risk.
2. **Demo data fallback** — When `session` is absent (unauthenticated preview), `demoHasReport = true` renders demo biomarkers. This is intentional for prototype previews but must not reach a production-only deployment.
3. **Streak and XP not persisted** — `weeklyProgress` and `streak` are component state only; they reset on page reload.
4. **No offline support** — The app requires network for all data. Capacitor filesystem is used only for PDF file opening on Android.
5. **Centre finder** — Single hardcoded entry. No live directory endpoint exists.
6. **Video placeholders** — All `VideoPlaceholder` components in Learn sheets show "Not recorded yet." No actual video assets exist.
7. **Organ age** — Labelled "Not available yet" throughout; no backend calculation exists.
8. **`POST /patients/link-by-phone`** — Commented out in `use-auth.ts` with the note "Do NOT call until confirmed live by backend developer."

---

*End of document.*

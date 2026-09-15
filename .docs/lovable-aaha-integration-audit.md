# Lovable Healthcare Application
## AAHA Flask/PostgreSQL Integration Audit

**Date:** 2026-09-10  
**Scope:** Read-only inspection of the existing Lovable application  
**Status:** No application code or database files were modified during the audit.

## Executive Summary

The existing application is a React/TanStack Start healthcare application generated through Lovable. Its current authentication, patient records, reports, assessments, readings, appointments, notifications, prescriptions, and file storage are implemented through Supabase.

There is currently no Firebase integration, no Firebase Phone OTP flow, no AAHA Flask API client, and no `API_BASE_URL`. The requested architecture therefore requires replacing or routing the current Supabase patient-data paths through the existing AAHA Flask backend, while preserving the existing UI where possible.

The AAHA Flask backend contract was not present in this repository. Endpoint names, request/response schemas, token validation behavior, patient identifier mapping, file storage, and visit-history APIs must be confirmed before implementation.

## A. Current Project Architecture

### Framework and versions

- React: `^19.2.0`
- TanStack Start: `^1.168.26`
- TanStack Router: `^1.170.16`
- Vite
- TypeScript: `^5.8.3`
- Supabase JS: `^2.112.3`

### Main structure

- `src/routes/`: file-based patient, doctor, auth, report, screening, and API routes
- `src/components/`: shared UI and healthcare components
- `src/hooks/`: authentication, readings, overview, role, and voice hooks
- `src/lib/`: API helpers, screening, reports, prescriptions, AI, recommendations, and domain logic
- `src/integrations/supabase/`: Supabase browser/server clients, auth middleware, generated types, and preview storage
- `supabase/migrations/`: Supabase PostgreSQL schema and policy migrations
- `src/server.ts`: server entry point
- `src/start.ts`: TanStack Start setup and global middleware
- `vite.config.ts`: Vite configuration
- `package.json`: scripts and dependencies

No test files or test script were found. Available scripts include `dev`, `build`, `build:dev`, `preview`, `lint`, and `format`.

## B. Current Authentication Flow

1. The login page uses Supabase email/password authentication in `src/routes/login.tsx`.
2. New accounts use `supabase.auth.signUp()`.
3. Google OAuth is implemented through `src/integrations/lovable/index.ts`.
4. The active session is read by `src/hooks/use-auth.ts`.
5. Supabase persists the session in browser storage.
6. Client server-function calls attach a Supabase access token as:

   `Authorization: Bearer <supabase_access_token>`

7. `src/integrations/supabase/auth-middleware.ts` validates the Supabase token and exposes `supabase`, `userId`, and token claims to server functions.

### Firebase status

The repository contains no verified Firebase implementation:

- No Firebase dependency
- No Firebase imports
- No Firebase configuration
- No `signInWithPhoneNumber`
- No `RecaptchaVerifier`
- No `getIdToken`
- No Firebase UID handling
- No Firebase environment variables

The current user identity is the Supabase user ID, not a Firebase UID.

## C. Current Data Storage Flow

The current primary data backend is Supabase.

### Supabase tables and storage used

- `profiles`
- `reports`
- `assessments`
- `screenings`
- `screening_answers`
- `test_readings`
- `appointments`
- `notifications`
- `user_roles`
- `care_assignments`
- `prescriptions`
- `prescription_versions`
- Supabase Storage bucket: `reports`

The main direct data helper is `src/lib/aaha-api.ts`.

There is no direct PostgreSQL connection from the frontend. However, the application currently uses the Supabase PostgreSQL database, which conflicts with the requested AAHA PostgreSQL source of truth unless those paths are migrated or replaced.

### localStorage usage

Local storage is used for:

- Supabase session/preview authentication storage in `src/integrations/supabase/previewAuthStorage.ts`
- Language preference in `src/lib/i18n.tsx`

No evidence was found that patient profiles, reports, vitals, tests, assessments, or appointments are stored only in localStorage.

## D. Current API Integration

No AAHA Flask API integration exists.

### Existing application API paths

- `/api/chat` in `src/routes/api/chat.ts`
- `/api/adaptive/*` in `src/routes/api/adaptive/$..ts`

### Existing server functions

`src/lib/screening.functions.ts`:

- `startScreening`
- `saveScreeningState`
- `saveScreeningAnswer`
- `saveTestReading`
- `deleteTestReading`
- `completeScreening`
- `getScreening`
- `getActiveScreening`
- `getLatestScreening`
- `listLatestReadings`

`src/lib/report-ocr.functions.ts`:

- `runReportOcr`
- `saveExtractedValues`
- `analyzeReport`

`src/lib/prescriptions.functions.ts`:

- `generatePrescriptionDraft`
- `regeneratePrescriptionDraft`
- `acknowledgeRisk`
- `savePrescription`
- `approvePrescription`

### External services

- Supabase database and storage
- Lovable AI Gateway: `https://ai.gateway.lovable.dev/v1`
- No `API_BASE_URL`
- No Flask backend URL
- No Axios, `ky`, or dedicated HTTP API client

## E. Patient Profile Implementation

Patient profile behavior is primarily in `src/routes/profile.tsx`.

- Reads the current Supabase user through `useAuth()`.
- Loads profile data through `getProfile()`.
- Updates profile data through `updateProfile()`.
- Uses the Supabase session phone number as a fallback.
- Reads report and appointment counts from Supabase.
- Signs out through `supabase.auth.signOut()`.

The profile currently uses Supabase user IDs and Supabase `profiles` rows.

## F. Reports Implementation

Report data access is in `src/lib/aaha-api.ts`.

Current behavior includes:

- List reports from Supabase `reports`
- Upload files to Supabase Storage bucket `reports`
- Insert report metadata into Supabase `reports`
- Generate signed report URLs
- Delete report files and rows
- Store extracted values
- Store OCR status and analysis results

OCR and report analysis are implemented in `src/lib/report-ocr.functions.ts` and use the Lovable AI Gateway.

Relevant pages include:

- `src/routes/reports.tsx`
- `src/routes/report.$id.tsx`
- `src/routes/upload.tsx`
- `src/routes/aaha.tsx`

## G. Tests and Vitals Implementation

Screening and readings are implemented through:

- `src/lib/screening.functions.ts`
- `src/hooks/use-readings.ts`
- `src/routes/checkup.tsx`
- `src/routes/assessment.tsx`
- `src/routes/screening.tsx`
- `src/routes/progress.tsx`
- `src/routes/review.tsx`
- `src/routes/recommended-tests.tsx`
- `src/routes/diagnostics.tsx`

Test readings are persisted through Supabase `test_readings`. Screening state, answers, and assessment results are also persisted through Supabase.

The domain logic for symptom questions and condition detection is local to the application in `src/lib/ambika-engine.ts` and related files.

## H. Visit History

A dedicated patient visit-history API or `visits` table was not found during inspection.

Appointments exist through the Supabase `appointments` table and are used by:

- `src/lib/aaha-api.ts`
- `src/routes/doctors.tsx`
- `src/routes/teleconsultation.tsx`
- `src/routes/profile.tsx`

This is not equivalent to a confirmed AAHA visit-history implementation. A Flask visit-history endpoint and UI mapping will likely be required.

## I. Mock, Demo, and Static Data

The following areas contain static or hard-coded data:

- Doctor names, specialties, ratings, languages, and slots in `src/routes/doctors.tsx`
- Centre details in `src/routes/centres.tsx` and `src/routes/centre-details.tsx`
- Diagnostic locations in `src/routes/diagnostics.tsx`
- Therapy options in `src/routes/therapies.tsx`
- Test catalog in `src/lib/diagnostics-catalog.ts`
- Recommendations in `src/lib/health-recommendations.ts`
- Domain data and health flows in `src/lib/ambika-data.ts`

Appointments are persisted in Supabase, but doctor directories and available slots are currently static.

## J. Supabase and Database Findings

Supabase-related files include:

- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/client.server.ts`
- `src/integrations/supabase/auth-middleware.ts`
- `src/integrations/supabase/auth-attacher.ts`
- `src/integrations/supabase/previewAuthStorage.ts`
- `src/integrations/supabase/types.ts`
- `supabase/migrations/*`

The application uses Supabase Auth, Supabase database APIs, Supabase Storage, and Supabase server middleware.

The migration directory includes repeated or overlapping definitions for core tables. The actual deployed schema cannot be verified from repository files alone.

## K. Environment Variables

Only variable names were inspected; secret values are intentionally omitted.

- `SUPABASE_PROJECT_ID`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LOVABLE_API_KEY`

No Firebase variables and no `API_BASE_URL` were found.

## L. Files Likely To Require Changes

These are candidates only and must wait for the AAHA Flask contract:

- `src/routes/login.tsx`
- `src/hooks/use-auth.ts`
- `src/lib/aaha-api.ts`
- `src/integrations/supabase/auth-attacher.ts`
- `src/integrations/supabase/auth-middleware.ts`
- `src/lib/screening.functions.ts`
- `src/lib/report-ocr.functions.ts`
- `src/lib/prescriptions.functions.ts`
- `src/routes/profile.tsx`
- Report, screening, assessment, progress, appointment, visit, and prescription routes
- `src/routes/api/chat.ts`
- `src/routes/api/adaptive/$..ts`
- Environment and deployment configuration

Potentially affected Supabase integrations should be removed only after data ownership and migration are confirmed.

## M. Files That Should Initially Remain Unchanged

Until the backend contract is confirmed, preserve:

- UI components under `src/components`
- `src/lib/ambika-engine.ts`
- `src/lib/ambika-data.ts`
- `src/lib/diagnostics-catalog.ts`
- `src/lib/health-recommendations.ts`
- `src/routes/__root.tsx`
- Supabase migrations
- Generated Supabase types
- Supabase Storage handling, unless Flask explicitly replaces file storage

## N. Missing AAHA Flask APIs

The following API capabilities must be confirmed with the AAHA backend team:

1. Firebase ID-token validation
2. Patient lookup by Firebase UID
3. Patient profile retrieval and update
4. Reports list, upload, download, and delete
5. Report OCR and extracted values
6. Report analysis
7. Screening session lifecycle
8. Screening answers
9. Vitals and test readings
10. Assessment history
11. Visit history
12. Appointments and cancellation
13. Doctor availability and booking
14. Notifications and read/unread state
15. Patient prescriptions
16. Doctor consultations and prescription approval
17. Chat and adaptive screening, if Flask will own those flows
18. Dynamic doctors, centres, diagnostic services, and therapies if those must come from the AAHA backend

## O. Required Backend Clarifications

Before implementation, obtain:

- Flask base URL
- Exact endpoint list
- HTTP methods
- Request and response schemas
- Firebase token validation method
- Whether the backend accepts `Authorization: Bearer <Firebase ID token>`
- Firebase UID to PostgreSQL patient mapping
- Patient ID format
- File upload and storage behavior
- Pagination rules
- Error response format
- Role and permission rules
- Visit-history schema
- Whether Supabase remains temporarily required for historical records

## P. Recommended Integration Plan

1. Obtain the AAHA Flask API or OpenAPI contract.
2. Confirm Firebase Phone OTP setup and ID-token validation.
3. Add one typed AAHA API client with a configurable Flask base URL.
4. Implement Firebase authentication and ID-token propagation.
5. Implement patient lookup/profile using Firebase UID mapping.
6. Migrate reports and report details.
7. Migrate screening, tests, vitals, and assessments.
8. Migrate appointments and visit history.
9. Migrate prescriptions and doctor workflows.
10. Decide whether Flask or Supabase owns report files.
11. Add integration tests against the AAHA backend.
12. Remove or isolate Supabase patient-data paths only after data parity is verified.

## Final Conclusion

The current Lovable application is not yet connected to the AAHA Flask backend or the AAHA PostgreSQL database. It is a Supabase-backed application using Supabase authentication and Supabase user IDs. Firebase Phone OTP, Firebase UID handling, Firebase ID-token propagation, Flask API integration, and shared AAHA patient records still need to be implemented after the backend contract is provided and approved.

## Read-Only Backend Audit Addendum

The requested local backend check was performed on 2026-09-10.

- `GET http://localhost:5001/api` was attempted.
- The service was unreachable: `Unable to connect to the remote server`.
- No Flask/Python backend source, route definitions, OpenAPI document, or PostgreSQL schema was found in this workspace.
- No relevant backend source was found in the immediate parent workspace area.
- Therefore, no actual AAHA endpoint can be verified from the current environment.
- The possible endpoints listed in the integration requirements remain unverified and must not be assumed to exist.
- Firebase UID to PostgreSQL patient mapping remains unknown.
- The actual PostgreSQL patient schema remains unknown.

### Backend information required before migration approval

Please make the AAHA backend available at `http://localhost:5001/api`, or provide its source/API contract, including:

1. Actual route definitions and HTTP methods
2. Firebase Admin token verification behavior
3. Patient profile/create/update schemas
4. Firebase UID and verified phone-number mapping
5. Reports, tests, vitals, and visit endpoints
6. Authentication and authorization responses
7. CORS configuration for the frontend origin
8. PostgreSQL patient and related table schema

No migration code was changed after this backend audit. Implementation should begin only after the actual backend contract is available and explicitly approved.

# SOP-LIV-10: Backend API and Database Documentation

> **DRAFT – NOT APPROVED FOR CLINICAL USE**
> Document version: 1.0 | Audit date: 2025 | Status: Internal review only

---

## 1. Purpose

Document all backend API calls made by the LIV Patient Application as confirmed by code inspection. This documents the client's view of the API contract. Backend implementation is not audited here.

Source files: `src/lib/aaha-api.ts`, `src/lib/api-service.ts`, `src/routes/api/chat.ts`.

---

## 2. Backend Hosts

| Label | Environment variable | Fallback URL | Purpose |
|---|---|---|---|
| `common` | `VITE_API_BASE_URL` | `https://aaha-api-*.asia-south1.run.app/api/v2` | Patients, assessments, care plans, appointments, preferences, notifications |
| `blood_report` | `VITE_BLOOD_REPORT_API_BASE_URL` | `https://aaha-api-sdrsnwzwka-el.a.run.app/api/v2` | Blood report upload and retrieval |
| `feature` | `VITE_FEATURE_API_BASE_URL` | `https://aaha-feature-backend.onrender.com/api/v2` | FCM tokens, nurse assignment |

> **Note:** The common API base URL in the code contains a redacted sender ID. The correct URL must be configured in `.env`.

---

## 3. Authentication

All API calls include `Authorization: Bearer <firebase_id_token>`. The token is obtained from Firebase Auth and auto-refreshed. No API key or basic auth is used.

---

## 4. Endpoint Catalogue

### 4.1 Patients

| Method | Path | Description | Backend |
|---|---|---|---|
| `POST` | `/patients` | Create new patient profile | common |
| `GET` | `/patients/me` | Get own patient profile | common |
| `PUT` | `/patients/me` | Update name, age, gender | common |
| `POST` | `/patients/link-by-phone` | Link Firebase UID to existing patient | common |

> `POST /patients/link-by-phone` is commented out in `use-auth.ts` and not currently called.

### 4.2 Assessments

| Method | Path | Description | Backend |
|---|---|---|---|
| `GET` | `/assessments/me` | List all assessments for patient | common |

Returns `Assessment[]` sorted newest-first. Each assessment has: `id`, `source` (`"kiosk"` / `"consumer_app"` / `"health_record"`), `score`, `readings`, `report_pdf_url`, `workflow`, `created_at`.

### 4.3 Blood Reports

| Method | Path | Description | Backend |
|---|---|---|---|
| `POST` | `/blood-reports/me` | Upload blood report (multipart) | blood_report |
| `GET` | `/blood-reports/me` | List uploaded reports | blood_report |
| `GET` | `/blood-reports/:id` | Get individual report with parameters | blood_report |
| `GET` | `/blood-reports/:id/file` | Get report file blob | blood_report |
| `DELETE` | `/blood-reports/:id` | Delete uploaded report | blood_report |

### 4.4 Care Plans

| Method | Path | Description | Backend |
|---|---|---|---|
| `GET` | `/care-plans/me` | Get active care plan | common |
| `PUT` | `/care-plans/:id` | Update care plan fields | common |

### 4.5 Appointments

| Method | Path | Description | Backend |
|---|---|---|---|
| `GET` | `/appointments/me` | List appointments | common |
| `POST` | `/appointments` | Book new appointment | common |
| `PUT` | `/appointments/:id` | Update/reschedule appointment | common |
| `DELETE` | `/appointments/:id` | Cancel appointment | common |
| `GET` | `/appointment-slots` | Get available slots | common |

### 4.6 Preferences

| Method | Path | Description | Backend |
|---|---|---|---|
| `GET` | `/preferences/me` | Get user preferences | common |
| `PUT` | `/preferences/me` | Update preferences (theme, language, consents) | common |

### 4.7 Notifications

| Method | Path | Description | Backend |
|---|---|---|---|
| `GET` | `/notifications/me` | List notifications | common |
| `PUT` | `/notifications/:id/read` | Mark notification as read | common |

### 4.8 Nurses

| Method | Path | Description | Backend |
|---|---|---|---|
| `GET` | `/nurses` | List available nurses | common |
| `POST` | `/nurses/:nurse_id/assign-patient` | Assign nurse to patient | feature |

### 4.9 FCM Tokens

| Method | Path | Description | Backend |
|---|---|---|---|
| `POST` | `/fcm-tokens` | Register FCM device token | feature |

### 4.10 Proxy PDF

| Method | Path | Description | Backend |
|---|---|---|---|
| `GET` | `/api/proxy-pdf?url=...` | Proxy PDF fetch (CORS bypass) | TanStack Start server route |

### 4.11 AI Chat

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/chat` | AI message stream endpoint (server-side route) |

---

## 5. Request / Response Conventions

- All requests: `Content-Type: application/json` (except multipart upload)
- All responses: JSON
- Error format: `{ error: string, message: string }` with HTTP status
- Errors include `.status` on the thrown `Error` object for client-side branching (404 → unlinked, 401 → re-auth)

---

## 6. Data Model Summary

### Assessment

```typescript
{
  id: string;
  patient_id: string;
  source: "consumer_app" | "kiosk" | "health_record";
  score: number;              // AIWS score 0–100
  readings: Record<string, unknown>;  // vital signs, biomarkers
  report_pdf_url?: string;    // signed URL to kiosk PDF
  kiosk_id?: string;
  workflow?: WorkflowStatus;  // { state, status, can_upload, released }
  created_at: string;         // ISO datetime
}
```

### CarePlan

```typescript
{
  _id?: string;
  firebase_uid: string;
  lifestyle_management?: { title: string; detail?: string; done?: boolean }[];
  follow_up?: { duration_days?: number; timeline?: string; tests?: string[] };
  status: "draft" | "approved" | "completed" | "cancelled";
  approved_by?: string;       // Doctor name
}
```

### BloodReportItem

```typescript
{
  blood_report_id: number;
  original_filename: string;
  lab_name: string | null;
  status: "valid" | "review" | "invalid" | "pending";
  validation_note?: string;
  parameters_read?: number;
  parameters?: { test_name, value, unit, reference_range, status }[];
}
```

---

## 7. TanStack Query Keys

| Query key | Endpoint | Stale time |
|---|---|---|
| `["my-profile", uid]` | `GET /patients/me` | Default |
| `["assessments", uid]` | `GET /assessments/me` | Default |
| `["my-uploads", uid]` | `GET /blood-reports/me` | Default |
| `["carePlans", uid]` | `GET /care-plans/me` | Default |
| `["appointments", uid]` | `GET /appointments/me` | Default |
| `["preferences", uid]` | `GET /preferences/me` | Default |
| `["notifications", uid]` | `GET /notifications/me` | Default |
| `["nurses", uid]` | `GET /nurses` | Default |
| `["appointment-slots"]` | `GET /appointment-slots` | Default |

All queries are disabled when `session` is null (unauthenticated).

---

## 8. Known API Issues / Gaps

| Issue | Impact |
|---|---|
| `POST /patients/link-by-phone` disabled | New users who registered via app but are kiosk-screened as a different record cannot auto-link |
| `appointment-slots` real availability not wired to UI | Slot picker uses client-side simulation formula |
| No endpoint for consent persistence | Consent toggles are UI-only |
| No endpoint for treatment pack tracking | Pack counts are static |
| No centre directory endpoint | Centre finder shows hardcoded single entry |

---

*End of SOP-LIV-10.*

# SOP-LIV-09: Patient Profile Management

> **DRAFT – NOT APPROVED FOR CLINICAL USE**
> Document version: 1.0 | Audit date: 2025 | Status: Internal review only

---

## 1. Purpose

Document the patient profile sheet, settings, and data management features. Source files: `src/routes/liv.tsx` (profile sheet ~lines 7030–7380), `src/lib/user-profile.ts`, `src/lib/aaha-api.ts`.

---

## 2. Profile Sheet Access

Tapping the avatar/user icon in any main view header opens the Profile sheet (`activeSheet = "profile"`).

---

## 3. Profile Header

Displays:
- Initial avatar circle (first letter of first name)
- Full name from `fullName` (resolved from `activePatient?.full_name` → `session.displayName` → stored form name)
- Link status indicator:

| Condition | Display |
|---|---|
| `activePatient?.patient_id` present | "Clinical ID: #[id] · Verified" |
| `isUnlinkedPatient` | "Mobile Verified · Kiosk Link Pending" (amber) |
| Profile load error | "Could not load profile from server" (red) |
| Loading | "Checking clinical records..." |
| Default | "Member · Connected" |

---

## 4. Clinical Demographics Card

Non-edit view shows (2×2 grid):
- Mobile number (from `activePatient?.mobile_number` or Firebase session)
- Age / Sex
- Health Centre: "Aaha Aundh, Pune" (hardcoded)
- Link Status: "Linked Patient" or "Sync Pending"

> **⚠️ MOCK:** "Aaha Aundh, Pune" is hardcoded. No API provides the patient's assigned centre.

---

## 5. Profile Edit

Toggled by "Edit" / "Cancel" button. Edit form fields:
- Full name (`editName`)
- Age (`editAge`, integer)
- Sex (Female / Male / Other, segmented)
- Preferred nurse (dropdown, only for unlinked patients — nurses from `GET /api/v2/nurses`)

On "Save Profile":
1. Calls `PUT /api/v2/patients/me` with changed fields
2. Invalidates `["my-profile"]` query
3. If nurse selected: calls `POST /api/v2/nurses/:nurse_id/assign-patient`
4. Toast on success/error

---

## 6. Appearance

Segmented control: Black / White.

On change:
1. `setAppTheme(theme)` → updates `data-app` attribute on `.phone` div
2. Calls `PUT /api/v2/preferences/me` with `{ theme }`
3. Writes to `localStorage("liv.theme")` and `localStorage("aaha.theme")`

---

## 7. Programme Length (Demo Setting)

Three options: 90 / 160 / 180 days. Displays label "(demo)".

On change:
- `setPlanLen(n)` — component state
- If `activeCarePlan` exists: calls `PUT /api/v2/care-plans/:id` with `{ follow_up: { duration_days: n } }`
- Adjusts re-test date appointment label
- Toast: "Programme set to X days by the doctor."

---

## 8. Consent Settings

Three toggles (Capture, Share, Remind). Component state (`consentSettings`) only.

> **⚠️ MOCK:** No API call persists consent. This is a UI placeholder.

---

## 9. Notifications

Rendered in profile sheet from `GET /api/v2/notifications/me`. Each notification shows title, body, and "mark read" action. Mark read calls `PUT /api/v2/notifications/:id/read`.

---

## 10. Sign Out

Located at bottom of profile sheet.

Steps:
1. `signOut(auth)` — Firebase sign-out
2. `apiService.setToken(null)` — clear API token
3. `localStorage.removeItem("aaha_demo_session")`
4. `qc.clear()` — clear all cached queries
5. `setDemoHasReport(false)` — reset to Journey 1
6. `setCurrentView("splash")` — navigate to splash

---

## 11. localStorage Usage

| Key | Contents |
|---|---|
| `aaha_user_profile` | `UserProfile` JSON (name, phone, age, gender, uid) |
| `liv.theme` | `"dark"` or `"light"` |
| `aaha.theme` | Same (secondary key) |
| `aaha_demo_session` | Demo session marker (removed on sign-out) |

> **Security note:** `aaha_user_profile` stores PII (name, phone number, age) in `localStorage`. This is a known interim pattern flagged in `src/lib/user-profile.ts`: *"In production, you should use Firestore or your backend API."*

---

## 12. Mock / Incomplete Items

| Item | Status |
|---|---|
| "Aaha Aundh, Pune" centre name | ❌ Hardcoded |
| Consent API persistence | ❌ Local state only |
| `aaha_user_profile` localStorage PII | ⚠️ Interim pattern — should move to backend |

---

*End of SOP-LIV-09.*

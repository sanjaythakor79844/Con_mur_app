# SOP-LIV-11: Patient Data Security and Privacy

> **DRAFT – NOT APPROVED FOR CLINICAL USE**
> Document version: 1.0 | Audit date: 2025 | Status: Internal review only

---

## 1. Purpose

Document data security and privacy measures as implemented in the LIV Patient Application client code. This covers authentication, data transmission, local storage, and known gaps. Backend security is not audited here.

---

## 2. Authentication Security

| Control | Implementation |
|---|---|
| Identity provider | Firebase Authentication (Google-managed) |
| Token type | Firebase ID token (JWT, RS256-signed, 1-hour expiry) |
| Token auto-refresh | `onIdTokenChanged` listener in `use-auth.ts` |
| Token storage | In-memory only (`apiService.token` private field) — not in localStorage |
| Fallback token fetch | `auth.currentUser.getIdToken()` on each API call if in-memory token is unset |
| reCAPTCHA | Invisible reCAPTCHA on phone OTP sign-in |

---

## 3. API Communication

| Control | Implementation |
|---|---|
| Transport | HTTPS only (all base URLs use `https://`) |
| Auth header | `Authorization: Bearer <firebase_id_token>` on every call |
| CORS | PDF proxy route (`/api/proxy-pdf`) used to bypass direct CORS on PDF URLs |
| Input sanitisation | No client-side SQL/NoSQL injection risk (REST JSON API, no raw queries from client) |

---

## 4. Local Storage — PII Exposure

| Key | Contents | Risk |
|---|---|---|
| `aaha_user_profile` | `{ uid, phoneNumber, firstName, lastName, age, gender, createdAt }` | ⚠️ PII in localStorage — readable by any JS on the page |
| `liv.theme` | `"dark"` / `"light"` | Low |
| `aaha.theme` | Same | Low |
| `aaha_demo_session` | Demo marker string | Low |

> **⚠️ KNOWN GAP:** Phone number, full name, age and gender are stored in `localStorage`. The code comment in `src/lib/user-profile.ts` acknowledges this: *"In production, you should use Firestore or your backend API."* This must be remediated before production clinical use.

---

## 5. File Handling

| Scenario | Handling |
|---|---|
| PDF upload | Sent as `multipart/form-data` over HTTPS to `blood_report` backend |
| PDF file size limit | 10 MB enforced client-side |
| Allowed file types | PDF, JPG, JPEG, PNG (checked by extension and MIME type) |
| PDF viewing (web) | `URL.createObjectURL(blob)` → new browser tab → `revokeObjectURL` after 10 s |
| PDF viewing (Android) | Written to `Filesystem.cache` as temp file → opened via `FileOpener`. Cache directory, not persistent storage |

---

## 6. Push Notifications

FCM tokens are obtained via Capacitor `PushNotifications` plugin (Android only). The token is sent to `POST /api/v2/fcm-tokens`. Platform check: `Capacitor.isNativePlatform()`. Push notifications do not function on web builds.

---

## 7. Data Minimisation

The app requests only:
- Firebase Phone number or Google email/name (for auth)
- Patient-entered name, age, sex (for profile)
- Uploaded blood report files (for analysis)
- Location (for centre finder — optional, browser prompt, not stored)

---

## 8. Consent

Consent toggles (Capture, Share, Remind) exist in the Profile sheet but are not persisted to any backend. This is a **known gap** — consent state is lost on page reload.

---

## 9. Data Retention and Deletion

No client-side data deletion feature is implemented beyond sign-out (which clears the demo session marker and query cache). Patient data deletion must be handled by the backend / data controller.

---

## 10. Known Security Gaps

| Gap | Severity | Remediation |
|---|---|---|
| PII in localStorage (`aaha_user_profile`) | Medium | Move to backend API |
| Consent not persisted to backend | High (regulatory) | Implement consent API endpoint |
| AI chat responses not clinically guardrailed on client | Medium | Server-side system prompt must enforce safety |
| No session timeout / inactivity lock | Low | Add idle-timeout mechanism |
| `POST /patients/link-by-phone` disabled | Low (functional gap) | Confirm backend readiness, re-enable |

---

*End of SOP-LIV-11.*

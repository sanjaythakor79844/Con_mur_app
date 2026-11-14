# SOP-LIV-12: App Error Handling and Troubleshooting

> **DRAFT – NOT APPROVED FOR CLINICAL USE**
> Document version: 1.0 | Audit date: 2025 | Status: Internal review only

---

## 1. Purpose

Document how errors are caught, displayed and logged in the LIV app. Source files: `src/lib/error-capture.ts`, `src/lib/error-page.ts`, `src/lib/lovable-error-reporting.ts`, `src/routes/__root.tsx`.

---

## 2. User-Facing Error Display

### 2.1 Toast Notifications

`showToast(message)` sets `toastMessage` state. A toast `<div>` renders at the bottom of the phone, visible for 2 600 ms, with a "Dismiss" button. Used for:
- API success/failure messages
- Upload validation feedback
- Booking confirmation/failure
- Habit save errors

### 2.2 Form Validation Errors

Inline `<span class="err">` elements below form fields. Set in `formErrors` state. Fields are highlighted with `className="inp bad"` (dashed border).

### 2.3 OTP Error

Shake animation on the OTP grid + error paragraph with Firebase error message translation:
- `auth/invalid-verification-code` → "Invalid code. Check the SMS and try again."
- `auth/session-expired` → "Session expired."
- `auth/too-many-requests` → "Too many attempts."
- Default: raw Firebase error code

### 2.4 Empty / Error States

Each tab has an empty state card when data is absent. API errors in TanStack Query result in queries returning empty arrays (via `.catch(() => [])`) — the app degrades gracefully to empty state rather than crashing.

---

## 3. Server-Side Error Capture

`src/lib/error-capture.ts` overrides `console.error` to:
1. Record the last error with timestamp (5 s TTL, in-memory)
2. Expand `Error` objects to include full stack trace and cause chain
3. Expose `consumeLastCapturedError()` for the server handler to retrieve

This bridges the gap where h3 (the server framework in TanStack Start) swallows thrown errors into generic `500 HTTPError` responses without stack traces.

---

## 4. API Error Handling Patterns

### 4.1 `apiFetch` in `aaha-api.ts`

```
response.ok = false → read body text → throw Error with status attached
```

### 4.2 `apiService.request` in `api-service.ts`

```
response.ok = false → parse JSON → throw Error with status
```

### 4.3 TanStack Query Retry Logic

```typescript
retry: (failureCount, error) => {
  if (error.status === 404 || error.status === 401) return false;
  return failureCount < 2;
}
```

404 and 401 are not retried. Other errors retry up to 2 times.

---

## 5. Known Error Conditions and Mitigations

| Error | Trigger | App behaviour |
|---|---|---|
| Firebase auth loading hangs | Firebase SDK delay | 2 000 ms safety timer forces `loading = false` |
| `GET /patients/me` → 404 | New user, no kiosk link | `isUnlinked = true`, profile from localStorage fallback |
| `GET /assessments/me` fails | Network / backend error | `assessments = []`, Journey 1 shown |
| PDF proxy CORS fails | PDF URL inaccessible | `fetchPdfBuffer` tries direct → proxy → logs error, PDF features unavailable |
| File upload fails | Network error or backend rejection | Toast with `validation_note` or error message |
| Habit save fails | API error | Optimistic toggle reverted, toast shown |
| Appointment cancel fails | API error | Toast with error message |
| reCAPTCHA container not found | DOM not ready | Throws: "Security verification container missing. Please refresh the page." |

---

## 6. Lovable Error Reporting

`src/lib/lovable-error-reporting.ts` and `src/integrations/lovable/index.ts` integrate with the Lovable platform for error monitoring in development. This is a development tool, not a production clinical monitoring system.

---

## 7. Console Logging

The app uses `console.error` for all API errors, auth errors, and PDF extraction failures. Console logs are not filtered in production builds. In a production clinical environment, console output should be suppressed or routed to a logging service.

---

## 8. Troubleshooting Reference

| Symptom | Likely cause | Resolution |
|---|---|---|
| App stuck on splash | Firebase init failing | Check `VITE_FIREBASE_API_KEY` env var |
| "Security verification container missing" | reCAPTCHA div not in DOM | Reload the page |
| OTP not received | Firebase SMS delivery | Check phone number format (+91 prefix, 10 digits); test with different network |
| "Clinical ID: Sync Pending" | Backend patient record not linked | Nurse must link patient in the backend admin panel |
| Markers all show demo values | No real assessments from API | Patient has not completed kiosk screening; upload a blood report |
| PDF viewer blank | CORS on PDF URL | Check `VITE_API_BASE_URL` proxy configuration |
| Booking slots all greyed out | Mock slot formula | Slot availability is not real; issue is known (see SOP-07) |
| Journey 2 shown briefly then Journey 1 | API loading state | Expected behaviour during initial load; resolves once API responds |

---

*End of SOP-LIV-12.*

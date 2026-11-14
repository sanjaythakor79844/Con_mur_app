# SOP-LIV-07: Care and Appointment Booking

> **DRAFT – NOT APPROVED FOR CLINICAL USE**
> Document version: 1.0 | Audit date: 2025 | Status: Internal review only

---

## 1. Purpose

Document the Care tab, appointment booking flow, treatment service sheets, and care team display. Source files: `src/routes/liv.tsx` (Care tab ~5042, booking screens ~5400–5660), `src/lib/aaha-api.ts` (`bookAppointment`, `cancelAppointment`, `getAppointmentSlots`), `src/components/BookVisit.tsx`.

---

## 2. Care Tab

### 2.1 Learn and Find Care Section (management addition)

Top of the Care tab (always visible):
- "Learn" → `sheet:learn`
- "About Pod sessions" → `sheet:pod`
- "Therapy glossary" → `sheet:gloss`
- "Find nearby centres" → `sheet:centres`

### 2.2 Upcoming Appointments

Loaded from `GET /api/v2/appointments/me`. Filtered to `!a.past` (future appointments only). Each appointment card shows:
- Date box (day + month)
- Appointment title and sub-description
- Day/time/days-until text
- Status pill: "Awaiting Dr. Deshmukh's sign-off" (pending) or "Approved by Dr. Deshmukh" (confirmed)

> **Note:** Doctor name is hardcoded as "Dr. Deshmukh" in status pill. The real doctor name from the appointment object (`a.raw?.doctor_name`) is used for display elsewhere.

### 2.3 Book a Visit Button

Opens booking screen (`newbook` action with no type pre-selected).

### 2.4 Recommended Treatments

Visible when `hasReport`. Rendered from `TREATMENTS.filter(x => x.rec)` — static demo data with physician recommendation copy.

### 2.5 Treatment Packs Progress

`treatmentPacks` state tracks `{total, left}` per service. This is component state initialised from static values — not from API.

> **⚠️ MOCK:** Treatment pack counts are static. No API endpoint tracks consumed sessions.

### 2.6 Care Team

Four hardcoded team members:
- Dr. A. Deshmukh (physician)
- Ritu S. (coach)
- Jyoti (nurse)
- Liv (AI)

Each taps to `newbook:{type}` or `sheet:liv`. Names are hardcoded.

### 2.7 Past Sessions

Appointments with `a.past = true` shown in "Past sessions" section. Taps to aftercare sheet.

---

## 3. Appointment Booking Screen

`currentView === "book"`.

### 3.1 Booking Form State

```typescript
bookingForm: {
  type: string | null,  // "pod" | "doc" | "coach" | "ther" | "thx" | "svc"
  day: number | null,   // index into next 7 days
  slot: string | null,  // "9:00 AM" etc.
  svc?: string,         // specific service ID
  pack?: number,        // number of sessions
  add?: string[],       // paired booking types
}
```

### 3.2 Visit Type Selection

Six visit types:
| Key | Name | Mode |
|---|---|---|
| `pod` | Pod re-measure | Centre |
| `doc` | Physician review | Either |
| `coach` | Coach session | Video |
| `thx` | Nutrition session | Either |
| `ther` | Therapy session | Centre |
| (svc) | Specific service | Centre |

### 3.3 Day + Slot Selection

Next 7 days shown as day chips. Each selected day shows morning/midday/evening slot groups. Slot availability is simulated: `slotFree(di, si) = (di*7 + si*3) % 5 !== 0`.

> **⚠️ MOCK:** Slot availability formula is a client-side simulation. Real availability must come from `GET /api/v2/appointment-slots`.

`getAppointmentSlots()` is imported and called in some paths (`awaitqc.invalidateQueries({ queryKey: ["appointment-slots"] })`), but the slot display logic in the booking UI uses the mock formula.

### 3.4 Booking Confirmation

On "Confirm booking":
1. `bookAppointment(payload)` → `POST /api/v2/appointments` (real API call)
2. On success: navigate to `"booked"`, invalidate `["appointments"]` and `["appointment-slots"]`
3. On error: toast with error message

### 3.5 Booked Screen

Shows confirmation with booking summary. "Done" navigates to `"main"`, `activeTab = "care"`.

---

## 4. Appointment Management

### 4.1 Appointment Detail Sheet (`sheet:appt:{id}`)

Shows appointment details. Actions:
- Reschedule → opens booking screen with `replace: id` in form
- Cancel → calls `cancelAppointment(appointment._id)` (real API call)

Cancellation invalidates `["appointments"]` and `["appointment-slots"]` queries.

### 4.2 Rescheduling

> **⚠️ INCOMPLETE:** Reschedule sets `bookingForm.replace = replaceId` but the `bookAppointment` function does not currently use `replace` to call an update endpoint. Rescheduling creates a new appointment; old appointment is not automatically cancelled.

---

## 5. Treatment Services

### 5.1 Service Sheet (`sheet:svc:{id}`)

Rendered for each `TreatmentService` from `TREATMENTS`. Shows:
- Name, description, doctor sign-off flag
- Pack size selector (number of sessions)
- Safety screening questions (`x.scr` array)
- "Pick a time" / "Send for sign-off" button

### 5.2 Safety Screening

If a treatment has `scr` questions, all must be answered before the booking CTA activates. A `yes` answer flags the booking for physician review.

### 5.3 Booking from Service

Sets `bookingForm.type = "svc"`, `svc = svcId`, `pack = selPack`, then navigates to booking screen.

---

## 6. After-Care Sheet

For past appointments, shows:
- Protocol, duration, observations, pack deduction
- Aftercare instructions (`x.care` from TreatmentService)
- "Book the next session" CTA

> **⚠️ MOCK:** After-care details (protocol "The Edit · step 2 strength", duration "42 min", observations) are hardcoded demo values.

---

## 7. Mock / Incomplete Items

| Item | Status |
|---|---|
| Slot availability | ❌ Client-side formula, not real API |
| Treatment pack tracking | ❌ Static state |
| Care team names (Ritu, Jyoti) | ❌ Hardcoded |
| Status pill "Dr. Deshmukh" | ❌ Hardcoded in status display |
| Rescheduling (cancel + rebook) | ❌ Incomplete — no update endpoint call |
| After-care session details | ❌ Hardcoded demo values |
| Package requests | ❌ Local state only |

---

*End of SOP-LIV-07.*

# SOP-LIV-05: 90-Day Health Plan

> **DRAFT – NOT APPROVED FOR CLINICAL USE**
> Document version: 1.0 | Audit date: 2025 | Status: Internal review only

---

## 1. Purpose

Document the Plan tab behaviour, care plan data model, and habit tracking as implemented. Source files: `src/routes/liv.tsx` (Plan tab, ~lines 5020–5260), `src/lib/aaha-api.ts` (`CarePlan` interface, `listCarePlans`, `updateCarePlan`).

---

## 2. Plan Tab — Entry

Rendered when `activeTab === "plan"`.

Three branches:

| Condition | Renders |
|---|---|
| `!hasReport` OR (session + no care plan + no assessment) | Empty state: "Your plan is built from your report" |
| `hasReport && journey === 3` | Journey 3 results-to-review |
| `hasReport && journey === 2` (default full plan) | Full care plan UI |

---

## 3. Journey 3 Plan (Upload Only)

### 3.1 Content

- Header: "Your next steps / From your uploaded report"
- **Results to review with your doctor**: list of `recordedPriorityMarkers` (real API data, `s === "p"` and `isRecorded`). Each row shows marker name, value, unit, and "outside Liv's optimal range".
- Fallback if none: "Nothing outside the optimal range in this report."
- Disclaimer: "These are prompts for a conversation, not a diagnosis."
- CTAs: Explore a Pod session → `sheet:pod` | Add another report → upload sheet

---

## 4. Journey 2 Plan (Full Care Plan)

### 4.1 Programme Header

```
Your [effectivePlanLen] days  |  Day [dayNumber] of [effectivePlanLen] · re-test in X days
```

`dayNumber` is computed from `Math.floor((now - programmeStartDate) / 86 400 000) + 1`, clamped to `[1, effectivePlanLen]`.

`effectivePlanLen` defaults to 90, can be changed to 160 or 180 via settings (doctor-set, stored in `activeCarePlan.follow_up.duration_days`).

> **⚠️ MOCK:** `programmeStartDate` is hardcoded as `new Date(2026, 8, 18)` (18 Sep 2026). In production this must come from `latestAssessment.created_at` or `activeCarePlan.createdAt`.

### 4.2 Care Plan Card

Renders when `activeCarePlan` from `GET /api/v2/care-plans/me` is present.

Displays:
- Level (derived from day number: 1 = "Begin", 2 = "Build", 3 = "Prove it")
- Points (`pts`) — ⚠️ hardcoded value `288`, not from API
- LivProgressRing with actual `dayNumber / effectivePlanLen`
- XP bar — ⚠️ mock, based on `pts % 100`
- 5-milestone path — ⚠️ hardcoded milestone labels

### 4.3 This Week

Weekly habit tracker grid. Four habits with dot-tap tracking:
- Strength sessions (target 3)
- Walk after dinner (target 7)
- Vitamin D and iron (target 7)
- Coherence breathing (target 5)

> **⚠️ MOCK:** `weeklyProgress` state is component-level only. It resets on page reload. No API persistence.

### 4.4 Three Priorities

Expandable cards from `PRIORITIES` in `src/lib/liv-data.ts`. These are static demo priority items (muscle/blood sugar/nutrients). They are not dynamically generated from the patient's real assessments.

> **⚠️ MOCK:** `PRIORITIES` is static demo data. The care plan priorities shown come from `src/lib/liv-data.ts`, not from `activeCarePlan` from the API.

### 4.5 Today Habits

Three habits rendered from `displayHabits`. When `session` and `activeCarePlan` are present, habits are loaded from `activeCarePlan.lifestyle_management`. Each habit toggle calls `PUT /api/v2/care-plans/:id` with the updated `lifestyle_management` array.

Habit persistence is real: the app writes to the backend and invalidates `["carePlans"]` on success, with rollback on error.

---

## 5. Care Plan API

### `GET /api/v2/care-plans/me`

Returns the active care plan for the signed-in patient. Query enabled when session is present.

### `PUT /api/v2/care-plans/:id`

Updates fields of an existing care plan. Called when:
- Patient ticks a habit
- Doctor (via settings demo) changes programme length

### `CarePlan` interface fields

| Field | Type | Used for |
|---|---|---|
| `lifestyle_management` | `CarePlanItem[]` | Daily habit list |
| `medication` | array | Not displayed in LIV (doctor dashboard feature) |
| `nutrition` | `CarePlanItem[]` | Not currently displayed |
| `physical_activity` | `CarePlanItem[]` | Not currently displayed |
| `follow_up.duration_days` | number | Programme length (90/160/180) |
| `status` | string | "draft" / "approved" / "completed" / "cancelled" |
| `approved_by` | string | Doctor name shown in plan header |

---

## 6. Journey Track Cards

Three journey track opt-rows rendered from `JOURNEY_TRACKS` in `src/lib/liv-data.ts`. Tapping navigates to the Journey Track detail screen. These are static templates; real step completion state is not stored.

---

## 7. Mock / Incomplete Items

| Item | Status |
|---|---|
| Programme start date | ❌ Hardcoded 18 Sep 2026 |
| XP points (`pts = 288`) | ❌ Hardcoded |
| Milestone labels | ❌ Static demo |
| Weekly progress dots | ❌ Component state only, resets on reload |
| `PRIORITIES` accordion | ❌ Static demo data, not from care plan |
| Nutrition / physical activity from care plan | ❌ Not displayed |
| Medication from care plan | ❌ Not displayed |

---

*End of SOP-LIV-05.*

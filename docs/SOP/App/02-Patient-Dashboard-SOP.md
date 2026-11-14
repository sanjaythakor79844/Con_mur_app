# SOP-LIV-02: Patient Dashboard

> **DRAFT – NOT APPROVED FOR CLINICAL USE**
> Document version: 1.0 | Audit date: 2025 | Status: Internal review only

---

## 1. Purpose

Describe the patient dashboard (Home tab) as implemented. The dashboard renders one of three experiences depending on the patient's `journey` value, which is computed from real API data.

Source files: `src/routes/liv.tsx` (lines ~3957–4530), `src/lib/liv-data.ts`.

---

## 2. Dashboard Entry Point

After successful sign-in, `currentView = "main"` and `activeTab = "home"`. The app resolves `journey` as follows:

```
API loading → journey 1 (safe default)
API done, 0 reports → journey 1
API done, kiosk assessment present → journey 2
API done, upload only, no kiosk → journey 3
No session (demo) → journey 2 (prototype preview)
```

---

## 3. Journey 1 Dashboard — No Report Yet

Rendered when `!hasReport`.

### 3.1 Header
Greeting ("Good morning/afternoon/evening, [first name]") + current date + profile icon button.

### 3.2 Kiosk Status Card
An animated card (`#kiosk`, `aria-live="polite"`) that shows:
- Spinner + "Checking the Living Lab kiosk" on initial render
- After 1 700 ms: transitions to "Longevity report ready · Kiosk screening from 18 Sep is waiting" with a "Get my longevity report" CTA

> **⚠️ MOCK:** The 1 700 ms transition and "18 Sep" date are hardcoded for prototype purposes. In production, kiosk detection must come from real `GET /api/v2/assessments/me` polling.

### 3.3 Other Ways to Start
- Upload a lab report (opens upload sheet)
- Book a kiosk screening (opens booking flow, type `"pod"`)

### 3.4 What Your Report Gives You
Static informational card listing AIWS score, biological age, and 90-day plan.

### 3.5 Learn the Basics (new — management addition)
Section header + three opt-rows:
- "What is your body's health age?" → `sheet:lt:age`
- "Health signals in your blood" → `sheet:lt:markers`
- "Your whole-body score" → `sheet:lt:aiws`

### 3.6 Your Next Steps
Numbered card: 1. Add a report or visit a Pod centre. 2. Read plain-language results. 3. Decide next step with doctor.

---

## 4. Journey 2 Dashboard — Kiosk Report Present

Rendered when `hasReport && journey === 2`.

### 4.1 Pod Session Completed Card
Shows "Pod session completed" header, "Report ready" pill, and date from `latestAssessment.created_at` (real API value).

### 4.2 Stat Cards (tappable)
Two side-by-side `stat` cards:
- **Health age estimate** — `verifiedBiologicalAge` from PhenoAge model. Taps to `sheet:age`.
- **AIWS score** — `Math.round(latestAssessment.score)`. Taps to `sheet:score`.

Both show `"—"` if the respective real value is null.

### 4.3 Learn Entry
Opt-row: "Learn · Plain-language guides and therapies" → `sheet:learn`.

### 4.4 Hero Inv Card
Full AIWS score ring (SVG, animated from 0 to real score) + biological age side-by-side.

Sub-items: Programme day counter, streak count (⚠️ streak is hardcoded `6`), XP bar (⚠️ mock).

### 4.5 Three Things Today
Habit checklist (up to 3 items). If `session` and `activeCarePlan` exist, habits are loaded from `activeCarePlan.lifestyle_management`. Habit toggles call `PUT /api/v2/care-plans/:id` to persist.

### 4.6 Up Next Card
Upcoming appointment (from `GET /api/v2/appointments/me`) + next journey step CTA.

### 4.7 Last Check-In Vitals Mini-Grid
4-cell grid: heart rate, blood pressure, posture, SpO₂ / cortisol. Values from `normalizedReadings` (derived from `latestAssessment.readings`). Falls back to demo values when session is absent.

### 4.8 Needs Attention
Priority markers horizontal scroll (`recordedPriorityMarkers`) from real data, or demo BIOMARKERS when no session.

---

## 5. Journey 3 Dashboard — Upload Only

Rendered when `hasReport && journey === 3`.

### 5.1 Lab Reports Card
File name from `uploadedReports[0].file_name` (real API value). Count of `displayBiomarkers` with `isRecorded = true`.

### 5.2 Health Age Card (tappable)
"Needs more results" — explains that lab upload alone may not hold all PhenoAge inputs. Taps to `sheet:lt:age`.

### 5.3 Results to Review
Horizontal scroll of up to 5 `recordedPriorityMarkers` (real data).

### 5.4 Go Beyond Your Lab Report
Inverted promo card: Explore Pod session, Find nearby centres, Book a Pod session.

### 5.5 Learn Entry
Same opt-row as Journey 2.

---

## 6. Bottom Navigation

Four tabs rendered at all times in `"main"` view:

| Tab | Icon | Key |
|---|---|---|
| Home | home | `home` |
| Markers | drop | `markers` |
| Plan | plan | `plan` |
| Care | cal | `care` |

---

## 7. Ask Liv FAB

Floating action button "Ask Liv" appears only when `hasReport = true`. Opens the AI chat sheet.

---

## 8. Mock / Incomplete Items

| Item | Status |
|---|---|
| Streak value (6) | ❌ Hardcoded |
| XP / points | ❌ Not from API |
| Kiosk 1 700 ms animation + "18 Sep" date | ❌ Hardcoded prototype |
| Last check-in date "6 Oct" | ⚠️ Falls back to this when API date absent |
| Trajectory chart coordinates | ❌ Hardcoded |

---

*End of SOP-LIV-02.*

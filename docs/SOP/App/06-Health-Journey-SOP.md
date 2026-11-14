# SOP-LIV-06: Health Journey

> **DRAFT – NOT APPROVED FOR CLINICAL USE**
> Document version: 1.0 | Audit date: 2025 | Status: Internal review only

---

## 1. Purpose

Document the Journey Track screen and the JOURNEY_TRACKS data model. Source files: `src/lib/liv-data.ts` (`JOURNEY_TRACKS`, `JourneyTrack`, `JourneyStep`), `src/routes/liv.tsx` (track screen ~lines 5660–5900).

---

## 2. Journey Tracks — Data Model

```typescript
interface JourneyTrack {
  id: "hm" | "inf" | "dh";
  n: string;          // Track name
  tag: string;        // Short tag
  steps: JourneyStep[];
}

interface JourneyStep {
  t: string;          // Step title
  d: string;          // Description
  when: string;       // Timing label
  tag: string;        // Status tag
  cta?: [string, string]; // [button label, action string]
}
```

Three tracks are defined in `JOURNEY_TRACKS`:

| ID | Name |
|---|---|
| `hm` | Hormonal and metabolic health |
| `inf` | Inflammation and recovery |
| `dh` | Digestive health |

These are static template tracks. No patient-specific step completion is persisted to the backend.

---

## 3. Journey Track Screen

Navigated via `track:{id}` action or from Plan tab track rows.

### 3.1 Header
Back button, track name, `k` label.

### 3.2 Step Timeline
Steps rendered as `trow` rows with connector lines. Each step shows title, description, timing, tag, and a CTA button (books appointment or opens service sheet).

### 3.3 Care Package CTA
"Request this care package" button → sets `requestedPackages[trackId] = true` in component state → calls `showToast("Requested. The centre will call you.")`.

> **⚠️ MOCK:** Package request is component state only. No API call is made when a care package is requested from the Journey screen.

---

## 4. Next Step Resolution

`getNextStep()` from `src/lib/liv-data.ts` finds the first step in the highest-priority track that has not been marked done. This is used in the Journey 2 home "Up next" card.

> **⚠️ MOCK:** Step completion is not tracked from real data. `getNextStep()` always returns the first step of the first track (no backend completion state).

---

## 5. Care Packages

`CARE_PACKAGES` in `src/lib/liv-data.ts` maps track IDs to package definitions:

| Field | Meaning |
|---|---|
| `n` | Package name |
| `f` | Focus description |
| `len` | Duration label |
| `inc` | Included items array |

Package detail is shown in the `pkg:{id}` sheet. "Request this package" sets `requestedPackages` state and shows a toast — no API call.

---

## 6. Mock / Incomplete Items

| Item | Status |
|---|---|
| Step completion state | ❌ Not persisted |
| Package requests | ❌ Local state only |
| Track assignment to patient | ❌ Static templates, not assigned from care plan |
| Dynamic step generation from biomarkers | ❌ Not implemented |

---

*End of SOP-LIV-06.*

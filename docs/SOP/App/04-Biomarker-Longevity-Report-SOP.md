# SOP-LIV-04: Biomarker and Longevity Report

> **DRAFT – NOT APPROVED FOR CLINICAL USE**
> Document version: 1.0 | Audit date: 2025 | Status: Internal review only

---

## 1. Purpose

Document how biomarker data is loaded, normalised, displayed, and interpreted in the LIV app. This SOP covers the Markers tab, individual marker detail screens, and the AIWS/biological age computations.

Source files: `src/routes/liv.tsx` (normalizeAssessmentReadings, displayBiomarkers, LAB_TEST_TO_BIOMARKER_MAP), `src/lib/liv-data.ts`, `src/lib/pdf-parser.ts`.

---

## 2. Biomarker Template Data

`BIOMARKERS` in `src/lib/liv-data.ts` contains 52 biomarker templates. Each has:

| Field | Meaning |
|---|---|
| `id` | Canonical identifier (e.g. `"hba1c"`) |
| `g` | Group (heart / met / body / inf / hor / sense / brain / mind) |
| `n` | Display name |
| `v` | Default display value (demo) |
| `x` | Default numeric value (demo) |
| `u` | Unit string |
| `s` | Status: `"o"` optimal \| `"b"` borderline \| `"p"` priority |
| `z` | Zone array for range bar rendering |
| `opt` | Longevity-optimal range text |
| `clin` | Clinical range text |
| `t` | Day-90 target text |
| `m` | Plain-language meaning |
| `a` | Actionable steps array |

These are the **demo defaults**. Real patient values overwrite them via `displayBiomarkers`.

---

## 3. Data Normalisation Pipeline

```
latestAssessment.readings  →  normalizeAssessmentReadings()  →  normalizedReadings
                                                                       ↓
uploadedReports[].extracted_values  ──────────────────────────→  displayBiomarkers
                                                                       ↑
extractedPdfData.measurements  ───────────────────────────────→  (merged)
```

### 3.1 `normalizeAssessmentReadings(current, previous)`

Reads the `readings` object from the Assessment API response. Handles multiple field-name variants (e.g. `hr`, `heart_rate`, `pulse` for heart rate). Outputs a typed `NormalizedReadings` object covering:
- Heart rate (with delta vs previous assessment)
- Blood pressure (systolic/diastolic parsed)
- ECG (rhythm label, intervals)
- SpO₂
- Body scan (BMI, body fat, waist, posture)
- Fitness (VO₂max, HRV, reaction time)
- `markersMap` — a flat record keyed by canonical biomarker ID

### 3.2 `LAB_TEST_TO_BIOMARKER_MAP`

A 100+ entry lookup table mapping raw lab report test name strings (from OCR/extraction) to canonical biomarker IDs. Normalisation handles:
- Case folding
- Removal of brackets, hyphens, underscores
- Common synonyms (e.g. "SGPT" → `"alt"`, "HbA1c (glycated hemoglobin)" → `"hba1c"`)

### 3.3 `displayBiomarkers` (useMemo)

Merges the BIOMARKERS template with real data in this priority order:
1. Kiosk assessment `markersMap` (source: `"kiosk"`)
2. Uploaded blood report extracted values
3. PDF-extracted longevity report measurements
4. BIOMARKERS demo defaults (fallback when no real data)

Each merged entry carries `isRecorded: true|false` to distinguish real from demo values.

---

## 4. Markers Tab

### 4.1 Header

| Journey | Header subtitle |
|---|---|
| Journey 2 | "Assessed [date] · [source label]" |
| Journey 3 | "From your uploaded report" |
| No session | "Assessed 18 Sep 2026" (demo) |

### 4.2 Filter Chips

| Filter | Shows |
|---|---|
| All | All displayBiomarkers |
| Recorded | Only `isRecorded = true` entries (real session only) |
| Priority | `s === "p"` and `isRecorded` (real) or `s === "p"` (demo) |
| Borderline | `s === "b"` ... |
| Optimal | `s === "o"` ... |

### 4.3 Kiosk Vitals Section

Shown only for Journey 2 (`journey !== 3`). Displays ECG strip + vitals grid with real `normalizedReadings` values.

### 4.4 Grouped Marker Rows

Rendered per `GROUPS` (8 body systems). Each `mrow` button shows: name, value, unit, range bar. Tapping navigates to marker detail.

### 4.5 Journey 3 Restriction

Kiosk vitals section is hidden (`journey !== 3` guard). Only blood-group markers are practically shown because only blood markers have `isRecorded = true` from an upload.

---

## 5. Range Bar

The range bar (`renderRangeBar`) is a proportional SVG-like HTML div. Each zone `[upperBound, status]` is rendered as a `<i>` element with flex proportions. The cursor `<b>` animates from 0 to the patient's `x` value position.

Zone colours:
- `zo` (optimal): solid text colour
- `zb` (borderline): hatched pattern
- `zp` (priority): dim line2 colour

Both longevity-optimal and clinical range labels are shown below each bar.

---

## 6. Marker Detail Screen

Navigated via `marker:{id}` action. Shows:
- Biomarker name, large numeric value, unit, status pill
- Range bar + legend
- Previous check-in delta (if `m.prev` present)
- Plain-language meaning paragraph
- Actionable steps with "Add to plan" toggles
- Journey track link
- Day-90 target + re-test date
- Book physician review CTA
- Ask Liv CTA
- **About this result** card (management addition): reassurance copy + link to `sheet:lt:markers`

---

## 7. AIWS Score

`latestAssessment.score` from the API. Rendered as:
- Ring animation (304.7 circumference SVG circle, offset computed from score/100)
- Raw integer displayed inside ring
- System breakdown bars (`SYSTEM_SCORES` from `src/lib/liv-data.ts` — ⚠️ these are static demo values, not from API)

> **⚠️ MOCK:** `SYSTEM_SCORES` (the 8 system percentage bars in the score sheet) are static demo values: `[["Liver and kidney",92],["Senses and skin",84], ...]`. They are not computed from the patient's real readings.

---

## 8. Biological Age (PhenoAge)

Computed from the kiosk PDF via `extractLongevityPdfData`:

```
verifiedBiologicalAge = extractedPdfData.biologicalAge
                        OR latestAssessment.report.bio_age
                        OR null
```

The PhenoAge model (Levine et al., 2018) uses 9 blood biomarkers. The PDF extraction finds these values by text pattern matching across all pages.

`verifiedBiologicalAgeDiff = verifiedBiologicalAge - verifiedChronologicalAge`

A positive diff means biological age older than calendar age; negative means younger.

> **⚠️ CLINICAL NOTE:** This is not a clinical diagnosis. It is an estimate with ±2 year margin. The app displays this disclaimer consistently. No treatment decisions should be made from this number alone.

---

## 9. Biomarker Groups

| Group ID | Display name | Contains |
|---|---|---|
| `heart` | Heart and arteries | ECG, SpO₂, BP, HR |
| `met` | Metabolic health | HbA1c, glucose, insulin, triglycerides |
| `body` | Strength, body and bone | SMM, grip, VO₂max, VF, waist, BMI, BF, bone |
| `inf` | Inflammation, liver and kidney | hs-CRP, ALT, AST, ALP, creatinine, eGFR, albumin |
| `hor` | Hormones and nutrients | TSH, cortisol, Vit D, B12, ferritin |
| `sense` | Senses and breath | (kiosk-specific) |
| `brain` | Brain and nervous system | (kiosk-specific) |
| `mind` | Mind, sleep and recovery | HRV, reaction time |

---

## 10. Mock / Incomplete Items

| Item | Status |
|---|---|
| `SYSTEM_SCORES` in AIWS sheet | ❌ Static demo values |
| `YEARS_CONTRIBUTORS` bars in age sheet | ❌ Static demo values |
| Previous check-in delta for most markers | ⚠️ Only present when `m.prev` populated from API or PDF |
| Organ age | ❌ Not implemented |
| EEG brainwave display | ⚠️ Renders when `m.eeg` present, but no kiosk currently sends EEG data |
| Posture SVG figure | ⚠️ Renders when `m.find` present from API |

---

*End of SOP-LIV-04.*

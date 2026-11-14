# SOP-LIV-14: Kiosk-to-LIV App Integration

> **DRAFT – NOT APPROVED FOR CLINICAL USE**
> Document version: 1.0 | Audit date: 2025 | Status: Internal review only

---

## 1. Purpose

Document how kiosk screening data flows from the Living Lab kiosk to the LIV Patient Application. Source files: `src/lib/aaha-api.ts` (`listAssessments`, `normalizeAssessmentReadings`), `src/routes/liv.tsx` (`normalizeAssessmentReadings`, `extractLongevityPdfData`), `src/lib/pdf-parser.ts`.

---

## 2. Integration Overview

```
Patient at kiosk
      ↓
Kiosk performs screening:
  • Blood draw → lab analysis → biomarker values
  • ECG, SpO₂, blood pressure, heart rate
  • Body scan: BMI, body fat, waist, posture
  • Fitness: VO₂max, HRV, reaction time
      ↓
Kiosk backend uploads Assessment record to common API
  POST /api/v2/assessments  (backend → backend)
  Assessment.source = "kiosk"
  Assessment.readings = { ... all measured values ... }
  Assessment.report_pdf_url = signed URL to PDF
  Assessment.kiosk_id = kiosk identifier
      ↓
LIV app patient signs in → GET /api/v2/assessments/me
  → Assessment record appears
  → hasReport = true → journey = 2
      ↓
LIV app fetches PDF → extractLongevityPdfData()
  → biologicalAge, chronologicalAge, PhenoAge markers, doctor sign-off
```

---

## 3. Assessment Source Values

| `source` value | Meaning |
|---|---|
| `"kiosk"` | Physical kiosk screening — full biomarker panel |
| `"consumer_app"` | In-app guided assessment (5-minute form) |
| `"health_record"` | Uploaded lab report / health record |

---

## 4. Readings Object Structure

The kiosk populates `Assessment.readings` with any combination of these fields (field names from `normalizeAssessmentReadings`):

| Reading | Field names tried |
|---|---|
| Heart rate | `hr`, `heart_rate`, `pulse`, `bp.pulse`, `spo2.pulse`, `ecg._ecg_values.hr` |
| Blood pressure | `bp`, `blood_pressure` → `{ systolic, diastolic, unit, flag }` |
| ECG | `ecg` → `{ value, label, flag, _ecg_values, intervals }` |
| SpO₂ | `spo2` → `{ value, unit, flag }` |
| Body scan | `body_scan` → `{ bmi, body_fat, waist, weight_kg, height_cm, posture }` |
| VO₂max | `fitness.vo2`, `vo2_max` |
| HRV | `fitness.hrv`, `hrv` |
| Reaction time | `fitness.reaction_time` |
| Biomarkers | keyed by canonical ID or by raw lab test name via `LAB_TEST_TO_BIOMARKER_MAP` |

The `normalizeAssessmentReadings` function tries multiple field name variants because kiosk firmware versions may use different key names.

---

## 5. Biomarker Mapping from Kiosk

If the kiosk sends biomarkers under their canonical IDs (e.g. `readings.hba1c = 5.9`), they are used directly.

If the kiosk sends biomarkers under raw lab test names (e.g. `readings["glycated hemoglobin"] = 5.9`), `LAB_TEST_TO_BIOMARKER_MAP` translates them. This map has 100+ entries covering common name variants.

---

## 6. PDF Extraction

The kiosk generates a Longevity Report PDF (`report_pdf_url`). The LIV app fetches and parses it using `pdfjs-dist` to extract:

| Data | Extraction method |
|---|---|
| Patient name | Text search patterns |
| Chronological age | Regex: age patterns on first pages |
| Biological age | Regex: "biological age", "phenotypic age" patterns |
| Assessment date | Date patterns near "assessment" text |
| Doctor name | Patterns near "Dr.", "physician", "signed by" |
| PhenoAge markers | Table parsing across all pages for 9 biomarker names |
| Measurements | All text parsed for known biomarker names and value patterns |

Extracted values are merged with `markersMap` from `readings`, with PDF values used as fallback when readings are absent.

---

## 7. Workflow States

The backend workflow object (`WorkflowStatus`) communicates to the app what actions are available:

| `workflow.status` | `workflow.can_upload` | Patient sees |
|---|---|---|
| `released` | varies | Full report available, PDF viewable |
| `pending` | `true` | "Checking the Living Lab kiosk" / upload enabled |
| `uploaded` | `false` | Upload button disabled |
| `rejected` | `true` | Rejection reason shown, upload re-enabled |
| `declined` | `false` | Upload disabled |

The `workflow.message` text is displayed verbatim to the patient when upload is blocked.

---

## 8. Manual Kiosk Fetch

The patient can trigger a manual check via:
- "Get my longevity report" button (Journey 1)
- "Check for updates" (Markers empty state when no assessments)
- Refresh button in Report History sheet

Each calls `listAssessments()` which hits `GET /api/v2/assessments/me`. If a new assessment has arrived, it appears in the list and `journey` updates accordingly.

---

## 9. Patient Identification at Kiosk

The kiosk links an assessment to a patient by mobile phone number. The LIV app patient must have the same phone number registered in both Firebase Auth and the backend patient record.

If the patient is registered in the kiosk system but not yet linked to a Firebase UID, `GET /patients/me` returns 404 and the app shows "Kiosk Link Pending". The link is established either:
- By a nurse/admin in the backend admin panel
- Via `POST /patients/link-by-phone` (currently disabled in client, pending backend confirmation)

---

## 10. Kiosk Integration Gaps

| Gap | Impact |
|---|---|
| `POST /patients/link-by-phone` disabled | New patients who have visited the kiosk before signing up in the app cannot auto-link |
| No real-time push when kiosk report arrives | Patient must manually refresh or wait for `GET /assessments/me` poll |
| PDF proxy can fail silently | If PDF URL is inaccessible, biological age and doctor name fields remain empty |
| Kiosk firmware field names | Multiple field-name variants are handled but undocumented firmware changes could break mapping |

---

*End of SOP-LIV-14.*

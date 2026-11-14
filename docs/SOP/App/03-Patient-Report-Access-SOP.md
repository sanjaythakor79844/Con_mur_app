# SOP-LIV-03: Patient Report Access

> **DRAFT – NOT APPROVED FOR CLINICAL USE**
> Document version: 1.0 | Audit date: 2025 | Status: Internal review only

---

## 1. Purpose

Document how patients access their longevity reports and uploaded lab reports. Source files: `src/lib/aaha-api.ts`, `src/routes/liv.tsx`, `src/components/ReportHistory.tsx`, `src/lib/pdf-parser.ts`.

---

## 2. Report Types

| Type | Source | API endpoint |
|---|---|---|
| Kiosk Longevity Report | Physical kiosk screening | `GET /api/v2/assessments/me` |
| Uploaded Blood Report | Patient-uploaded PDF/image | `GET /api/v2/blood-reports/me` |
| Guided Check-up | In-app assessment form | `GET /api/v2/assessments/me` (source = `consumer_app`) |

---

## 3. Fetching Kiosk Reports

### 3.1 Automatic Fetch on Login

`listAssessments()` is called on every session via TanStack Query (`queryKey: ["assessments", session.uid]`). Reports arrive automatically when the kiosk has uploaded to the backend.

### 3.2 Manual Fetch

Patients can tap:
- "Get my longevity report" (Journey 1 kiosk card) → triggers `analyzing` screen → calls `listAssessments()` after animation
- "Check for updates" (Markers empty state)
- Refresh button in Report History sheet

### 3.3 Analyzing Screen

Displays 4 animated steps:
- Connecting to the Living Lab kiosk
- Finding your screening
- Fetching your longevity report
- Building your score and plan

Each step takes ~850 ms. After step 4: `hasReport = true`, navigate to main home, show toast.

> **Note:** The analyzing animation is cosmetic. The actual API call (`listAssessments`) runs before the animation completes. The animation delays are not tied to real network response time.

---

## 4. Uploading Blood Reports

### 4.1 Entry Points

- Upload sheet → "Upload blood report" button
- File is selected via hidden `<input type="file">` (PDF, JPG, JPEG, PNG, max 10 MB)

### 4.2 Upload Eligibility Check

Before upload is permitted, the app calls `GET /api/v2/assessments/me` and checks `latestAssessment.workflow.can_upload`:
- `can_upload = false` → upload button disabled + tooltip shows `workflow.message`
- `can_upload = true` → proceed

### 4.3 Upload Process

1. `uploadBloodReport(file)` → `POST /api/v2/blood-reports/me` (multipart form, `blood_report` backend)
2. Response contains `blood_report_id`, `status`, `parameters_read`, `validation_note`
3. Analyzing screen shown while processing
4. On complete: query cache invalidated (`["my-uploads"]`, `["assessments"]`), navigate to home, toast shown

### 4.4 Validation Note Display

If `validation_note` is present in the response, its **exact text** is displayed to the patient in the toast. It is never replaced with a generic message (enforced by comment in code).

### 4.5 Report Status Labels

| API status | Displayed label |
|---|---|
| `valid` | Verified |
| `review` | Review Required |
| `invalid` | Invalid |
| `pending` | Pending |

---

## 5. Report History Sheet

Accessible via the report details button. Renders `<ReportHistory>` component (`src/components/ReportHistory.tsx`).

Displays:
- Assessment list (kiosk + app assessments from `GET /api/v2/assessments/me`)
- Uploaded reports list (from `GET /api/v2/blood-reports/me`)
- Programme start/end dates
- Current day number
- Doctor name (from `prescriberDoctor`, resolved from PDF extraction or hardcoded fallback)

Actions per report:
- View report → `setCurrentView("report")`
- Download report → `handlePdfAction(assessment, "download")`
- View uploaded file → opens file blob in browser tab or native file opener (Capacitor)

---

## 6. Viewing the Longevity Report PDF

### 6.1 Browser

`GET /api/v2/assessments/:id/report-pdf` → proxy endpoint (`/api/proxy-pdf`) → fetch PDF → open in new tab via `URL.createObjectURL`.

### 6.2 Native Android (Capacitor)

1. Fetch PDF blob
2. Convert to base64 via `FileReader`
3. Write to `Filesystem.cache` as `Aaha_Kiosk_Report_*.pdf`
4. Open via `FileOpener.openFile`

---

## 7. PDF Data Extraction

`extractLongevityPdfData(report_pdf_url)` in `src/lib/pdf-parser.ts` parses the kiosk PDF across all pages using `pdfjs-dist`.

Extracts:
- Patient name, ID, chronological age, gender
- Biological age and diff
- Assessment date, report date, centre name
- Doctor sign-off (name + date)
- PhenoAge panel markers (9 biomarkers with values, units, ranges)
- All measurement values by canonical name matching

Results stored in `extractedPdfData` state, used to override demo biomarker values with real patient-specific ones.

---

## 8. Workflow States

The backend workflow object (`WorkflowStatus`) gates what actions are available:

| `workflow.status` | Patient sees |
|---|---|
| `pending` | Upload button enabled with standard message |
| `uploaded` | Upload disabled, previous report processing |
| `rejected` | Upload enabled, rejection reason shown |
| `released` | Full report available |
| `declined` | Upload disabled |

---

## 9. Mock / Incomplete Items

| Item | Status |
|---|---|
| Programme start date "18 Sep 2026" | ❌ Hardcoded in ReportHistory props |
| Re-test date "19 Dec 2026" | ❌ Hardcoded in ReportHistory props |
| Upload history display (hidden per requirement) | ⚠️ Commented out: "Report uploaded history nahi dikhani hai" |
| `GET /api/v2/blood-reports/me` parameter detail fetch | ✅ Real — fetches individual report detail if parameters missing from list |

---

*End of SOP-LIV-03.*

# AAHA Liv App – Phase 1 Workflow Integration Audit

**Date:** September 14, 2026  
**Phase:** AUDIT ONLY (No code changes)  
**Objective:** Document existing dual backend architecture and identify missing workflow features

---

## Executive Summary

✅ **Dual Backend Architecture:** Properly configured and separated  
✅ **Firebase Authentication:** Unified and working correctly  
✅ **Blood Report Upload (Backend 1):** Fully implemented  
✅ **Kiosk Reports (Backend 2):** Fully implemented  
❌ **Workflow APIs (Backend 2):** **NOT IMPLEMENTED**  
⚠️ **Workflow Status Parsing:** **MISSING from Assessment interface**

**Overall Status:** Infrastructure complete. Workflow feature integration required.

---

## 1. Environment & API Configuration Audit

### A. Backend URLs - VERIFIED ✅

**File:** `.env`

```env
# Backend 2 – Main AAHA Backend (Clinical & Reports)
VITE_API_BASE_URL=https://aaha-api-405281288207.asia-south1.run.app/api/v2

# Backend 1 – Blood Report Upload Backend
VITE_BLOOD_REPORT_API_BASE_URL=https://aaha-api-sdrsnwzwka-el.a.run.app/api/v2

# Backend 3 – Feature API (Node.js - Appointments, Preferences)
VITE_FEATURE_API_BASE_URL=https://aaha-feature-backend.onrender.com/api/v2
```

**Status:** ✅ Correct - Two backends properly separated as instructed

### B. API Client Configuration - VERIFIED ✅

**File:** `src/lib/aaha-api.ts` (Lines 8-16)

```typescript
export const API_BASE = 
  import.meta.env?.VITE_API_BASE_URL ||
  "https://aaha-api-405281288207.asia-south1.run.app/api/v2";  // Backend 2

export const BLOOD_REPORT_API_BASE =
  import.meta.env?.VITE_BLOOD_REPORT_API_BASE_URL ||
  "https://aaha-api-sdrsnwzwka-el.a.run.app/api/v2";  // Backend 1

const FEATURE_API_BASE =
  import.meta.env.VITE_FEATURE_API_BASE_URL || 
  "https://aaha-feature-backend.onrender.com/api/v2";  // Backend 3
```

**Status:** ✅ Properly configured with environment variable support

### C. Backend Routing Function - VERIFIED ✅

**File:** `src/lib/aaha-api.ts` (Lines 133-150)

```typescript
async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  backend: "common" | "feature" | "blood_report" | boolean = "common"
): Promise<T> {
  let baseUrl = API_BASE;  // Default = Backend 2
  
  if (backend === "feature" || backend === true) {
    baseUrl = FEATURE_API_BASE;  // Backend 3
  } else if (backend === "blood_report") {
    baseUrl = BLOOD_REPORT_API_BASE;  // Backend 1
  }
  
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, init);
  // ... error handling
}
```

**Status:** ✅ Explicit backend routing works correctly

**Routing Logic:**
- `apiFetch(path, init)` → Backend 2 (default - "common")
- `apiFetch(path, init, "blood_report")` → Backend 1
- `apiFetch(path, init, "feature")` → Backend 3

---

## 2. Firebase Authentication Audit

### A. Token Management - VERIFIED ✅

**File:** `src/lib/aaha-api.ts` (Lines 127-138)

```typescript
async function getToken(): Promise<string | null> {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (user) {
    return user.getIdToken();  // Firebase ID token
  }
  return null;
}

async function apiHeaders(isMultipart = false): Promise<HeadersInit> {
  const token = await getToken();
  const headers: HeadersInit = {};
  if (!isMultipart) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}
```

**Status:** ✅ Unified authentication for all backends

**Key Points:**
- Single Firebase app instance (`auth` from `@/lib/firebase`)
- Token automatically refreshed by Firebase SDK
- Same Bearer token used for Backend 1, 2, and 3
- No duplicate authentication system

---

## 3. Complete Backend-Endpoint Mapping

### Backend 2 (Main AAHA Backend) - Current Usage

| Functionality | Endpoint | Method | Function | File | Status |
|---------------|----------|--------|----------|------|--------|
| **Patient Profile** |
| Get profile | `/patients/me` | GET | `getProfile()` | aaha-api.ts:618 | ✅ Exists |
| Update profile | `/patients/me` | PUT | `updateProfile()` | aaha-api.ts:627 | ✅ Exists |
| **Kiosk Reports** |
| List all reports | `/reports/me` | GET | `listAssessments()` | aaha-api.ts:1060 | ✅ Exists |
| Save assessment | `/reports` | POST | `saveAssessment()` | aaha-api.ts:1180 | ✅ Exists |
| **Workflow APIs** |
| List nurses | `/workflow/nurses` | GET | - | - | ❌ **MISSING** |
| Assign nurse | `/workflow/my-nurse` | POST | - | - | ❌ **MISSING** |
| Get my nurse | `/workflow/my-nurse` | GET | - | - | ❌ **MISSING** |
| Workflow status | `/workflow/status` | GET | - | - | ❌ **MISSING** |

**Backend 2 Functions Use:** `apiFetch(path, init)` (defaults to "common")

### Backend 1 (Blood Report Backend) - Current Usage

| Functionality | Endpoint | Method | Function | File | Status |
|---------------|----------|--------|----------|------|--------|
| Upload blood report | `/blood-reports` | POST | `uploadBloodReport()` | aaha-api.ts:421 | ✅ Exists |
| List my blood reports | `/blood-reports/me` | GET | `listReports()` | aaha-api.ts:231 | ✅ Exists |
| Get single report | `/blood-reports/:id` | GET | `getBloodReport()` | aaha-api.ts:221 | ✅ Exists |
| Download report file | `/blood-reports/:id/file` | GET | `getBloodReportFileBlob()` | aaha-api.ts:587 | ✅ Exists |
| Delete blood report | `/blood-reports/:id` | DELETE | `deleteBloodReport()` | aaha-api.ts:559 | ✅ Exists |
| Retry processing | `/blood-reports/:id/retry` | POST | `retryBloodReport()` | aaha-api.ts:573 | ✅ Exists |
| Get upload info | `/blood-reports/info` | GET | `getBloodReportsInfo()` | aaha-api.ts:600 | ✅ Exists |

**Backend 1 Functions Use:** `apiFetch(path, init, "blood_report")`

### Backend 3 (Feature API) - Current Usage

| Functionality | Endpoint | Method | Function | File | Status |
|---------------|----------|--------|----------|------|--------|
| Book appointment | `/appointments` | POST | `bookAppointment()` | aaha-api.ts:715 | ✅ Exists |
| List appointments | `/appointments/me` | GET | `listAppointments()` | aaha-api.ts:670 | ✅ Exists |
| Get appointment slots | `/appointments/slots` | GET | `getAppointmentSlots()` | aaha-api.ts:703 | ✅ Exists |
| Update preferences | `/preferences/me` | PATCH | `updatePreferences()` | aaha-api.ts:840 | ✅ Exists |
| List notifications | `/notifications/me` | GET | `listNotifications()` | aaha-api.ts:889 | ✅ Exists |
| List care plans | `/care-plan` | GET | `listCarePlans()` | aaha-api.ts:919 | ✅ Exists |

**Backend 3 Functions Use:** `apiFetch(path, init, "feature")` or `apiFetch(path, init, true)`

---

## 4. Signup & Nurse Selection Audit

### A. Current Signup Flow - VERIFIED

**File:** `src/routes/liv.tsx` (Lines 2601-2625)

**Current Steps:**
1. User enters phone number
2. Firebase OTP sent
3. User verifies OTP
4. User enters: name, email, age, gender
5. Form submitted

**Profile Creation Location:** Lines 2905-2914

```typescript
// Currently calls api-service.ts createPatient
await apiService.createPatient({
  full_name: trimmedName,
  mobile_number: phoneToUse,
  age: parsedAge,
  gender: editGender.toLowerCase(),
});
```

**Nurse Selection:** ❌ **NOT IMPLEMENTED**

**Evidence:**
- Searched entire codebase for: "workflow", "nurse", "/nurses", "my-nurse"
- Found only prescription-related `WorkflowContext` (unrelated to patient workflow)
- No UI components for nurse selection
- No API calls to `/workflow/nurses`
- No nurse assignment logic

**Status:** Nurse selection must be added to signup flow

### B. api-service.ts vs aaha-api.ts - DUPLICATE CLIENT FOUND ⚠️

**Primary Client:** `src/lib/aaha-api.ts` (1073+ lines)
- Comprehensive API functions
- Proper backend routing
- Most features use this

**Secondary Client:** `src/lib/api-service.ts` (784 lines)
- Duplicate implementation
- Used in some places
- Should be consolidated (not in this task)

**Current Signup Uses:** `api-service.ts` (Line 2906)

**Recommendation:** Keep using existing client for signup. Add nurse functions to `aaha-api.ts` and call from signup handler.

---

## 5. Reports & Workflow Status Audit

### A. GET /reports/me Implementation - VERIFIED ✅

**File:** `src/lib/aaha-api.ts` (Lines 1060-1178)

**Current Implementation:**

```typescript
export async function listAssessments(): Promise<Assessment[]> {
  const headers = await apiHeaders();
  const data = await apiFetch<{ reports: any[] }>(
    "/reports/me",
    { headers, cache: "no-store" }
    // No backend parameter = "common" = Backend 2 ✅
  );
  
  const reports = data?.reports || [];
  return reports.map((r: any) => {
    // ... extensive mapping
    return {
      id: String(r.report_id || r.id),
      patient_id: String(r.patient_id || ""),
      // ... 20+ fields
      _raw: r,  // ✅ Raw response preserved
    };
  });
}
```

**Backend Used:** ✅ Backend 2 (correct)

**Key Finding:** `_raw: r` preserves complete backend response, so if backend adds `workflow` field, it will be accessible

### B. Assessment Interface - WORKFLOW FIELD MISSING ❌

**File:** `src/lib/aaha-api.ts` (Lines 100-121)

**Current Interface:**

```typescript
export interface Assessment {
  id: string;
  patient_id: string;
  complaint: string;
  score: number;
  band: string;
  summary: string;
  suspected_conditions: string[];
  answers: Record<string, unknown>;
  readings: Record<string, unknown>;
  baseline_readings?: Record<string, unknown>;
  condition_readings?: Record<string, unknown>;
  report: unknown;
  source: "consumer_app" | "kiosk" | "health_record";
  created_at: string;
  report_pdf_url?: string;
  kiosk_id?: string;
  has_storage_path?: boolean;
  nutrition_plans?: Array<{ title?: string; points?: string[] }>;
  therapy_plan?: string[];
  _raw?: any;
  // ❌ NO workflow field
}
```

**Missing:**
```typescript
workflow?: {
  state: string;        // Internal logging
  status: string;       // UI display (pending|uploaded|rejected|declined|released)
  message: string;      // Show to user
  can_upload: boolean;  // Upload guard
  rejection_reason?: string | null;  // Show if rejected
  released: boolean;    // PDF visibility guard
};
```

**Status:** Must add workflow field to Assessment interface

### C. Workflow Status Display - NOT IMPLEMENTED ❌

**Current Report Display:** `src/routes/liv.tsx` (Lines 5000-6500)

**What Shows Now:**
- AWIS score ✅
- Risk band ✅
- Summary ✅
- Suspected conditions ✅
- Recommendations ✅

**What's Missing:**
- ❌ Workflow status badge
- ❌ Workflow message
- ❌ Rejection reason display
- ❌ Upload availability based on `can_upload`
- ❌ PDF visibility based on `workflow.released`

**Evidence:** Searched entire `liv.tsx` for "workflow" - no status display logic found

---

## 6. Blood Report Upload Audit

### A. Upload Implementation - VERIFIED ✅

**File:** `src/lib/aaha-api.ts` (Lines 421-521)

**Current Implementation:**

```typescript
export async function uploadBloodReport(file: File): Promise<BloodReportUploadResponse> {
  // Authentication ✅
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) {
    const err = new Error("Authentication required...");
    (err as any).status = 401;
    throw err;
  }
  const token = await user.getIdToken(true);  // Force refresh ✅
  
  // File validation ✅
  const fileName = file.name.toLowerCase();
  let mimeType = file.type;
  if (!mimeType) {
    if (fileName.endsWith(".pdf")) mimeType = "application/pdf";
    else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) mimeType = "image/jpeg";
    else if (fileName.endsWith(".png")) mimeType = "image/png";
  }
  
  const allowedMimes = ["image/jpeg", "image/png", "application/pdf"];
  if (!allowedMimes.includes(mimeType)) {
    throw new Error("Unsupported file format. Please upload JPG, JPEG, PNG, or PDF.");
  }
  
  // Size limit ✅
  const MAX_BYTES = 10 * 1024 * 1024;  // 10 MB
  if (file.size > MAX_BYTES) {
    throw new Error("File exceeds 10 MB limit.");
  }
  
  // Multipart form data ✅
  const form = new FormData();
  form.append("file", normalizedBlob, file.name);  // Field name: "file" ✅
  
  // Timeout ✅
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 105000);  // 105 seconds ✅
  
  try {
    const res = await fetch(`${BLOOD_REPORT_API_BASE}/blood-reports`, {  // Backend 1 ✅
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // Content-Type NOT set - browser sets with boundary ✅
      },
      body: form,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const data = await res.json();
    
    if (res.status === 200 || res.status === 201) {
      return data as BloodReportUploadResponse;
    }
    
    // Comprehensive error handling ✅
    const errorMsg = data.error || data.message;
    const error = new Error(
      res.status === 400 ? "Invalid blood report..."
      : res.status === 401 ? "Session expired..."
      : res.status === 404 ? "Patient profile not found..."
      : res.status === 429 ? "Upload limit reached..."
      : res.status === 500 || res.status === 503 ? "Server temporarily unavailable..."
      : errorMsg || `Upload failed: ${res.status}`
    );
    (error as any).status = res.status;
    throw error;
  }
}
```

**Status:** ✅ Complete implementation meeting all requirements

**Checklist:**
- ✅ Backend 1 (`BLOOD_REPORT_API_BASE`)
- ✅ Firebase Bearer token
- ✅ Multipart form-data
- ✅ Field name: "file"
- ✅ JPG, PNG, PDF support
- ✅ 10 MB limit
- ✅ 105-second timeout (≥100s requirement)
- ✅ Comprehensive error handling

### B. Upload Handler - WORKFLOW GUARD MISSING ❌

**File:** `src/routes/liv.tsx` (Line ~2421)

**Current Upload Handler:**

```typescript
const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  // ❌ NO workflow.can_upload check
  
  setUploading(true);
  try {
    const res = await uploadBloodReport(file);  // Backend 1
    
    // Success handling
    const bloodReport = res.blood_report;
    const status = bloodReport?.status;
    const validationNote = bloodReport?.validation_note;
    const paramsRead = bloodReport?.parameters_read ?? bloodReport?.parameters?.length ?? 0;
    
    // ... show success message
    
    // ❌ Does not refresh Backend 2 /reports/me for workflow status
    
  } catch (err: any) {
    // Error handling
  } finally {
    setUploading(false);
  }
};
```

**Missing:**
1. ❌ Pre-upload check: `workflow.can_upload`
2. ❌ Post-upload refresh: Backend 2 `/reports/me`

**Required Addition:**

```typescript
// BEFORE upload:
const reports = await listAssessments();  // Backend 2
const latestReport = reports[0];
if (latestReport?.workflow && !latestReport.workflow.can_upload) {
  showToast(latestReport.workflow.message || "Upload not available");
  return;  // Block upload
}

// AFTER successful upload:
await assessmentsQuery.refetch();  // Refresh Backend 2 reports
```

---

## 7. PDF Visibility Audit

### A. Current PDF Handling - PARTIAL ⚠️

**File:** `src/routes/liv.tsx` (Line ~1575)

**Current Implementation:**

```typescript
const handlePdfAction = async (
  targetAssessment: Assessment | null,
  action: "view" | "download" = "view",
) => {
  const pdfUrl = targetAssessment?.report_pdf_url;
  
  if (!pdfUrl) {
    showToast("PDF not available for this report.");
    return;
  }
  
  // ❌ NO workflow.released check
  
  // Opens PDF...
};
```

**Missing Guards:**

```typescript
// MUST ADD:
const workflow = targetAssessment?.workflow;

// Guard 1: Check if released
if (workflow && !workflow.released) {
  showToast("Report not yet released by doctor");
  return;
}

// Guard 2: Security - never expose internal paths
if (pdfUrl.includes("_pdf_path") || pdfUrl.startsWith("gs://")) {
  console.error("Security: Internal path exposed");
  return;
}

// Guard 3: Validate signed URL format
if (!pdfUrl.startsWith("http")) {
  console.error("Invalid PDF URL");
  return;
}
```

### B. Kiosk PDF Preservation - CONCERN ⚠️

**Current PDF URL Extraction:** Lines 1091-1102

```typescript
const rawPdfUrl =
  r.report_pdf_url ||
  r.report_data?.report_pdf_url ||
  r.pdf_url ||
  // ... multiple fallbacks
  r.file_url;

const hasHttpPdf =
  typeof rawPdfUrl === "string" &&
  (rawPdfUrl.startsWith("http://") || rawPdfUrl.startsWith("https://"));

const finalPdfUrl = hasHttpPdf ? rawPdfUrl : undefined;
```

**Question:** Are existing kiosk reports already marked as `workflow.released: true`?

**Action Required:** Verify with backend developer before adding workflow checks

**Risk:** If old kiosk reports don't have `workflow` field, adding strict `workflow.released` check might hide their valid PDFs

**Mitigation:**

```typescript
// Graceful handling:
const workflow = assessment.workflow;

// If no workflow object (old kiosk reports), allow PDF access
if (!workflow) {
  // Old report - no workflow restrictions
  if (pdfUrl) {
    openPdf(pdfUrl);
  }
  return;
}

// If workflow exists, check released flag
if (!workflow.released) {
  showToast("Report not yet released");
  return;
}
```

---

## 8. Missing Workflow Functionality Summary

### Priority 0 (Critical - Blocking)

| # | Feature | Location | Complexity | Lines |
|---|---------|----------|------------|-------|
| 1 | Add WorkflowStatus interface | aaha-api.ts | Low | ~15 |
| 2 | Add workflow field to Assessment | aaha-api.ts | Low | 1 |
| 3 | Parse workflow in listAssessments | aaha-api.ts | Low | 1 |
| 4 | Workflow status display (5 statuses) | liv.tsx | Medium | ~150 |
| 5 | Upload guard (can_upload check) | liv.tsx | Low | ~20 |
| 6 | PDF visibility guard (released check) | liv.tsx | Low | ~30 |

### Priority 1 (Important - Nurse Selection)

| # | Feature | Location | Complexity | Lines |
|---|---------|----------|------------|-------|
| 7 | Add Nurse interface | aaha-api.ts | Low | ~8 |
| 8 | listNurses() function | aaha-api.ts | Low | ~10 |
| 9 | assignMyNurse() function | aaha-api.ts | Low | ~15 |
| 10 | getMyNurse() function | aaha-api.ts | Low | ~12 |
| 11 | Nurse selection UI in signup | liv.tsx | Medium | ~80 |

### Priority 2 (Enhancement)

| # | Feature | Location | Complexity | Lines |
|---|---------|----------|------------|-------|
| 12 | Post-upload refresh /reports/me | liv.tsx | Low | ~5 |
| 13 | Pull-to-refresh reports | liv.tsx | Low | ~15 |
| 14 | Show assigned nurse in profile | liv.tsx | Low | ~20 |

**Total Estimated:** ~377 lines across 2 files

---

## 9. Files Requiring Modification

### File 1: src/lib/aaha-api.ts

**Changes Required:**

**A. Add Interfaces (After line 93)**

```typescript
// Workflow Status Interface
export interface WorkflowStatus {
  state: string;          // Internal logging only
  status: "pending" | "uploaded" | "rejected" | "declined" | "released";
  message: string;        // Backend message - show to user
  can_upload: boolean;    // Upload availability guard
  rejection_reason?: string | null;  // Show if status is rejected
  released: boolean;      // PDF visibility guard
}

// Nurse Interface
export interface Nurse {
  nurse_id: number;
  full_name: string;
  centre_id?: number;
  centre_name?: string;
  ready?: boolean;
}
```

**B. Update Assessment Interface (Line 100)**

```typescript
export interface Assessment {
  // ... existing 20+ fields
  workflow?: WorkflowStatus | null;  // ADD THIS LINE
  _raw?: any;
}
```

**C. Update listAssessments Mapping (Line ~1120)**

```typescript
return {
  // ... existing fields
  workflow: r.workflow || null,  // ADD THIS LINE
  _raw: r,
};
```

**D. Add Workflow API Functions (After line 607)**

```typescript
/**
 * Get available nurses for assignment
 * GET /api/v2/workflow/nurses
 * Backend: Backend 2 (Main AAHA)
 */
export async function listNurses(): Promise<Nurse[]> {
  const headers = await apiHeaders();
  try {
    const data = await apiFetch<{ nurses: Nurse[] }>(
      "/workflow/nurses",
      { headers }
      // No backend param = "common" = Backend 2
    );
    return data.nurses || [];
  } catch (error: any) {
    console.error("Failed to fetch nurses:", error);
    // Never block signup if API fails
    return [];
  }
}

/**
 * Assign nurse to patient
 * POST /api/v2/workflow/my-nurse
 * Backend: Backend 2 (Main AAHA)
 */
export async function assignMyNurse(nurseId: number): Promise<{
  message: string;
  nurse: Nurse;
}> {
  const headers = await apiHeaders();
  return await apiFetch(
    "/workflow/my-nurse",
    {
      method: "POST",
      headers,
      body: JSON.stringify({ nurse_id: nurseId })
    }
    // No backend param = Backend 2
  );
}

/**
 * Get patient's assigned nurse
 * GET /api/v2/workflow/my-nurse
 * Backend: Backend 2 (Main AAHA)
 */
export async function getMyNurse(): Promise<Nurse | null> {
  const headers = await apiHeaders();
  try {
    const data = await apiFetch<{ nurse: Nurse | null }>(
      "/workflow/my-nurse",
      { headers }
      // No backend param = Backend 2
    );
    return data.nurse;
  } catch (error: any) {
    if (error.status === 404) return null;  // No nurse assigned
    throw error;
  }
}
```

**Lines Changed:** ~100 lines

---

### File 2: src/routes/liv.tsx

**Changes Required:**

**A. Add Nurse Selection State (Around line 900)**

```typescript
// Nurse selection for signup
const [nurses, setNurses] = useState<Nurse[]>([]);
const [selectedNurseId, setSelectedNurseId] = useState<number | null>(null);
const [nursesLoading, setNursesLoading] = useState(false);
```

**B. Load Nurses on Signup View (Around line 1500)**

```typescript
useEffect(() => {
  if (currentView === "signup" && !nursesLoading && nurses.length === 0) {
    loadNurses();
  }
}, [currentView]);

const loadNurses = async () => {
  setNursesLoading(true);
  try {
    const nurseList = await listNurses();  // Backend 2
    setNurses(nurseList.filter(n => n.ready !== false));
  } catch (error) {
    console.error("Failed to load nurses:", error);
    // Never block signup
  } finally {
    setNursesLoading(false);
  }
};
```

**C. Add Nurse Selection UI (Around line 3400 - in signup form)**

```typescript
{/* Nurse Selection - Optional */}
{nurses.length > 0 && (
  <div className="field">
    <label>Health Advisor (Optional)</label>
    <select
      value={selectedNurseId || ""}
      onChange={(e) => setSelectedNurseId(e.target.value ? Number(e.target.value) : null)}
    >
      <option value="">Skip - Select later</option>
      {nurses.map(nurse => (
        <option key={nurse.nurse_id} value={nurse.nurse_id}>
          {nurse.full_name} - {nurse.centre_name || "Aaha Centre"}
        </option>
      ))}
    </select>
  </div>
)}
```

**D. Modify Profile Save to Include Nurse (Around line 2910)**

```typescript
// After createPatient succeeds:
if (selectedNurseId) {
  try {
    await assignMyNurse(selectedNurseId);  // Backend 2
    console.log("Nurse assigned successfully");
  } catch (error: any) {
    console.error("Nurse assignment failed:", error);
    // Don't block - just log
    if (error.status === 409) {
      // Already assigned - that's fine
    } else {
      showToast("Health advisor assignment pending");
    }
  }
}
```

**E. Add Workflow Status Display (Around line 5200)**

```typescript
// Helper function for workflow status badge
const getWorkflowStatusBadge = (workflow: WorkflowStatus | null | undefined) => {
  if (!workflow) return null;
  
  const statusConfig = {
    pending: {
      label: "Under Review",
      color: "blue",
      icon: "⏱️",
      bgClass: "bg-blue-100 text-blue-800"
    },
    uploaded: {
      label: "Awaiting Doctor Review",
      color: "orange",
      icon: "📋",
      bgClass: "bg-orange-100 text-orange-800"
    },
    rejected: {
      label: "Correction Needed",
      color: "red",
      icon: "⚠️",
      bgClass: "bg-red-100 text-red-800"
    },
    declined: {
      label: "In Review",
      color: "gray",
      icon: "👨‍⚕️",
      bgClass: "bg-gray-100 text-gray-800"
    },
    released: {
      label: "Report Ready",
      color: "green",
      icon: "✅",
      bgClass: "bg-green-100 text-green-800"
    }
  };
  
  const config = statusConfig[workflow.status] || statusConfig.pending;
  
  return (
    <div style={{ marginTop: "12px" }}>
      {/* Status Badge */}
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bgClass}`}>
        <span>{config.icon} {config.label}</span>
      </div>
      
      {/* Backend Message */}
      <div style={{ 
        marginTop: "8px", 
        padding: "12px", 
        background: "var(--faint-bg)",
        borderRadius: "8px"
      }}>
        <p className="sub">{workflow.message}</p>
      </div>
      
      {/* Rejection Reason */}
      {workflow.status === "rejected" && workflow.rejection_reason && (
        <div style={{ 
          marginTop: "8px", 
          padding: "12px", 
          background: "rgba(239, 68, 68, 0.1)",
          borderLeft: "3px solid #ef4444",
          borderRadius: "4px"
        }}>
          <p style={{ fontWeight: 600, color: "#b91c1c", marginBottom: "4px" }}>
            Rejection Reason:
          </p>
          <p style={{ color: "#991b1b" }}>{workflow.rejection_reason}</p>
        </div>
      )}
      
      {/* Upload Button - Only if can_upload */}
      {workflow.can_upload && (
        <button 
          type="button"
          className="btn ghost"
          style={{ marginTop: "12px", width: "100%" }}
          onClick={() => {
            document.getElementById("blood-report-upload-input")?.click();
          }}
        >
          {workflow.status === "rejected" 
            ? "Upload Corrected Report" 
            : "Upload Additional Report"}
        </button>
      )}
    </div>
  );
};

// Use in report cards:
{assessment.workflow && getWorkflowStatusBadge(assessment.workflow)}
```

**F. Add Upload Guard (Line ~2421)**

```typescript
const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  // ADD: Check workflow status before upload
  try {
    const reports = await listAssessments();  // Backend 2
    const latestReport = reports[0];
    
    if (latestReport?.workflow) {
      if (!latestReport.workflow.can_upload) {
        showToast(
          latestReport.workflow.message || 
          "Upload is currently not available. Please check your report status."
        );
        return;  // Block upload
      }
    }
  } catch (error) {
    console.error("Failed to check workflow status:", error);
    // Fail-open: allow upload if check fails
  }
  
  // Existing upload code...
  setUploading(true);
  try {
    const res = await uploadBloodReport(file);  // Backend 1
    
    // ... success handling
    
    // ADD: Refresh Backend 2 reports for workflow status
    await assessmentsQuery.refetch();
    
  } catch (err) {
    // ... error handling
  } finally {
    setUploading(false);
  }
};
```

**G. Add PDF Visibility Guard (Line ~1575)**

```typescript
const handlePdfAction = async (
  targetAssessment: Assessment | null,
  action: "view" | "download" = "view",
) => {
  if (!targetAssessment) return;
  
  const pdfUrl = targetAssessment.report_pdf_url;
  const workflow = targetAssessment.workflow;
  
  // ADD: Workflow guards
  
  // If no workflow (old kiosk reports), allow access
  if (workflow) {
    // Guard: Check if released
    if (!workflow.released) {
      showToast("Report has not been released yet. Please wait for doctor approval.");
      return;
    }
  }
  
  // Guard: Check PDF URL exists
  if (!pdfUrl) {
    showToast("PDF not available for this report.");
    return;
  }
  
  // Guard: Security - never expose internal paths
  if (pdfUrl.includes("_pdf_path") || pdfUrl.startsWith("gs://")) {
    console.error("Security: Internal PDF path exposed", pdfUrl);
    showToast("PDF URL error. Please contact support.");
    return;
  }
  
  // Guard: Validate signed URL format
  if (!pdfUrl.startsWith("http")) {
    console.error("Invalid PDF URL format", pdfUrl);
    showToast("Invalid PDF URL.");
    return;
  }
  
  // Proceed with existing PDF logic...
};
```

**Lines Changed:** ~300 lines

---

## 10. Backend Endpoint Verification Checklist

### To Be Verified with Backend Developer:

**Backend 2 Endpoints:**

- [ ] `GET /workflow/nurses` - Available?
- [ ] `POST /workflow/my-nurse` - Available?
- [ ] `GET /workflow/my-nurse` - Available?
- [ ] `GET /reports/me` - Now includes `workflow` object?
- [ ] Old kiosk reports - Have `workflow.released: true`?

**Backend 1 Endpoints:**

- [x] `POST /blood-reports` - Working ✅
- [x] File upload triggers Backend 2 workflow update? (Backend behavior)

### Response Format Verification:

**Expected from Backend 2 `/reports/me`:**

```json
{
  "reports": [
    {
      "report_id": 123,
      "patient_id": 456,
      "awis_score": 75,
      "prediction": {...},
      "report_data": {...},
      "created_at": "2026-09-14T10:00:00Z",
      "workflow": {
        "state": "active",
        "status": "pending",
        "message": "Your screening report is being reviewed. If you have completed the recommended tests, please upload your report.",
        "can_upload": true,
        "rejection_reason": null,
        "released": false
      }
    }
  ]
}
```

---

## 11. CORS & Authentication Dependencies

### A. CORS Configuration

**Development:** Bypassed via Vite proxy (Lines 28-38 in `vite.config.ts`)

```typescript
proxy: {
  "/api/v2/blood-reports": {
    target: "https://aaha-api-sdrsnwzwka-el.a.run.app",  // Backend 1
    changeOrigin: true,
  },
  "/api/v2": {
    target: "https://aaha-api-405281288207.asia-south1.run.app",  // Backend 2
    changeOrigin: true,
  },
}
```

**Production:** Requires CORS headers on both backends

**Required Headers:**
```
Access-Control-Allow-Origin: https://your-domain.com
Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

**Action:** Verify CORS configured before production deployment

### B. Firebase Token Validation

**Both backends must:**
- Accept Firebase ID tokens
- Validate via Firebase Admin SDK
- Extract patient_id from token

**Action:** Confirm with backend developer that workflow endpoints accept same token format

---

## 12. Test Plan

### Backend 2 Tests (Nurse & Workflow)

1. **Nurse List**
   - [ ] GET `/workflow/nurses` returns nurse array
   - [ ] Nurses have `nurse_id`, `full_name`, `centre_name`
   - [ ] Empty list handled gracefully
   - [ ] API failure doesn't block signup

2. **Nurse Assignment**
   - [ ] POST `/workflow/my-nurse` with valid nurse_id succeeds
   - [ ] 201 response when newly assigned
   - [ ] 200 response when already assigned
   - [ ] 400 when invalid nurse_id
   - [ ] 404 when patient profile missing
   - [ ] 409 when nurse already assigned (conflict)

3. **Workflow in Reports**
   - [ ] GET `/reports/me` includes `workflow` object
   - [ ] All 5 statuses work: pending, uploaded, rejected, declined, released
   - [ ] `workflow.message` populated
   - [ ] `workflow.can_upload` boolean correct
   - [ ] `workflow.rejection_reason` present when rejected
   - [ ] `workflow.released` controls PDF visibility

### Backend 1 Tests (Blood Report)

1. **Upload**
   - [x] POST `/blood-reports` accepts JPG, PNG, PDF
   - [x] 10 MB limit enforced
   - [x] Multipart field name "file" works
   - [x] 100+ second timeout works
   - [ ] Upload triggers Backend 2 workflow update

### End-to-End Tests

1. **Signup with Nurse**
   - [ ] Nurse list loads on signup screen
   - [ ] Can select nurse from dropdown
   - [ ] Can skip nurse selection
   - [ ] Profile created on Backend 2
   - [ ] Nurse assigned on Backend 2
   - [ ] Signup succeeds even if nurse API fails

2. **Report Workflow**
   - [ ] New report shows "pending" status
   - [ ] Upload button visible when `can_upload: true`
   - [ ] Upload button hidden when `can_upload: false`
   - [ ] Upload blocked if `can_upload: false`
   - [ ] After upload, status changes to "uploaded"
   - [ ] Rejection shows rejection_reason
   - [ ] Can re-upload when rejected
   - [ ] Released report shows PDF download
   - [ ] Unreleased report hides PDF

3. **Kiosk Report Preservation**
   - [ ] Existing kiosk reports still visible
   - [ ] Kiosk PDFs still accessible
   - [ ] Workflow checks don't break old reports

---

## 13. Implementation Plan

### Phase 2A: API Layer (2-3 hours)

**File:** `src/lib/aaha-api.ts`

1. Add WorkflowStatus interface
2. Add Nurse interface
3. Update Assessment interface with workflow field
4. Add workflow parsing in listAssessments
5. Add listNurses() function (Backend 2)
6. Add assignMyNurse() function (Backend 2)
7. Add getMyNurse() function (Backend 2)

**Test:** Call functions directly in browser console

### Phase 2B: Nurse Selection UI (2-3 hours)

**File:** `src/routes/liv.tsx`

1. Add nurse state variables
2. Add loadNurses() on signup mount
3. Add nurse dropdown in signup form
4. Integrate nurse assignment in profile save
5. Test signup flow end-to-end

### Phase 2C: Workflow Status Display (3-4 hours)

**File:** `src/routes/liv.tsx`

1. Create getWorkflowStatusBadge() helper
2. Add status badge component (5 statuses)
3. Add workflow message display
4. Add rejection reason display
5. Add conditional upload button
6. Integrate into report cards

**Test:** Mock all 5 workflow statuses

### Phase 2D: Upload & PDF Guards (1-2 hours)

**File:** `src/routes/liv.tsx`

1. Add workflow.can_upload check to upload handler
2. Add Backend 2 reports refresh after upload
3. Add workflow.released check to PDF handler
4. Add PDF URL security checks

**Test:** Upload with can_upload false/true, PDF with released false/true

### Phase 2E: Testing & Verification (2-3 hours)

1. Test all APIs with real backend
2. Test all 5 workflow statuses
3. Test nurse selection flow
4. Test upload guard
5. Test PDF visibility
6. Verify kiosk reports unaffected

**Total:** 10-15 hours

---

## 14. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Backend 2 workflow endpoints not ready | Medium | High | Verify with backend dev before coding |
| Workflow field not in `/reports/me` | Low | High | Check response format first |
| Old kiosk reports break | Low | High | Graceful workflow null handling |
| Nurse API fails during signup | Medium | Low | Never block signup on failure |
| CORS issues in production | Low | High | Verify CORS headers before deploy |
| Upload without workflow check | Low | Medium | Test workflow.can_upload guard |

---

## 15. Conclusion

### ✅ Infrastructure Ready

- Dual backend architecture properly configured
- Firebase authentication unified
- Blood report upload fully implemented (Backend 1)
- Kiosk reports fully implemented (Backend 2)
- API client supports all required backends

### ❌ Missing Workflow Features

**Critical (P0):**
1. Workflow status parsing
2. Workflow status display (5 statuses)
3. Upload guard (can_upload)
4. PDF visibility guard (released)

**Important (P1):**
5. Nurse selection APIs (3 endpoints)
6. Nurse selection UI

**Enhancement (P2):**
7. Post-upload reports refresh
8. Pull-to-refresh
9. Show assigned nurse

### 📊 Effort Estimate

- **API Layer:** 2-3 hours
- **Nurse UI:** 2-3 hours
- **Workflow Display:** 3-4 hours
- **Guards:** 1-2 hours
- **Testing:** 2-3 hours
- **Total:** 10-15 hours

### 🎯 Next Steps

1. **Verify Backend 2 Endpoints**
   - Confirm `/workflow/nurses`, `/workflow/my-nurse` availability
   - Confirm `/reports/me` includes workflow object
   - Confirm old kiosk reports handling

2. **Get Approval**
   - Review this audit
   - Approve implementation plan
   - Confirm backend availability

3. **Proceed to Phase 2**
   - Implement in order: API → Nurse → Workflow → Guards → Testing
   - Test with real backend at each step
   - Document any issues found

---

**Phase 1 Audit Complete. No code changes made. Awaiting approval for Phase 2 implementation.**

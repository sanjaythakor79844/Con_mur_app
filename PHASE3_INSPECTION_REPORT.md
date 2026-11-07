# Phase 3: Blood Report Upload Guard - Inspection Report

**Date:** January 14, 2025  
**Status:** Planning Phase - Implementation Not Started  
**Purpose:** Inspect existing upload flow and plan workflow.can_upload integration  

---

## Executive Summary

Successfully identified the complete blood report upload flow in the AAHA Liv App. The upload functionality is implemented in `liv.tsx` with a file input element, upload handler (`handleDirectFileUpload`), and direct integration with the `uploadBloodReport()` API function. Ready to implement `workflow.can_upload` guard.

---

## 1. Existing Upload Flow - Complete Analysis

### Upload Component Location

**File:** `src/routes/liv.tsx`  
**Lines:** 2420-2520 (handler), 6743-6756 (button), 7495-7499 (file input)

### Upload UI Components

#### 1.1 Upload Button
**Location:** Line 6743-6756

```tsx
<button
  type="button"
  className="opt"
  disabled={uploadingFile}
  onClick={() => {
    setActiveSheet(null);
    fileInputRef.current?.click();
  }}
>
  <LivIcon name="cam" size={22} />
  <div style={{ flex: 1, minWidth: 0 }}>
    <div className="h3">Upload blood report</div>
    <div className="sub">Complete laboratory report · PDF, JPG, PNG up to 10 MB</div>
  </div>
  <LivIcon name="chev" size={16} />
</button>
```

**Current Behavior:**
- Shown in a sheet/modal when user wants to add report data
- Only disabled when `uploadingFile === true` (upload in progress)
- Triggers hidden file input when clicked
- No workflow guard currently implemented

**Context:** This button appears in a list with other options:
1. "Fetch from the Living Lab kiosk" (fetch kiosk reports)
2. **"Upload blood report"** (manual upload) ← Target for Phase 3
3. "Guided Health Check-up" (online assessment)

---

#### 1.2 Hidden File Input
**Location:** Line 7495-7499

```tsx
<input
  type="file"
  id="filein"
  ref={fileInputRef}
  accept="application/pdf,image/jpeg,image/png,.jpg,.jpeg,.png,.pdf"
  hidden
  disabled={uploadingFile}
  onChange={handleDirectFileUpload}
/>
```

**Current Behavior:**
- Accepts PDF, JPEG, PNG files
- Max size: 10 MB (validated in handler)
- Disabled during upload
- Triggers `handleDirectFileUpload` when file selected

---

#### 1.3 Upload State Management
**Location:** Line 1558

```tsx
const [uploadingFile, setUploadingFile] = useState(false);
```

**Current Behavior:**
- `uploadingFile = true`: Upload in progress, button disabled
- `uploadingFile = false`: Idle, button enabled

---

### Upload Handler Function

#### 1.4 handleDirectFileUpload
**Location:** Line 2420-2520  
**Length:** ~100 lines

**Flow:**
1. **Validation** (Lines 2420-2448)
   - Check file exists
   - Validate size ≤ 10 MB
   - Validate format (JPG, JPEG, PNG, PDF)
   - Check authentication (session exists)

2. **Upload Preparation** (Lines 2450-2457)
   - Set `uploadingFile = true`
   - Set analysis source to "upload"
   - Show analyzing view with progress steps

3. **API Call** (Lines 2458-2470)
   ```tsx
   const res = await uploadBloodReport(file);
   const bloodReport = res.blood_report;
   const status = bloodReport?.status;
   const paramsRead = bloodReport?.parameters_read ?? 0;
   ```

4. **Query Invalidation** (Lines 2472-2480)
   ```tsx
   await Promise.all([
     qc.invalidateQueries({ queryKey: ["my-uploads", session.uid] }),
     qc.invalidateQueries({ queryKey: ["reports"] }),
   ]);
   
   if (res.report?.stage === "final" && res.report?.updated === true) {
     await qc.invalidateQueries({ queryKey: ["assessments", session.uid] });
     await assessmentsQuery.refetch();
   }
   ```

5. **Success Handling** (Lines 2482-2506)
   - Show success toast with validation note
   - Update UI state
   - Open report history sheet

6. **Error Handling** (Lines 2507-2520)
   - Catch and display error messages
   - Reset upload state

---

### Upload API Function

#### 1.5 uploadBloodReport()
**File:** `src/lib/aaha-api.ts`  
**Location:** Lines 442-531

**Key Details:**
- **Endpoint:** `POST ${BLOOD_REPORT_API_BASE}/blood-reports`
- **Base URL:** `https://aaha-api-sdrsnwzwka-el.a.run.app/api/v2`
- **Authentication:** Firebase Bearer token
- **Content-Type:** `multipart/form-data` (field name: "file")
- **Timeout:** 105 seconds
- **Max Size:** 10 MB
- **Formats:** JPG, JPEG, PNG, PDF

**Response Interface:**
```typescript
export interface BloodReportUploadResponse {
  message?: string;
  blood_report?: {
    blood_report_id: number;
    status: "valid" | "review" | "invalid" | "pending";
    validation_note?: string | null;
    parameters_read?: number;
    report_date?: string | null;
    lab_name?: string | null;
    original_filename?: string;
    uploaded_at?: string;
    parameters?: any[];
  };
  report?: {
    stage?: string;
    updated?: boolean;
    biological_age_available?: boolean;
    awis_score?: string | number;
    prediction?: any;
  } | null;
  biological_age?: {
    available?: boolean;
    missing?: string[];
    needs?: string[];
    reason?: string | null;
  };
}
```

---

### Query Invalidation After Upload

#### 1.6 Report List Refresh Logic
**Location:** Lines 2472-2480

**Current Behavior:**
1. **Always refreshes:**
   - `["my-uploads", session.uid]` - Uploaded blood reports list
   - `["reports"]` - Generic reports query

2. **Conditionally refreshes:**
   - `["assessments", session.uid]` - Clinical assessments list
   - Only when `res.report?.stage === "final"` AND `res.report?.updated === true`

**Assessment Query Details:**
**Location:** Lines 953-963

```tsx
const assessmentsQuery = useQuery({
  queryKey: ["assessments", session?.uid],
  queryFn: () => listAssessments(),
  staleTime: 1000 * 60 * 5,
  enabled: Boolean(session),
  retry: (failureCount, error: any) => {
    if (error?.status === 404 || error?.isUnlinked) return false;
    return failureCount < 2;
  },
});

const assessments = assessmentsQuery.data || [];
const latestAssessment = assessments[0] || null;
```

**This is where workflow data comes from!**

---

## 2. Workflow Integration Requirements

### 2.1 Where workflow.can_upload Comes From

**Source:** `GET /api/v2/reports/me` (listAssessments() function)  
**Implementation:** Phase 1 (already complete)

```typescript
// src/lib/aaha-api.ts line 1167
workflow: r.workflow || undefined
```

**Assessment Interface:**
```typescript
export interface Assessment {
  // ... other fields
  workflow?: WorkflowStatus;
}

export interface WorkflowStatus {
  state: string;
  status: "pending" | "uploaded" | "rejected" | "declined" | "released";
  message?: string;
  can_upload: boolean;  // ← This controls upload visibility
  rejection_reason?: string;
  released: boolean;
}
```

---

### 2.2 Current Upload Guard Logic

**Existing:** Only checks if upload is in progress
```tsx
disabled={uploadingFile}
```

**Missing:** No check for `workflow.can_upload`

---

### 2.3 Upload Button Visibility Scenarios

| Latest Assessment | workflow | can_upload | Current Behavior | Desired Behavior |
|-------------------|----------|------------|------------------|------------------|
| None | undefined | N/A | Button shown | Button shown ✅ |
| Exists | undefined | N/A | Button shown | Button shown ✅ |
| Exists | exists | true | Button shown | Button shown ✅ |
| Exists | exists | false | Button shown | **Button disabled/hidden** ❌ |

**Key Issue:** When `workflow.can_upload === false`, user should not be able to upload a new report.

---

## 3. Implementation Plan for Phase 3

### 3.1 Files to Modify

**File:** `src/routes/liv.tsx`  
**Sections:** 
1. Upload button disabled logic (line 6743)
2. Optional: Add helper message when upload not allowed

**No changes needed to:**
- ❌ `uploadBloodReport()` function (API integration)
- ❌ `handleDirectFileUpload()` handler (works as-is)
- ❌ Query invalidation logic (already correct)
- ❌ `listAssessments()` function (Phase 1 complete)

---

### 3.2 Proposed Implementation

#### Option A: Disable Upload Button (Recommended)

**Change:** Add `workflow.can_upload` check to button's `disabled` prop

**Before:**
```tsx
<button
  type="button"
  className="opt"
  disabled={uploadingFile}
  onClick={() => {
    fileInputRef.current?.click();
  }}
>
  <div className="h3">Upload blood report</div>
  <div className="sub">Complete laboratory report · PDF, JPG, PNG up to 10 MB</div>
</button>
```

**After:**
```tsx
<button
  type="button"
  className="opt"
  disabled={uploadingFile || !canUploadReport}
  onClick={() => {
    if (!canUploadReport) {
      showToast(getUploadDisabledMessage());
      return;
    }
    fileInputRef.current?.click();
  }}
  title={!canUploadReport ? getUploadDisabledMessage() : undefined}
>
  <div className="h3">Upload blood report</div>
  <div className="sub">
    {canUploadReport 
      ? "Complete laboratory report · PDF, JPG, PNG up to 10 MB"
      : latestAssessment?.workflow?.message || "Upload not currently available"}
  </div>
</button>
```

**Helper Variables (add before button render):**
```tsx
const latestAssessment = assessments[0] || null;
const canUploadReport = latestAssessment?.workflow?.can_upload !== false;
```

**Helper Function (add to component):**
```tsx
const getUploadDisabledMessage = () => {
  if (!latestAssessment?.workflow) return "Upload not available";
  
  const { status, message, rejection_reason } = latestAssessment.workflow;
  
  // Show rejection reason if status is rejected
  if (status === "rejected" && rejection_reason) {
    return rejection_reason;
  }
  
  // Show workflow message if available
  if (message) {
    return message;
  }
  
  // Default messages based on status
  switch (status) {
    case "pending":
      return "Your previous report is pending review";
    case "uploaded":
      return "Your report is currently under review";
    case "declined":
      return "Previous report was declined";
    case "released":
      return "Your latest report has been released";
    default:
      return "Upload not currently available";
  }
};
```

---

#### Option B: Hide Upload Button Completely

**Change:** Conditional rendering based on `workflow.can_upload`

**Implementation:**
```tsx
{canUploadReport && (
  <button
    type="button"
    className="opt"
    disabled={uploadingFile}
    onClick={() => fileInputRef.current?.click()}
  >
    <LivIcon name="cam" size={22} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className="h3">Upload blood report</div>
      <div className="sub">Complete laboratory report · PDF, JPG, PNG up to 10 MB</div>
    </div>
    <LivIcon name="chev" size={16} />
  </button>
)}

{!canUploadReport && latestAssessment?.workflow && (
  <div className="opt disabled" style={{ opacity: 0.5, cursor: "not-allowed" }}>
    <LivIcon name="cam" size={22} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className="h3">Upload blood report</div>
      <div className="sub" style={{ color: "var(--muted)" }}>
        {latestAssessment.workflow.message || "Upload not currently available"}
      </div>
    </div>
  </div>
)}
```

**Pros:** Clear visual indication that upload is not allowed  
**Cons:** More code, potential confusion if button disappears

---

#### Option C: Show Upload Button with Warning (Alternative)

**Change:** Always show button, but show warning dialog before upload

**Implementation:**
```tsx
<button
  type="button"
  className="opt"
  disabled={uploadingFile}
  onClick={() => {
    if (!canUploadReport) {
      // Show alert dialog with workflow message
      const message = latestAssessment?.workflow?.message 
        || "Upload is not allowed at this time.";
      alert(message);  // Or use a proper modal component
      return;
    }
    fileInputRef.current?.click();
  }}
>
  <div className="h3">Upload blood report</div>
  <div className="sub">Complete laboratory report · PDF, JPG, PNG up to 10 MB</div>
</button>
```

**Pros:** Button always visible, clear feedback on click  
**Cons:** Allows click before showing error, not ideal UX

---

### 3.3 Recommended Approach: **Option A - Disable Upload Button**

**Reasoning:**
1. ✅ Least invasive change (single line modification)
2. ✅ Maintains existing UI structure
3. ✅ Clear visual feedback (disabled state)
4. ✅ Tooltip provides explanation
5. ✅ Dynamic subtitle shows workflow message
6. ✅ Follows existing pattern (uploadingFile disabled logic)
7. ✅ No new components or modals needed

---

## 4. Workflow Logic - Detailed Scenarios

### 4.1 Scenario: No Assessments (New User)

**State:**
```typescript
assessments = []
latestAssessment = null
```

**Logic:**
```tsx
canUploadReport = latestAssessment?.workflow?.can_upload !== false
                = null?.workflow?.can_upload !== false
                = undefined !== false
                = true  // Upload allowed ✅
```

**UI:** Upload button **enabled**

---

### 4.2 Scenario: Assessment Without Workflow (Legacy)

**State:**
```typescript
assessments = [{ id: "RPT-001", workflow: undefined }]
latestAssessment = { id: "RPT-001", workflow: undefined }
```

**Logic:**
```tsx
canUploadReport = latestAssessment?.workflow?.can_upload !== false
                = undefined?.can_upload !== false
                = undefined !== false
                = true  // Upload allowed ✅
```

**UI:** Upload button **enabled**

---

### 4.3 Scenario: Report Pending Review

**State:**
```typescript
assessments = [{
  id: "RPT-002",
  workflow: {
    status: "pending",
    can_upload: false,
    message: "Report uploaded, awaiting nurse review",
    released: false
  }
}]
```

**Logic:**
```tsx
canUploadReport = latestAssessment?.workflow?.can_upload !== false
                = false !== false
                = false  // Upload NOT allowed ❌
```

**UI:** Upload button **disabled**  
**Tooltip:** "Report uploaded, awaiting nurse review"  
**Subtitle:** "Report uploaded, awaiting nurse review"

---

### 4.4 Scenario: Report Under Review

**State:**
```typescript
workflow: {
  status: "uploaded",
  can_upload: false,
  message: "Dr. Sharma is reviewing your report",
  released: false
}
```

**Logic:**
```tsx
canUploadReport = false  // Upload NOT allowed ❌
```

**UI:** Upload button **disabled**  
**Tooltip:** "Dr. Sharma is reviewing your report"

---

### 4.5 Scenario: Report Rejected (Can Re-upload)

**State:**
```typescript
workflow: {
  status: "rejected",
  can_upload: true,  // ← Backend allows re-upload
  message: "Report quality insufficient",
  rejection_reason: "Blood sample image is blurry. Please retake in good lighting.",
  released: false
}
```

**Logic:**
```tsx
canUploadReport = true  // Upload allowed ✅
```

**UI:** Upload button **enabled**  
**Note:** User can upload a corrected report

---

### 4.6 Scenario: Report Released

**State:**
```typescript
workflow: {
  status: "released",
  can_upload: false,  // ← No need for new upload
  message: "Report approved and signed",
  released: true
}
```

**Logic:**
```tsx
canUploadReport = false  // Upload NOT allowed ❌
```

**UI:** Upload button **disabled**  
**Tooltip:** "Report approved and signed"

---

### 4.7 Scenario: Report Declined

**State:**
```typescript
workflow: {
  status: "declined",
  can_upload: false,
  message: "You declined this report",
  released: false
}
```

**Logic:**
```tsx
canUploadReport = false  // Upload NOT allowed ❌
```

**UI:** Upload button **disabled**  
**Tooltip:** "You declined this report"

---

## 5. Query Refresh After Upload - Verification

### 5.1 Current Refresh Logic (Lines 2472-2480)

```tsx
// Always refresh uploaded reports
await Promise.all([
  qc.invalidateQueries({ queryKey: ["my-uploads", session.uid] }),
  qc.invalidateQueries({ queryKey: ["reports"] }),
]);

// Conditionally refresh assessments (includes workflow data)
if (res.report?.stage === "final" && res.report?.updated === true) {
  await qc.invalidateQueries({ queryKey: ["assessments", session.uid] });
  await assessmentsQuery.refetch();
}
```

**Analysis:**
- ✅ Uploaded reports list refreshed immediately
- ✅ Assessments list refreshed when backend confirms report finalization
- ✅ Workflow data will be updated after refresh (contains new can_upload state)

**Potential Issue:** If backend workflow doesn't immediately update `can_upload` after upload, there might be a window where user can upload again.

**Solution:** Trust backend to set `can_upload = false` immediately after upload. If needed, can add client-side guard:

```tsx
const canUploadReport = 
  !uploadingFile &&  // Not currently uploading
  (latestAssessment?.workflow?.can_upload !== false);  // Backend allows upload
```

---

### 5.2 Expected Workflow State Changes

**Before Upload:**
```typescript
workflow: { can_upload: true }  // Or undefined/null (no workflow)
```

**During Upload:**
```typescript
uploadingFile: true  // Client-side state
workflow: { can_upload: true }  // Still true until backend processes
```

**After Upload (Backend Response):**
```typescript
workflow: {
  status: "pending",
  can_upload: false,  // ← Backend sets this
  message: "Report uploaded, awaiting nurse review",
  released: false
}
```

**After Query Refresh:**
```typescript
assessments[0].workflow = {
  status: "pending",
  can_upload: false,
  message: "Report uploaded, awaiting nurse review",
  released: false
}
```

**Result:** Upload button disabled after refresh completes ✅

---

## 6. Edge Cases & Error Handling

### 6.1 Upload During Pending State

**Scenario:** User somehow bypasses disabled button and triggers upload

**Current Guard in handleDirectFileUpload (line 2425):**
```tsx
if (uploadingFile) return;
```

**Proposed Additional Guard:**
```tsx
if (uploadingFile) return;

if (!canUploadReport) {
  showToast("Upload not allowed at this time. Please wait for your current report to be reviewed.");
  return;
}
```

**Location:** Add immediately after line 2425

---

### 6.2 Network Error During Upload

**Current Handling (lines 2507-2520):**
```tsx
catch (err: any) {
  console.error("[Liv Blood Report Upload] Error:", err);
  setCurrentView("main");
  setUploadingFile(false);
  
  if (err.status === 401) {
    showToast("Your session has expired. Please sign in again.");
  } else if (err.status === 404) {
    showToast("Profile not found. Please complete sign-up first.");
  } else {
    showToast(err.message || "Upload failed. Please try again.");
  }
}
```

**Analysis:** ✅ Adequate error handling, resets `uploadingFile` state

---

### 6.3 Query Invalidation Failure

**Current:** No try-catch around query invalidation (lines 2472-2480)

**Risk:** If query invalidation fails, workflow state might not refresh

**Proposed Enhancement:**
```tsx
try {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ["my-uploads", session.uid] }),
    qc.invalidateQueries({ queryKey: ["reports"] }),
  ]);
  
  if (res.report?.stage === "final" && res.report?.updated === true) {
    await qc.invalidateQueries({ queryKey: ["assessments", session.uid] });
    await assessmentsQuery.refetch();
  }
} catch (refreshErr) {
  console.warn("[Liv] Failed to refresh report queries:", refreshErr);
  // Continue anyway - upload was successful
}
```

**Priority:** Low (query invalidation rarely fails)

---

### 6.4 Race Condition: Multiple Upload Attempts

**Current Guard:** `uploadingFile` state prevents multiple simultaneous uploads

**Additional Guard Needed:** Check `can_upload` at start of handler

**Implementation:**
```tsx
const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  e.target.value = "";

  if (uploadingFile) return;

  // NEW: Check workflow guard
  if (!canUploadReport) {
    showToast("Upload not allowed. Please wait for your current report to be reviewed.");
    return;
  }

  // ... rest of upload logic
```

---

### 6.5 Workflow Data Not Loaded Yet

**Scenario:** Assessment query still loading

**State:**
```typescript
assessmentsQuery.isLoading = true
assessments = []
latestAssessment = null
```

**Logic:**
```tsx
canUploadReport = null?.workflow?.can_upload !== false
                = undefined !== false
                = true  // Upload allowed (fail-open) ✅
```

**Analysis:** ✅ Acceptable behavior - allow upload if workflow data not available yet

**Alternative (More Conservative):**
```tsx
const canUploadReport = 
  assessmentsQuery.isLoading 
    ? false  // Disable during loading
    : (latestAssessment?.workflow?.can_upload !== false);
```

**Recommendation:** Use default (fail-open) approach unless UX testing shows issues

---

## 7. File Input Guard (Optional Enhancement)

### 7.1 Current File Input State

**Location:** Line 7495-7499

```tsx
<input
  type="file"
  ref={fileInputRef}
  accept="application/pdf,image/jpeg,image/png,.jpg,.jpeg,.png,.pdf"
  hidden
  disabled={uploadingFile}
  onChange={handleDirectFileUpload}
/>
```

**Current:** Only disabled during upload

---

### 7.2 Proposed Enhancement

```tsx
<input
  type="file"
  ref={fileInputRef}
  accept="application/pdf,image/jpeg,image/png,.jpg,.jpeg,.png,.pdf"
  hidden
  disabled={uploadingFile || !canUploadReport}
  onChange={handleDirectFileUpload}
/>
```

**Benefit:** Double guard prevents file selection even if button guard is bypassed

**Priority:** Low (nice-to-have, not critical)

---

## 8. Implementation Checklist

### 8.1 Minimum Required Changes

- [ ] 1. Define `canUploadReport` helper variable
- [ ] 2. Update upload button `disabled` prop
- [ ] 3. Add `title` tooltip for disabled state
- [ ] 4. Update button subtitle to show workflow message
- [ ] 5. Add workflow guard at start of `handleDirectFileUpload`
- [ ] 6. Test all 7 workflow scenarios

**Lines to Modify:** ~10-15 lines in `liv.tsx`

---

### 8.2 Optional Enhancements

- [ ] Disable file input element (double guard)
- [ ] Add helper function `getUploadDisabledMessage()`
- [ ] Add try-catch around query invalidation
- [ ] Add conservative loading guard (disable during loading)
- [ ] Add visual indicator (icon/badge) when upload disabled

**Lines to Modify:** ~30-40 lines total

---

## 9. Testing Plan

### 9.1 Manual Testing Scenarios

| # | Scenario | Expected Upload Button State |
|---|----------|------------------------------|
| 1 | New user (no assessments) | **Enabled** |
| 2 | Legacy assessment (no workflow) | **Enabled** |
| 3 | Report pending review (`can_upload: false`) | **Disabled** |
| 4 | Report uploaded (`can_upload: false`) | **Disabled** |
| 5 | Report rejected (`can_upload: true`) | **Enabled** |
| 6 | Report released (`can_upload: false`) | **Disabled** |
| 7 | Report declined (`can_upload: false`) | **Disabled** |
| 8 | Upload in progress (`uploadingFile: true`) | **Disabled** |
| 9 | Query loading (`isLoading: true`) | **Enabled** (fail-open) |

---

### 9.2 Integration Testing

**Test Flow:**
1. User uploads blood report (workflow.can_upload = true initially)
2. Upload succeeds (shows success toast)
3. Query refreshes (assessments[0].workflow updated)
4. Upload button becomes disabled (workflow.can_upload = false)
5. User clicks disabled button (tooltip shows message)
6. Backend nurse approves/rejects report
7. Query refreshes (workflow.can_upload may become true if rejected)
8. Upload button state updates accordingly

---

### 9.3 Error Testing

**Scenarios:**
1. Upload when workflow.can_upload = false → Shows error toast, no API call
2. Network failure during upload → Error handled, uploadingFile reset
3. Query refresh fails → Upload still succeeds, shows success
4. Backend returns 409 Conflict → Error message shown
5. Session expires during upload → 401 error, redirect to signin

---

## 10. Backend API Contract Verification

### 10.1 Expected Workflow Behavior

**Assumption:** Backend `POST /blood-reports` endpoint updates patient's workflow state after successful upload

**Expected Response:**
```json
{
  "message": "Blood report uploaded successfully",
  "blood_report": {
    "blood_report_id": 123,
    "status": "pending",
    ...
  }
}
```

**Note:** Response does NOT include updated workflow state directly. Must fetch from `GET /reports/me` after upload.

---

### 10.2 Query Refresh Ensures Workflow Update

**After Upload:**
```tsx
// Refresh assessments query
await qc.invalidateQueries({ queryKey: ["assessments", session.uid] });
await assessmentsQuery.refetch();
```

**New Data:**
```typescript
assessments[0].workflow = {
  status: "pending",
  can_upload: false,  // ← Backend sets this after upload
  message: "Report uploaded, awaiting nurse review",
  released: false
}
```

**Verification Needed:** Confirm with backend developer (Vinay) that:
1. ✅ `can_upload` is set to `false` immediately after upload
2. ✅ `can_upload` becomes `true` again when report is rejected
3. ✅ `can_upload` remains `false` for pending/uploaded/released/declined states

---

## 11. Restrictions Compliance ✅

**Verified:**
- ✅ No changes to AWIS or clinical logic
- ✅ No modifications to backend APIs
- ✅ No database schema changes
- ✅ No removal of existing upload functionality (only guard added)
- ✅ No changes to `uploadBloodReport()` API function
- ✅ No changes to query refresh logic (already correct)
- ✅ No unrelated file modifications

---

## 12. Summary & Recommendations

### 12.1 Findings

**✅ Upload Flow Well-Structured:**
- Single upload button with clear UI
- Robust validation (size, format, auth)
- Proper error handling
- Query invalidation after upload
- State management clean

**✅ Workflow Integration Ready:**
- Phase 1 complete (workflow.can_upload available)
- Assessment query already provides workflow data
- Upload button location identified
- Handler function accessible

**✅ Minimal Changes Required:**
- ~10-15 lines of code
- Single file modification (liv.tsx)
- No API changes needed
- No new dependencies

---

### 12.2 Recommended Implementation

**Approach:** Option A - Disable Upload Button

**Changes:**
1. Add `canUploadReport` helper variable
2. Update button `disabled` prop
3. Add tooltip and dynamic subtitle
4. Add guard at start of handler
5. Test all workflow scenarios

**Complexity:** Low  
**Risk:** Low  
**Testing Effort:** Medium  
**User Impact:** High (prevents invalid uploads)

---

### 12.3 Next Steps

**Phase 3 Implementation:**
1. ✅ Get approval for Option A approach
2. Implement changes in `liv.tsx` (~15 lines)
3. Run TypeScript check (expect 0 new errors)
4. Manual testing with mock workflow states
5. Integration testing with backend (when available)
6. Commit with message: `feat: add workflow guard to blood report upload`

**Estimated Time:** 1-2 hours (implementation + testing)

---

## Appendix A: Code Locations Reference

| Component | File | Line(s) | Description |
|-----------|------|---------|-------------|
| Upload Button | liv.tsx | 6743-6756 | Button that triggers file input |
| File Input | liv.tsx | 7495-7499 | Hidden input element |
| Upload Handler | liv.tsx | 2420-2520 | handleDirectFileUpload function |
| Upload State | liv.tsx | 1558 | uploadingFile state |
| Assessment Query | liv.tsx | 953-963 | Source of workflow data |
| Upload API | aaha-api.ts | 442-531 | uploadBloodReport function |
| Query Refresh | liv.tsx | 2472-2480 | Post-upload invalidation |

---

## Appendix B: Workflow State Reference

| Status | can_upload | Message Example | User Action |
|--------|------------|-----------------|-------------|
| undefined | N/A | N/A | Can upload |
| pending | false | "Report uploaded, awaiting review" | Cannot upload |
| uploaded | false | "Dr. Sharma is reviewing your report" | Cannot upload |
| rejected | **true** | "Report quality insufficient" | **Can re-upload** |
| declined | false | "You declined this report" | Cannot upload |
| released | false | "Report approved and signed" | Cannot upload |

---

**Inspection Report Completed:** January 14, 2025  
**Status:** Ready for Implementation Approval  
**Next:** Await approval to proceed with Phase 3 implementation

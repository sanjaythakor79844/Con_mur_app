# Phase 3 Upload Permission Logic Verification

**Date:** January 14, 2025  
**Purpose:** Code-level verification of all 8 test scenarios

---

## Core Permission Logic (Line 2420)

```tsx
const canUploadReport = latestAssessment?.workflow?.can_upload !== false;
```

### Truth Table

| latestAssessment | workflow | can_upload | Result | Reason |
|------------------|----------|------------|--------|--------|
| null | N/A | N/A | `true` | `null?.workflow?.can_upload !== false` = `undefined !== false` = `true` |
| { workflow: undefined } | undefined | N/A | `true` | `undefined?.can_upload !== false` = `undefined !== false` = `true` |
| { workflow: { can_upload: true } } | exists | `true` | `true` | `true !== false` = `true` |
| { workflow: { can_upload: false } } | exists | `false` | `false` | `false !== false` = `false` |

---

## Scenario 1: No Assessment – Upload Allowed ✅

**State:**
```typescript
assessments = []
latestAssessment = assessments[0] || null  // null
```

**Logic Evaluation:**
```tsx
canUploadReport = null?.workflow?.can_upload !== false
                = undefined !== false
                = true
```

**Button (Line 6782):**
```tsx
disabled={uploadingFile || !canUploadReport}
       = false || !true
       = false || false
       = false  // Button ENABLED ✅
```

**Handler (Line 2460):**
```tsx
if (!canUploadReport) {  // if (!true) -> if (false)
  showToast(...);
  return;  // NOT EXECUTED
}
// Continues to upload ✅
```

**File Input (Line 7546):**
```tsx
disabled={uploadingFile || !canUploadReport}
       = false || false
       = false  // ENABLED ✅
```

**Result:** ✅ Upload allowed for new users

---

## Scenario 2: Legacy Assessment Without Workflow – Upload Allowed ✅

**State:**
```typescript
assessments = [{ id: "RPT-001", workflow: undefined }]
latestAssessment = assessments[0]  // { id: "RPT-001", workflow: undefined }
```

**Logic Evaluation:**
```tsx
canUploadReport = { workflow: undefined }?.workflow?.can_upload !== false
                = undefined?.can_upload !== false
                = undefined !== false
                = true
```

**Button:**
```tsx
disabled = false || !true = false  // ENABLED ✅
```

**Handler:**
```tsx
if (!true) { ... }  // NOT EXECUTED
// Continues to upload ✅
```

**Result:** ✅ Legacy reports with no workflow can upload

---

## Scenario 3: Pending – Upload Blocked ✅

**State:**
```typescript
latestAssessment = {
  workflow: {
    status: "pending",
    can_upload: false,
    message: "Report uploaded, awaiting nurse review",
    released: false
  }
}
```

**Logic Evaluation:**
```tsx
canUploadReport = workflow.can_upload !== false
                = false !== false
                = false
```

**Button:**
```tsx
disabled = false || !false
         = false || true
         = true  // DISABLED ✅
```

**Button Subtitle (Line 6795):**
```tsx
{canUploadReport 
  ? "Complete laboratory report · PDF, JPG, PNG up to 10 MB"
  : (latestAssessment?.workflow?.message || "Upload not currently available")}

// Evaluates to:
{false 
  ? "Complete laboratory report · PDF, JPG, PNG up to 10 MB"
  : ("Report uploaded, awaiting nurse review" || "Upload not currently available")}

// Result: "Report uploaded, awaiting nurse review" ✅
```

**Button Tooltip (Line 6791):**
```tsx
title={!canUploadReport ? getUploadDisabledMessage() : undefined}
     = !false ? getUploadDisabledMessage() : undefined
     = true ? getUploadDisabledMessage() : undefined
     = getUploadDisabledMessage()

// getUploadDisabledMessage() returns:
if (message) { return message; }  // "Report uploaded, awaiting nurse review" ✅
```

**Handler (if somehow triggered):**
```tsx
if (!false) {  // if (true)
  showToast("Report uploaded, awaiting nurse review");
  return;  // UPLOAD BLOCKED ✅
}
```

**File Input:**
```tsx
disabled = false || true = true  // DISABLED ✅
```

**Result:** ✅ Upload blocked when pending

---

## Scenario 4: Uploaded – Upload Blocked ✅

**State:**
```typescript
latestAssessment = {
  workflow: {
    status: "uploaded",
    can_upload: false,
    message: "Dr. Sharma is reviewing your report",
    released: false
  }
}
```

**Logic Evaluation:**
```tsx
canUploadReport = false !== false = false
```

**Button:**
```tsx
disabled = true  // DISABLED ✅
```

**Subtitle:**
```tsx
"Dr. Sharma is reviewing your report" ✅
```

**Tooltip:**
```tsx
getUploadDisabledMessage() returns message: "Dr. Sharma is reviewing your report" ✅
```

**Handler:**
```tsx
if (!false) {  // if (true)
  showToast("Dr. Sharma is reviewing your report");
  return;  // UPLOAD BLOCKED ✅
}
```

**Result:** ✅ Upload blocked during review

---

## Scenario 5: Rejected with can_upload: true – Upload Allowed ✅

**State:**
```typescript
latestAssessment = {
  workflow: {
    status: "rejected",
    can_upload: true,  // Backend allows re-upload
    message: "Report quality insufficient",
    rejection_reason: "Blood sample image is blurry. Please retake in good lighting.",
    released: false
  }
}
```

**Logic Evaluation:**
```tsx
canUploadReport = true !== false
                = true
```

**Button:**
```tsx
disabled = false || !true
         = false || false
         = false  // ENABLED ✅
```

**Subtitle:**
```tsx
{true 
  ? "Complete laboratory report · PDF, JPG, PNG up to 10 MB"
  : (...)}

// Result: "Complete laboratory report · PDF, JPG, PNG up to 10 MB" ✅
```

**Tooltip:**
```tsx
title={!true ? ... : undefined}
     = false ? ... : undefined
     = undefined  // No tooltip (button enabled) ✅
```

**Handler:**
```tsx
if (!true) { ... }  // if (false) - NOT EXECUTED
// Continues to upload ✅
```

**getUploadDisabledMessage() Logic (if called):**
```tsx
const { status, message, rejection_reason } = workflow;

if (status === "rejected" && rejection_reason) {
  return rejection_reason;  // "Blood sample image is blurry..." ✅
}
```

**Result:** ✅ User can re-upload corrected report

---

## Scenario 6: Declined – Upload Blocked ✅

**State:**
```typescript
latestAssessment = {
  workflow: {
    status: "declined",
    can_upload: false,
    message: "You declined this report",
    released: false
  }
}
```

**Logic Evaluation:**
```tsx
canUploadReport = false !== false = false
```

**Button:**
```tsx
disabled = true  // DISABLED ✅
```

**Subtitle:**
```tsx
"You declined this report" ✅
```

**Tooltip:**
```tsx
"You declined this report" ✅
```

**Handler:**
```tsx
if (!false) {  // if (true)
  showToast("You declined this report");
  return;  // UPLOAD BLOCKED ✅
}
```

**Result:** ✅ Upload blocked after decline

---

## Scenario 7: Released – Upload Blocked ✅

**State:**
```typescript
latestAssessment = {
  workflow: {
    status: "released",
    can_upload: false,
    message: "Report approved and signed by Dr. Deshmukh",
    released: true
  }
}
```

**Logic Evaluation:**
```tsx
canUploadReport = false !== false = false
```

**Button:**
```tsx
disabled = true  // DISABLED ✅
```

**Subtitle:**
```tsx
"Report approved and signed by Dr. Deshmukh" ✅
```

**Tooltip:**
```tsx
"Report approved and signed by Dr. Deshmukh" ✅
```

**Handler:**
```tsx
if (!false) {  // if (true)
  showToast("Report approved and signed by Dr. Deshmukh");
  return;  // UPLOAD BLOCKED ✅
}
```

**Result:** ✅ Upload blocked after release

---

## Scenario 8: Upload Already In Progress – Duplicate Prevented ✅

**State:**
```typescript
uploadingFile = true
workflow = { can_upload: true }
```

**Button:**
```tsx
disabled={uploadingFile || !canUploadReport}
       = true || false
       = true  // DISABLED ✅
```

**Handler (Line 2458):**
```tsx
const handleDirectFileUpload = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  e.target.value = "";

  if (uploadingFile) return;  // EARLY RETURN ✅
  
  // Workflow check never reached
  if (!canUploadReport) { ... }
  
  // Upload logic never reached
}
```

**File Input:**
```tsx
disabled = true || false = true  // DISABLED ✅
```

**Result:** ✅ Duplicate upload prevented by uploadingFile check

---

## UI and Handler Enforcement Verification

### Button Protection (3 Layers)

**Layer 1: Disabled Prop (Line 6782)**
```tsx
disabled={uploadingFile || !canUploadReport}
```
- Prevents click when disabled
- Visual feedback (grayed out)
- CSS prevents interaction

**Layer 2: Click Handler Guard (Line 6784)**
```tsx
onClick={() => {
  if (!canUploadReport) {
    showToast(getUploadDisabledMessage());
    return;
  }
  // ... trigger file input
}}
```
- Extra check in case disabled bypassed
- Shows user-friendly toast
- Prevents file input trigger

**Layer 3: File Input Disabled (Line 7546)**
```tsx
disabled={uploadingFile || !canUploadReport}
```
- Prevents file selection
- Double guard against bypass

### Handler Protection (Line 2460)

**Early Guard:**
```tsx
const handleDirectFileUpload = async (e) => {
  // ... get file
  
  if (uploadingFile) return;
  
  // Phase 3: Check workflow permission before upload
  if (!canUploadReport) {
    showToast(getUploadDisabledMessage());
    return;
  }
  
  // ... validation and upload
}
```

**Protection:**
- Runs BEFORE all other validation
- Runs BEFORE size/format checks
- Runs BEFORE API call
- Cannot be bypassed

### Both Enforce Same Permission ✅

**Button uses:** `!canUploadReport`  
**Handler uses:** `!canUploadReport`  
**File input uses:** `!canUploadReport`

**Source:** Same variable `canUploadReport` (Line 2420)

**Consistency:** ✅ All three use identical logic

---

## All 8 Scenarios: VERIFIED ✅

| # | Scenario | can_upload | Button | Handler | File Input | Status |
|---|----------|------------|--------|---------|------------|--------|
| 1 | No assessment | N/A (true) | Enabled ✅ | Allows ✅ | Enabled ✅ | **PASS** |
| 2 | Legacy (no workflow) | N/A (true) | Enabled ✅ | Allows ✅ | Enabled ✅ | **PASS** |
| 3 | Pending | false | Disabled ✅ | Blocks ✅ | Disabled ✅ | **PASS** |
| 4 | Uploaded | false | Disabled ✅ | Blocks ✅ | Disabled ✅ | **PASS** |
| 5 | Rejected | **true** | Enabled ✅ | Allows ✅ | Enabled ✅ | **PASS** |
| 6 | Declined | false | Disabled ✅ | Blocks ✅ | Disabled ✅ | **PASS** |
| 7 | Released | false | Disabled ✅ | Blocks ✅ | Disabled ✅ | **PASS** |
| 8 | Upload in progress | N/A | Disabled ✅ | Early return ✅ | Disabled ✅ | **PASS** |

---

## Verification Status: ✅ ALL SCENARIOS PASS

**Code reviewed:** Lines 2420, 2460, 6782, 7546  
**Logic verified:** Truth tables, evaluation traces  
**Protection layers:** 3 (button disabled, click handler, file input)  
**Consistency:** ✅ UI and handler use same `canUploadReport` variable  

**Date:** January 14, 2025  
**Verified by:** Code-level analysis

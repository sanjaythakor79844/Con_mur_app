# Workflow Implementation - Phase 1 Complete

**Date:** January 14, 2025  
**Status:** ✅ API Integration Complete  

---

## Phase 1: API Integration - COMPLETE

### Files Modified

**1. `src/lib/aaha-api.ts`**
   - Added 3 new interfaces
   - Updated 1 existing interface
   - Added 3 new API functions
   - Updated 1 existing function

### Changes Made

#### 1. New Interfaces Added (Lines 101-120)

```typescript
export interface WorkflowStatus {
  state: string;
  status: "pending" | "uploaded" | "rejected" | "declined" | "released";
  message?: string;
  can_upload: boolean;
  rejection_reason?: string;
  released: boolean;
}

export interface Nurse {
  nurse_id: string;
  full_name: string;
  centre_name?: string;
  ready?: boolean;
}
```

#### 2. Updated Assessment Interface (Line 138)

```typescript
export interface Assessment {
  // ... existing fields
  workflow?: WorkflowStatus;  // ← ADDED
  _raw?: any;
}
```

#### 3. Updated `listAssessments()` Function (Line 1172)

```typescript
return reports.map((r: any) => {
  // ... existing mapping
  workflow: r.workflow || undefined,  // ← ADDED
  _raw: r,
});
```

#### 4. New Workflow API Functions (Lines 1124-1175)

```typescript
/**
 * Get list of available nurses for workflow assignment
 * Uses existing BLOOD_REPORT_API_BASE (sdrsnwzwka-el.a.run.app)
 */
export async function listNurses(): Promise<{ nurses: Nurse[]; ready: boolean }>

/**
 * Assign a nurse to current patient
 * Uses existing BLOOD_REPORT_API_BASE
 */
export async function assignMyNurse(nurseId: string): Promise<void>

/**
 * Get currently assigned nurse for patient
 * Uses existing BLOOD_REPORT_API_BASE
 */
export async function getMyNurse(): Promise<Nurse | null>
```

---

## API Routing Verification

### Backend Configuration

✅ **Existing Configuration Preserved:**
```typescript
// Main AAHA Backend (Backend 2)
export const API_BASE = "https://aaha-api-405281288207.asia-south1.run.app/api/v2"

// Blood Report Backend (Backend 1) - Used for workflow APIs
export const BLOOD_REPORT_API_BASE = "https://aaha-api-sdrsnwzwka-el.a.run.app/api/v2"

// Feature Backend (Backend 3)
const FEATURE_API_BASE = "https://aaha-feature-backend.onrender.com/api/v2"
```

### API Function Routing

| Function | Endpoint | Backend Used | Routing Parameter |
|----------|----------|--------------|-------------------|
| `listNurses()` | GET /workflow/nurses | BLOOD_REPORT_API_BASE | "blood_report" |
| `assignMyNurse()` | POST /workflow/my-nurse | BLOOD_REPORT_API_BASE | "blood_report" |
| `getMyNurse()` | GET /workflow/my-nurse | BLOOD_REPORT_API_BASE | "blood_report" |
| `listAssessments()` | GET /reports/me | API_BASE (default) | (none) |

✅ **All workflow functions use existing `BLOOD_REPORT_API_BASE` as confirmed by backend developer**

---

## Authentication

✅ **Using Existing Firebase Authentication:**

All functions use:
```typescript
const headers = await apiHeaders();
```

Which returns:
```typescript
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <firebase-id-token>"
}
```

No new authentication system created.

---

## Error Handling

### `listNurses()`
- Returns `{ nurses: [], ready: false }` on error
- Logs warning but doesn't throw
- Allows signup to continue without nurse selection

### `assignMyNurse()`
- Throws on error (409 will be handled in UI layer)
- Allows UI to handle 409 Conflict gracefully

### `getMyNurse()`
- Returns `null` on error
- Silent failure for optional feature

---

## TypeScript Validation

✅ **No TypeScript errors in modified code:**
```bash
npx tsc --noEmit
```

Pre-existing errors in other files remain unchanged.

---

## Backward Compatibility

✅ **All existing functionality preserved:**
- Existing API endpoints unchanged
- Existing backend routing unchanged
- Existing authentication unchanged
- New fields are optional (`workflow?:`)
- Old reports without workflow will show `undefined`

---

## API Contract Compliance

### GET /reports/me Response Structure

✅ **Now parses workflow field:**
```typescript
{
  reports: [{
    report_id: string,
    // ... existing fields
    workflow: {                    // ← NEW (optional)
      state: string,
      status: "pending" | "uploaded" | "rejected" | "declined" | "released",
      message?: string,
      can_upload: boolean,
      rejection_reason?: string,
      released: boolean
    }
  }]
}
```

### GET /workflow/nurses Response Structure

✅ **Expected format:**
```typescript
{
  nurses: [
    {
      nurse_id: string,
      full_name: string,
      centre_name?: string,
      ready?: boolean
    }
  ],
  ready?: boolean
}
```

### POST /workflow/my-nurse Request Body

✅ **Expected format:**
```typescript
{
  nurse_id: string
}
```

### GET /workflow/my-nurse Response Structure

✅ **Expected format:**
```typescript
{
  nurse: {
    nurse_id: string,
    full_name: string,
    centre_name?: string,
    ready?: boolean
  }
}
```

---

## Next Steps

### Phase 2: Report Workflow UI (Ready to Implement)

**Tasks:**
1. Display workflow status in report list
2. Show workflow.message exactly as returned
3. Display 5 status badges (pending/uploaded/rejected/declined/released)
4. Show rejection_reason when status is rejected

### Phase 3: Blood Report Upload (Ready to Implement)

**Tasks:**
1. Add upload guard checking `workflow.can_upload`
2. Show upload button only when allowed
3. Refresh `/reports/me` after successful upload

### Phase 4: PDF Visibility (Ready to Implement)

**Tasks:**
1. Show PDF button only when `report_pdf_url` exists
2. Guard PDF access with `workflow.released`
3. Preserve old kiosk PDF functionality

### Phase 5: Nurse Selection in Signup (Ready to Implement)

**Tasks:**
1. Add nurse dropdown in signup flow
2. Call `POST /workflow/my-nurse` after profile creation
3. Handle 409 gracefully
4. Allow signup without nurse if list unavailable

---

## Testing Checklist

### API Integration Tests (Not Yet Run)

- [ ] Call `listNurses()` with valid token
- [ ] Call `assignMyNurse()` with nurse_id
- [ ] Call `getMyNurse()` for assigned nurse
- [ ] Call `listAssessments()` and verify workflow field parsed
- [ ] Test 409 response handling
- [ ] Test error handling for failed API calls

### Will be tested in Phase 2+ UI implementation

---

## Git Diff Summary

```diff
Files changed: 1
 src/lib/aaha-api.ts | 66 insertions(+)
 
Additions:
+ WorkflowStatus interface (15 lines)
+ Nurse interface (6 lines)
+ Assessment.workflow field (1 line)
+ listAssessments workflow parsing (1 line)
+ listNurses() function (16 lines)
+ assignMyNurse() function (13 lines)
+ getMyNurse() function (14 lines)
```

---

## Restrictions Compliance

✅ **All restrictions followed:**
- [x] Used existing API client (aaha-api.ts)
- [x] Used existing Firebase authentication
- [x] Used existing backend URLs
- [x] Used existing `apiFetch()` routing
- [x] No duplicate API client created
- [x] No unrelated code modified
- [x] No commit/push performed yet
- [x] Preserved three-backend architecture
- [x] No changes to AWIS calculations
- [x] No changes to Liv styling

---

## Phase 1 Status: ✅ COMPLETE

**Ready for Phase 2:** Report Workflow UI Implementation

**Blockers:** None

**Approval Required:** Proceed to Phase 2?

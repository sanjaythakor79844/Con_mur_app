# Phase 5 Inspection Report: Nurse Selection in Signup Flow

**Date:** 2026-09-14  
**Objective:** Locate signup flow, understand patient creation timing, and plan nurse selection integration

---

## Executive Summary

✅ **Inspection Complete**

The signup flow has two stages:
1. **Stage 1 (lines 3280-3499):** User fills signup form → Client validation → Shows "welcome" screen
2. **Stage 2 (lines 2817-2912):** User signs in → Completes profile form → `handleSaveProfile` creates patient via POST /api/v2/patients

**Key Finding:** Patient creation happens AFTER successful authentication, not during initial signup form submission. This is the correct place to integrate nurse selection.

---

## 1. Signup Flow Architecture

### 1.1 Initial Signup Form (Stage 1)
**Location:** `src/routes/liv.tsx` lines 3280-3499  
**View State:** `currentView === "signup"`

**Form Fields:**
- Full name (`fullName` state)
- Mobile number (`phoneNumber` state) 
- Email (`email` state)
- Age (`age` state)
- Sex (`sex` state: "Female" | "Male" | "Other")
- Consent checkbox (`consentGiven` state)

**Submit Handler:** `handleSubmitSignup` (line 2587)
- Validates 5 fields client-side
- No API calls
- Sets `currentView="welcome"` on success

### 1.2 Welcome Screen (Intermediate)
**Location:** Lines 3501-3580  
**View State:** `currentView === "welcome"`
- Shows "Account created" message
- Explains AIWS score concept
- "Continue to sign in" button → `currentView="signin"`

### 1.3 Sign In Flow (Stage 2 Authentication)
**Location:** Lines 3582+ (sign in screens)
- User authenticates via Mobile OTP or Google
- Firebase auth provides JWT token
- `apiService.setToken(token)` called
- Sets `currentView="main"`

### 1.4 Profile Completion (Stage 2 Patient Creation)
**Location:** `handleSaveProfile` function, lines 2817-2912

```typescript
const handleSaveProfile = async (e?: React.FormEvent) => {
  // ... validation ...
  
  if (activePatient?.patient_id && !isUnlinkedPatient) {
    // UPDATE: Existing patient
    await apiService.updateMyProfile({ ... });
  } else {
    // CREATE: First-time patient (THIS IS WHERE WE INTEGRATE)
    const phoneToUse = session?.phoneNumber || ...;
    await apiService.createPatient({
      full_name: trimmedName,
      mobile_number: phoneToUse,
      age: parsedAge,
      gender: editGender.toLowerCase(),
    });
    sonnerToast.success("Profile created and linked to your account");
  }
  
  void qc.invalidateQueries({ queryKey: ["my-profile"] });
}
```

**Current API Call:** `apiService.createPatient(...)` (line 2896)  
**API Definition:** `src/lib/api-service.ts` line 132

---

## 2. Patient Creation API Analysis

### 2.1 Current Implementation
**File:** `src/lib/api-service.ts` line 132

```typescript
async createPatient(params: {
  mobile_number: string;
  full_name: string;
  age: number;
  gender: string;
  referred_by?: string;
}): Promise<{ patient_id: string; mobile_number: string }> {
  const { data } = await this.api.post<{ patient_id: string; mobile_number: string }>(
    "/patients",
    params
  );
  return data;
}
```

**Returns:** `{ patient_id: string; mobile_number: string }`

### 2.2 Backend Requirements (Phase 5)
After successful POST /api/v2/patients:
1. **If nurse selected:** Call `POST /api/v2/workflow/my-nurse` with `{ nurse_id }`
2. **Handle 409 Conflict:** Nurse already assigned (graceful, no error toast)
3. **Handle nurse API failures:** Allow signup to continue (fail-open)

---

## 3. Nurse Selection UI Requirements

### 3.1 When to Show Nurse Dropdown
**Option A (Recommended):** Add nurse dropdown to **profile completion form**
- Location: Profile edit form (where `editName`, `editAge`, `editGender` are edited)
- Timing: Before user submits profile for first-time patient creation
- UX: Nurse selection is part of profile setup, optional field

**Option B (Alternative):** Add nurse dropdown to **initial signup form**
- Location: Signup form (line 3280-3499)
- Timing: Before user sees "welcome" screen
- Challenge: No auth token yet, cannot call GET /workflow/nurses
- Would require storing selection and using it later after auth

**Decision:** **Option A** is technically superior because:
- We have auth token when profile form is shown
- Can call GET /workflow/nurses API immediately
- Natural UX flow: complete profile → assign nurse
- Fail-open: If API fails, profile creation still succeeds

### 3.2 Profile Form Location
**Finding in Progress:** Need to locate where profile edit form is rendered (contains `editName`, `editAge`, `editGender` inputs)

**Search Strategy:**
```typescript
// Look for editName state variable
// Look for editGender state variable
// Look for isEditingProfile state
// Look for form that calls handleSaveProfile
```

---

## 4. Integration Points

### 4.1 State Variables Needed
```typescript
const [nurses, setNurses] = useState<Nurse[]>([]);
const [selectedNurseId, setSelectedNurseId] = useState<string | null>(null);
const [nursesLoading, setNursesLoading] = useState(false);
const [nursesError, setNursesError] = useState<string | null>(null);
```

### 4.2 Load Nurses Function
```typescript
const loadNurses = async () => {
  setNursesLoading(true);
  setNursesError(null);
  try {
    const nurseList = await aahaAPI.listNurses();
    setNurses(nurseList);
  } catch (err) {
    console.error("Failed to load nurses:", err);
    setNursesError("Could not load nurse list");
    // Fail-open: Continue without nurses
  } finally {
    setNursesLoading(false);
  }
};
```

**When to call:** 
- When profile edit form opens for first-time patient
- Check: `!activePatient?.patient_id || isUnlinkedPatient`

### 4.3 Modified handleSaveProfile
```typescript
const handleSaveProfile = async (e?: React.FormEvent) => {
  // ... existing validation ...
  
  setProfileSaving(true);
  try {
    if (activePatient?.patient_id && !isUnlinkedPatient) {
      // UPDATE: Existing patient
      await apiService.updateMyProfile({ ... });
    } else {
      // CREATE: First-time patient
      const result = await apiService.createPatient({ ... });
      
      // NEW: Assign nurse if selected
      if (selectedNurseId) {
        try {
          await aahaAPI.assignMyNurse(selectedNurseId);
          console.log("✅ Nurse assigned successfully");
        } catch (err: any) {
          if (err?.response?.status === 409) {
            console.log("ℹ️ Nurse already assigned");
            // Graceful: No error toast for 409
          } else {
            console.error("Failed to assign nurse:", err);
            // Fail-open: Don't block profile creation
          }
        }
      }
      
      sonnerToast.success("Profile created and linked to your account");
    }
    
    // ... existing cleanup ...
  } catch (err: any) {
    // ... existing error handling ...
  } finally {
    setProfileSaving(false);
  }
};
```

### 4.4 Nurse Dropdown Component
```tsx
{/* Add to profile form, before submit button */}
{(!activePatient?.patient_id || isUnlinkedPatient) && (
  <div className="field">
    <label htmlFor="f-nurse">Preferred Nurse (Optional)</label>
    {nursesLoading ? (
      <div className="inp" style={{ color: "var(--muted)" }}>
        Loading nurses...
      </div>
    ) : nursesError ? (
      <div className="inp" style={{ color: "var(--muted)" }}>
        {nursesError}
      </div>
    ) : nurses.length === 0 ? (
      <div className="inp" style={{ color: "var(--muted)" }}>
        No nurses available
      </div>
    ) : (
      <select
        id="f-nurse"
        className="inp"
        value={selectedNurseId || ""}
        onChange={(e) => setSelectedNurseId(e.target.value || null)}
      >
        <option value="">-- No preference --</option>
        {nurses.map((nurse) => (
          <option key={nurse.nurse_id} value={nurse.nurse_id}>
            {nurse.full_name}
          </option>
        ))}
      </select>
    )}
  </div>
)}
```

---

## 5. Next Steps

### 5.1 Immediate Action Required
**Find Profile Edit Form:**
- Search for `editName` input field
- Search for `editGender` select/buttons
- Search for form that submits to `handleSaveProfile`
- Confirm this is where first-time patients complete their profile

### 5.2 Implementation Checklist
- [ ] Locate profile edit form in liv.tsx
- [ ] Add 4 state variables (nurses, selectedNurseId, loading, error)
- [ ] Add loadNurses() function (fail-open)
- [ ] Call loadNurses() when profile form opens for new patient
- [ ] Add nurse dropdown to profile form UI
- [ ] Modify handleSaveProfile to call assignMyNurse() after createPatient()
- [ ] Handle 409 gracefully (no error toast)
- [ ] Handle nurse API failures (fail-open, allow profile creation)
- [ ] Test 4 scenarios:
  1. Nurse selected + assignment succeeds
  2. Nurse selected + 409 conflict
  3. Nurse API fails + profile creation succeeds
  4. No nurse selected (skip assignment)

### 5.3 Verification Steps
1. Review diff of changes
2. Run TypeScript check: `npm run type-check`
3. Run production build: `npm run build`
4. Test all 4 scenarios manually in browser
5. Commit with message: `feat: add nurse selection to signup profile form`

---

## 6. Profile Form Location ✅ FOUND

**Location:** `src/routes/liv.tsx` lines **6970-7034**  
**Context:** Profile settings sheet (`activeSheet === "profile"`)

### 6.1 Form Structure
```tsx
{!isEditingProfile ? (
  // Display-only view with "Edit Profile" button
  <div>...</div>
) : (
  // Editable form (THIS IS WHERE WE ADD NURSE DROPDOWN)
  <form onSubmit={handleSaveProfile}>
    <div className="field">
      <label htmlFor="edit-name">Full name</label>
      <input id="edit-name" value={editName} ... />
    </div>
    
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      <div className="field">
        <label htmlFor="edit-age">Age</label>
        <input id="edit-age" value={editAge} ... />
      </div>
      
      <div className="field">
        <label>Sex</label>
        <div className="seg">
          {/* Female/Male/Other buttons */}
        </div>
      </div>
    </div>
    
    {/* 🎯 INSERT NURSE DROPDOWN HERE (line ~7029) */}
    
    <button type="submit">
      {profileSaving ? "Saving..." : activePatient?.patient_id ? "Update Profile" : "Save Profile"}
    </button>
  </form>
)}
```

### 6.2 Trigger Condition
**Form opens when:**
- User doesn't have `activePatient?.patient_id` (first-time patient)
- User clicks "Edit Profile" button (sets `isEditingProfile = true`)

**Load nurses when:**
```typescript
useEffect(() => {
  if (isEditingProfile && (!activePatient?.patient_id || isUnlinkedPatient)) {
    loadNurses();
  }
}, [isEditingProfile, activePatient?.patient_id, isUnlinkedPatient]);
```

### 6.3 Insertion Point
**Line ~7029:** Between gender field and submit button

```tsx
{/* NEW: Nurse selection for first-time patients */}
{(!activePatient?.patient_id || isUnlinkedPatient) && (
  <div className="field">
    <label htmlFor="edit-nurse">Preferred Nurse (Optional)</label>
    {nursesLoading ? (
      <div className="inp" style={{ color: "var(--liv-sub)" }}>
        Loading nurses...
      </div>
    ) : nursesError ? (
      <div className="inp" style={{ color: "var(--liv-sub)" }}>
        Nurse list unavailable
      </div>
    ) : nurses.length === 0 ? (
      <div className="inp" style={{ color: "var(--liv-sub)" }}>
        No nurses available
      </div>
    ) : (
      <select
        id="edit-nurse"
        className="inp"
        value={selectedNurseId || ""}
        onChange={(e) => setSelectedNurseId(e.target.value || null)}
      >
        <option value="">-- No preference --</option>
        {nurses.map((nurse) => (
          <option key={nurse.nurse_id} value={nurse.nurse_id}>
            {nurse.full_name}
          </option>
        ))}
      </select>
    )}
  </div>
)}
```

---

## 7. Complete Implementation Plan

### 7.1 Code Changes Summary

**File:** `src/routes/liv.tsx`

**A. Add State Variables** (after line 1443, with other profile states)
```typescript
const [nurses, setNurses] = useState<Nurse[]>([]);
const [selectedNurseId, setSelectedNurseId] = useState<string | null>(null);
const [nursesLoading, setNursesLoading] = useState(false);
const [nursesError, setNursesError] = useState<string | null>(null);
```

**B. Add Import** (at top of file)
```typescript
import { aahaAPI, type Nurse } from "@/lib/aaha-api";
```

**C. Add loadNurses Function** (after state declarations, ~line 1500)
```typescript
const loadNurses = async () => {
  setNursesLoading(true);
  setNursesError(null);
  try {
    const nurseList = await aahaAPI.listNurses();
    setNurses(nurseList);
  } catch (err) {
    console.error("Failed to load nurses:", err);
    setNursesError("Could not load nurse list");
    // Fail-open: Continue without nurses
  } finally {
    setNursesLoading(false);
  }
};
```

**D. Add useEffect Hook** (after other useEffects, ~line 1600)
```typescript
useEffect(() => {
  if (isEditingProfile && (!activePatient?.patient_id || isUnlinkedPatient)) {
    void loadNurses();
  }
}, [isEditingProfile, activePatient?.patient_id, isUnlinkedPatient]);
```

**E. Modify handleSaveProfile** (line 2892-2899, in else block)
```typescript
} else {
  // CREATE: First-time patient
  const phoneToUse = session?.phoneNumber || (phoneNumber ? "+91" + phoneNumber.replace(/\D/g, "") : "");
  await apiService.createPatient({
    full_name: trimmedName,
    mobile_number: phoneToUse,
    age: parsedAge,
    gender: editGender.toLowerCase(),
  });
  
  // NEW: Assign nurse if selected
  if (selectedNurseId) {
    try {
      await aahaAPI.assignMyNurse(selectedNurseId);
      console.log("✅ Nurse assigned successfully");
    } catch (err: any) {
      if (err?.response?.status === 409) {
        console.log("ℹ️ Nurse already assigned (409)");
        // Graceful: No error toast for 409
      } else {
        console.error("⚠️ Failed to assign nurse:", err);
        // Fail-open: Don't block profile creation
      }
    }
  }
  
  sonnerToast.success("Profile created and linked to your account");
}
```

**F. Add Nurse Dropdown UI** (line ~7029, before submit button)
```tsx
{/* Nurse selection for first-time patients */}
{(!activePatient?.patient_id || isUnlinkedPatient) && (
  <div className="field">
    <label htmlFor="edit-nurse">Preferred Nurse (Optional)</label>
    {nursesLoading ? (
      <div className="inp" style={{ color: "var(--liv-sub)" }}>
        Loading nurses...
      </div>
    ) : nursesError ? (
      <div className="inp" style={{ color: "var(--liv-sub)" }}>
        Nurse list unavailable
      </div>
    ) : nurses.length === 0 ? (
      <div className="inp" style={{ color: "var(--liv-sub)" }}>
        No nurses available
      </div>
    ) : (
      <select
        id="edit-nurse"
        className="inp"
        value={selectedNurseId || ""}
        onChange={(e) => setSelectedNurseId(e.target.value || null)}
      >
        <option value="">-- No preference --</option>
        {nurses.map((nurse) => (
          <option key={nurse.nurse_id} value={nurse.nurse_id}>
            {nurse.full_name}
          </option>
        ))}
      </select>
    )}
  </div>
)}
```

### 7.2 Test Scenarios

1. ✅ **Nurse selected + assignment succeeds**
   - First-time patient opens profile form
   - Nurse list loads successfully
   - User selects nurse from dropdown
   - User submits profile
   - Patient created → Nurse assigned → Success

2. ✅ **Nurse selected + 409 conflict**
   - Same as above, but nurse already assigned
   - Console logs "ℹ️ Nurse already assigned (409)"
   - No error toast shown to user
   - Profile creation succeeds

3. ✅ **Nurse API fails + profile creation succeeds**
   - Nurse list API fails (network error, 500, etc.)
   - Shows "Nurse list unavailable"
   - User can still submit profile
   - Profile creation succeeds
   - Nurse assignment skipped (fail-open)

4. ✅ **No nurse selected**
   - User leaves dropdown at "-- No preference --"
   - User submits profile
   - Patient created
   - Nurse assignment skipped (selectedNurseId is null)

5. ✅ **Existing patient updates profile**
   - activePatient?.patient_id exists
   - Nurse dropdown NOT shown
   - Only name/age/gender can be updated
   - No nurse assignment logic triggered

---

## Status

✅ **Phase 5 Inspection: COMPLETE**

**Ready for implementation with 6 code changes across 1 file.**

---

## Next Action

**Awaiting approval to implement Phase 5:**
1. Review the 6 code changes (A-F) above
2. Confirm approach (fail-open, optional nurse, 409 handling)
3. Upon approval, implement all changes in single commit
4. Test 5 scenarios
5. Run TypeScript check + production build
6. Commit: `feat: add nurse selection to signup profile form`

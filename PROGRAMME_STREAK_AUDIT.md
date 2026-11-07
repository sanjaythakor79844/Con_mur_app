# Programme & Streak Values Audit

**Date:** January 14, 2025  
**Status:** 🔴 **HARDCODED DEMO VALUES FOUND**

---

## Summary

| Feature | Status | Source | Issue |
|---------|--------|--------|-------|
| **Programme Day Number** | ⚠️ Calculated | Hardcoded start date | Using fixed date: Sept 18, 2026 |
| **Programme Length** | ⚠️ Variable | Frontend state (90/120/180 days) | Not from backend |
| **Programme Title** | ⚠️ Mixed | Backend CarePlan OR Hardcoded fallback | Fallback: "Metabolic Reset" |
| **Streak** | 🔴 **HARDCODED** | Fixed value: `6` | **NOT TRACKING REAL USER ACTIVITY** |
| **Nutrition Plans** | ✅ Backend | `latestAssessment.nutrition_plans` | From kiosk report |
| **Therapy Plans** | ✅ Backend | `latestAssessment.therapy_plan` | From kiosk report |

---

## Detailed Analysis

### 1. Programme Day Number

**Line:** liv.tsx:2303-2310

```typescript
// HARDCODED START DATE
const planStart = new Date(2026, 8, 18);  // Sept 18, 2026
const [dayNumber, setDayNumber] = useState(1);

useEffect(() => {
  // Calculate from fixed start date
  const calculated = Math.max(1, Math.min(effectivePlanLen, 
    Math.floor((Date.now() - planStart.getTime()) / 864e5) + 1));
  setDayNumber(calculated);
}, [effectivePlanLen]);
```

**Issue:** 🔴 **CRITICAL**
- Fixed demo start date: September 18, 2026
- Sabhi users ke liye same date se calculate hota hai
- Real enrollment date backend से नहीं आ रहा

**Should Be:**
```typescript
// Real implementation should use:
const planStart = new Date(patient.programme_enrollment_date);
// या
const planStart = new Date(careplan.created_at);
```

**Display Location:** 
- Home dashboard: "Programme: **34** / 90 · level 2"
- Care tab: "Day **34** of 90 · re-test in 56 days"

---

### 2. Streak Value

**Line:** liv.tsx:2315

```typescript
const streak = 6;  // 🔴 HARDCODED!
```

**Display Location:** liv.tsx:3945

```tsx
<span className="k">Streak</span>
<div>
  <span className="num" id="streak">6</span>  {/* Fixed value! */}
  <span className="unit">days</span>
</div>
```

**Issue:** 🔴 **CRITICAL**
- Hardcoded fixed value: `6`
- Har user ko same streak दिखता है
- No backend API call for real user activity
- No tracking of actual consecutive days

**Should Track:**
- Consecutive days user checked in
- Consecutive days habits completed
- Consecutive days goals met
- Reset to 0 if user misses a day

**Required Backend API:**
```typescript
GET /patients/me/activity-streak
Response: {
  current_streak: number,
  longest_streak: number,
  last_activity_date: string
}
```

---

### 3. Programme Title

**Line:** liv.tsx:2131-2140

```typescript
const programmeTitle = useMemo(() => {
  // Priority 1: Backend CarePlan (✅ Real data)
  if (session && activeCarePlan?.consultation_summary) {
    return activeCarePlan.consultation_summary;
  }
  // Priority 2: PDF available (✅ Real data)
  if (extractedPdfData) {
    return "Longevity Baseline & Health Optimisation";
  }
  // Priority 3: Fallback (🔴 Hardcoded)
  return "Metabolic Reset";
}, [session, activeCarePlan, extractedPdfData]);
```

**Status:** ⚠️ **PARTIAL**
- ✅ Uses backend `activeCarePlan.consultation_summary` if available
- ⚠️ Fallback to hardcoded "Metabolic Reset" if no care plan

**Display Location:** liv.tsx:4674
```tsx
{programmeTitle}, {Math.round(effectivePlanLen / 7)} weeks. 
{milestones.filter((m) => m[2]).length} of {milestones.length} milestones reached.
```

---

### 4. Programme Length

**Line:** liv.tsx:1358

```typescript
const effectivePlanLen = useMemo(() => {
  // Doctor-prescribed length from active care plan
  if (session && activeCarePlan?.follow_up?.duration_days) {
    return activeCarePlan.follow_up.duration_days;
  }
  // Default to 90 days
  return 90;
}, [session, activeCarePlan]);
```

**Status:** ⚠️ **PARTIAL**
- ✅ Uses backend `activeCarePlan.follow_up.duration_days` if available
- ⚠️ Default: 90 days
- UI allows manual change (90/120/180) but this is "demo" feature (line 7021)

---

### 5. Nutrition Plans (✅ Working)

**Line:** liv.tsx:2180-2185

```typescript
// From Kiosk Report
if (Array.isArray(latestAssessment.nutrition_plans) && 
    latestAssessment.nutrition_plans.length > 0) {
  latestAssessment.nutrition_plans.forEach((np: any, idx: number) => {
    const title = np.title || "Nutrition Plan";
    const detail = Array.isArray(np.points) 
      ? np.points.slice(0, 2).join("; ") 
      : "From your kiosk health assessment";
    kioskItems.push([`kiosk_np_${idx}`, title, detail]);
  });
}
```

**Backend API Path:**
```typescript
GET /reports/me
Response: {
  reports: [{
    report_data: {
      nutrition_plans: [
        {
          title: string,
          points: string[]
        }
      ]
    }
  }]
}
```

**Status:** ✅ **WORKING**
- Real data from kiosk longevity report
- Backend field: `report_data.nutrition_plans`
- Properly mapped in aaha-api.ts line 1165

---

### 6. Therapy Plans (✅ Working)

**Line:** liv.tsx:2175-2179

```typescript
// From Kiosk Report
if (Array.isArray(latestAssessment.therapy_plan) && 
    latestAssessment.therapy_plan.length > 0) {
  latestAssessment.therapy_plan.forEach((tp: string, idx: number) => {
    kioskItems.push([`kiosk_tp_${idx}`, tp, 
      "From your kiosk health assessment"]);
  });
}
```

**Backend API Path:**
```typescript
GET /reports/me
Response: {
  reports: [{
    report_data: {
      therapy_plan: string[]
    }
  }]
}
```

**Status:** ✅ **WORKING**
- Real data from kiosk longevity report
- Backend field: `report_data.therapy_plan`
- Properly mapped in aaha-api.ts line 1166

---

## Dashboard Display Breakdown

### Home Screen Dashboard

```tsx
<div className="facts">
  <div>
    <span className="k">Programme</span>
    <div>
      <span className="num">{dayNumber}</span>  {/* 🔴 Calculated from hardcoded date */}
      <span className="unit">/ {effectivePlanLen} · level {planLevel[0]}</span>
    </div>
  </div>
  <div>
    <span className="k">Streak</span>
    <div>
      <span className="num" id="streak">6</span>  {/* 🔴 HARDCODED */}
      <span className="unit">days</span>
    </div>
  </div>
</div>
```

### Care Tab Display

```tsx
{renderHeader(
  `Your ${effectivePlanLen} days`,  {/* ⚠️ From CarePlan or default 90 */}
  `Day ${dayNumber} of ${effectivePlanLen} · re-test in ${effectivePlanLen - dayNumber} days`
)}

{/* Programme Title */}
{programmeTitle}, {Math.round(effectivePlanLen / 7)} weeks.
{/* ⚠️ From CarePlan or fallback "Metabolic Reset" */}
```

---

## Critical Issues Summary

### 🔴 Issue #1: Streak is Hardcoded

**Current:** `const streak = 6;`

**Impact:** 
- All users see same streak value
- No real user activity tracking
- Misleading users about their engagement

**Fix Required:**
1. Backend: Create activity tracking table
2. Backend: Add `/patients/me/activity-streak` endpoint
3. Frontend: Replace hardcoded value with API call

### 🔴 Issue #2: Programme Start Date is Fixed

**Current:** `const planStart = new Date(2026, 8, 18);`

**Impact:**
- All users see same day number
- Real enrollment date ignored
- Incorrect milestones and progress

**Fix Required:**
1. Backend: Return `programme_enrollment_date` in patient profile or care plan
2. Frontend: Use real date instead of hardcoded Sept 18, 2026

### ⚠️ Issue #3: Programme Title Fallback

**Current:** Fallback to "Metabolic Reset" if no care plan

**Impact:** Medium - Shows generic title without personalized care plan

**Fix Required:**
- Backend: Always create care plan on kiosk report generation
- Or: Use patient's primary health goal from assessment

---

## Backend API Requirements

### Required New Endpoints

#### 1. Activity Streak API

```typescript
GET /patients/me/activity-streak

Response: {
  current_streak: number,          // Consecutive days
  longest_streak: number,          // All-time best
  last_activity_date: string,      // ISO date
  streak_history: {
    date: string,
    completed: boolean
  }[]
}
```

#### 2. Programme Enrollment API

Add to existing patient profile or care plan:

```typescript
GET /patients/me

Response: {
  patient_id: string,
  // ... existing fields
  programme_enrollment_date: string,  // ISO date when user enrolled
  programme_length_days: number,       // 90, 120, or 180
  current_programme_day: number        // Calculated server-side
}
```

Or in Care Plan:

```typescript
GET /care-plan

Response: {
  carePlans: [{
    // ... existing fields
    enrollment_date: string,
    programme_length: number,
    current_day: number
  }]
}
```

---

## Recommendations

### Priority 1: CRITICAL (Fix Immediately)

1. **🔴 Remove Hardcoded Streak**
   - Line: liv.tsx:2315
   - Action: Either integrate real activity API or hide streak display
   - Status: **MISLEADING USERS**

2. **🔴 Fix Programme Start Date**
   - Line: liv.tsx:2303
   - Action: Use real enrollment date from backend
   - Status: **INCORRECT DAY NUMBERS FOR ALL USERS**

### Priority 2: HIGH (Next Sprint)

3. **⚠️ Backend: Add Activity Tracking**
   - Create streak calculation logic
   - Track daily check-ins
   - Track habit completion
   - Return current streak in API

4. **⚠️ Backend: Add Programme Enrollment Date**
   - Store enrollment date per patient
   - Return in patient profile or care plan API
   - Calculate current_day server-side for consistency

### Priority 3: MEDIUM (Enhancement)

5. **📊 Replace Programme Length UI Controls**
   - Remove demo manual controls (90/120/180 buttons)
   - Use only backend-prescribed length
   - Lock it unless doctor changes it

6. **🎯 Always Create Care Plan on Kiosk Report**
   - Auto-generate care plan from kiosk assessment
   - Populate programme title, goals, nutrition
   - Avoid fallback to "Metabolic Reset"

---

## Code Locations Reference

| Feature | File | Line | Status |
|---------|------|------|--------|
| Programme Start Date | liv.tsx | 2303 | 🔴 Hardcoded |
| Streak Value | liv.tsx | 2315 | 🔴 Hardcoded |
| Day Number Calculation | liv.tsx | 2308 | 🔴 Uses hardcoded start |
| Programme Title | liv.tsx | 2131-2140 | ⚠️ Partial backend |
| Programme Length | liv.tsx | 1358 | ⚠️ Partial backend |
| Nutrition Plans | liv.tsx | 2180-2185 | ✅ Backend |
| Therapy Plans | liv.tsx | 2175-2179 | ✅ Backend |
| Milestones | liv.tsx | 2331-2346 | ⚠️ Calculated from hardcoded day |
| Progress Ring | liv.tsx | 4667 | ⚠️ Uses calculated day |
| Streak Display (Home) | liv.tsx | 3945 | 🔴 Shows hardcoded 6 |
| Programme Display (Home) | liv.tsx | 3938 | 🔴 Shows calculated day |

---

## Testing Evidence

### Live App Inspection

When logged in, users see:
- **Programme:** Shows varying day numbers based on current date minus Sept 18, 2026
- **Streak:** Always shows `6 days` for every user
- **Programme Title:** Shows care plan title if exists, else "Metabolic Reset"

### Expected Behavior

When logged in, users **should** see:
- **Programme:** Their actual days since **their** enrollment date
- **Streak:** Their actual consecutive activity days (0 to N)
- **Programme Title:** Personalized from their care plan

---

## Conclusion

### Data Quality: 4/10 for Programme/Streak

**What Works:** ✅
- Nutrition plans from backend
- Therapy plans from backend
- Programme title from care plan (when available)

**Critical Issues:** 🔴
- **Streak is completely fake** (hardcoded 6)
- **Day number is wrong for everyone** (fixed start date)
- **No real user activity tracking**

### Immediate Action Required

1. Backend team: Add activity streak tracking
2. Backend team: Store programme enrollment date per patient
3. Frontend team: Remove or clearly label hardcoded demo values
4. Consider hiding Programme/Streak until real implementation ready

---

**Audit By:** Kiro AI Agent  
**Date:** January 14, 2025  
**Status:** Awaiting approval for fixes

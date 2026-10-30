# AAHA Consumer App - Empty State Audit Report

**Date**: September 14, 2026
**Scope**: Complete UI audit of all screens in liv.tsx

## Executive Summary

Conducted comprehensive audit of the AAHA Consumer App (Liv interface) to identify all instances of confusing empty state placeholders. Found **11 locations** displaying `"--"` that need proper empty state treatment.

## Issues Found

### 1. Home Tab - Hero Card

#### Issue 1.1: AIWS Score (Line ~3666)
**Current State**:
```typescript
{latestAssessment && typeof latestAssessment.score === "number" && latestAssessment.score > 0
  ? Math.round(latestAssessment.score)
  : "--"}
```
**Problem**: Shows `"--"` with "AIWS" label
**Impact**: Looks broken, unclear what AIWS means or why it's missing
**Location**: Home tab → Hero card → AIWS ring display

#### Issue 1.2: Biological Age (Line ~3680)
**Current State**:
```typescript
{verifiedBiologicalAge != null
  ? String(verifiedBiologicalAge)
  : "--"}
```
**Problem**: Shows `"-- vs 25"` comparison - very confusing
**Impact**: Comparison to chronological age without biological age value is meaningless
**Location**: Home tab → Hero card → Biological age display

**Current Message** (Line ~3686):
- When no biomarkers: "Kiosk assessment recorded. Biological age requires comprehensive biomarker panel."
- This is good but the `"--"` above it is still confusing

### 2. Markers Tab - Kiosk Vitals

#### Issue 2.1: Heart Rate (Line ~4062)
**Current State**:
```typescript
{normalizedReadings.heartRate.value ?? (session ? "--" : "68")}
```
**Problem**: Shows `"-- bpm"` when no value
**Impact**: User sees incomplete measurement
**Location**: Markers tab → Kiosk vitals card → Heart rate button

#### Issue 2.2: Blood Pressure (Line ~4071)
**Current State**:
```typescript
{normalizedReadings.bloodPressure.display || (session ? "--" : "122 / 81")}
```
**Problem**: Shows `"-- mmHg"` when no value
**Impact**: User sees incomplete measurement
**Location**: Markers tab → Kiosk vitals card → Blood pressure button

### 3. Markers Tab - Body Scan

#### Issue 3.1: Posture Score (Line ~4120)
**Current State**:
```typescript
{normalizedReadings.bodyScan.posture.score ??
  (normalizedReadings.bodyScan.posture.allNormal ? "100" : session ? "--" : "72")}
```
**Problem**: Shows `"-- / 100"` when no posture scan
**Impact**: Score out of 100 with no numerator is confusing
**Location**: Markers tab → Body scan card → Posture button
**Note**: There IS a fallback message: "Posture scan not recorded in this check-up"

#### Issue 3.2: BMI (Line ~4144)
**Current State**:
```typescript
{normalizedReadings.bodyScan.bmi ?? (session ? "--" : "26.4")}
```
**Problem**: Shows `"--"` (no unit displayed)
**Location**: Markers tab → Body scan card → BMI button

#### Issue 3.3: Body Fat (Line ~4151)
**Current State**:
```typescript
{normalizedReadings.bodyScan.bodyFat ?? (session ? "--" : "36.2")}
```
**Problem**: Shows `"-- %"` when no value
**Location**: Markers tab → Body scan card → Body fat button

#### Issue 3.4: Waist (Line ~4158)
**Current State**:
```typescript
{normalizedReadings.bodyScan.waist ?? (session ? "--" : "88")}
```
**Problem**: Shows `"-- cm"` when no value
**Location**: Markers tab → Body scan card → Waist button

### 4. Markers Tab - Fitness Markers

#### Issue 4.1: VO₂max (Line ~4173)
**Current State**:
```typescript
{normalizedReadings.fitness.vo2.value ?? (session ? "--" : "28.4")}
```
**Problem**: Shows `"-- mL/kg/min"` when no value
**Impact**: Scientific unit without value is confusing
**Location**: Markers tab → Fitness card → VO₂max button
**Note**: Has fallback label: "Not recorded"

#### Issue 4.2: HRV (Line ~4183)
**Current State**:
```typescript
{normalizedReadings.fitness.hrv.value ?? (session ? "--" : "38")}
```
**Problem**: Shows `"-- ms"` when no value
**Location**: Markers tab → Fitness card → HRV button
**Note**: Has fallback label: "Not recorded"

#### Issue 4.3: Reaction Time (Line ~4213)
**Current State**:
```typescript
{normalizedReadings.fitness.reactionTime.value ?? (session ? "--" : "312")}
```
**Problem**: Shows `"-- ms"` when no value
**Location**: Markers tab → Fitness card → Reaction time button
**Note**: Has fallback label: "Not recorded"

## Good Empty States Found (No Changes Needed)

### ✅ Markers Tab - No Report Yet
**Lines 3907-3929**: Proper empty state card with:
- Heading: "Your biomarkers appear here"
- Explanation: "Fetch your longevity report..."
- Action buttons: "Get my longevity report" and "Upload a lab report"

### ✅ Markers Tab - No Assessments
**Lines 4005-4029**: Proper empty state when authenticated but no data:
- Heading: "Your health readings will appear here"
- Explanation: "Complete a screening at an Aaha Health Kiosk..."
- Action buttons: "Check for updates" and "Book a kiosk screening"

### ✅ Plan Tab - No Report Yet
**Lines 4279-4297**: Proper empty state:
- Heading: "Your plan is built from your report"
- Explanation: "Fetch your longevity report..."
- Action buttons

### ✅ Care Tab - No Upcoming Appointments
**Lines 4611-4614**: Clean empty state:
- Message: "No visits booked. Your next step is one tap away."
- Followed by "Book a visit" button

## Data States Analysis

### Current State Handling
The app correctly handles:
1. **Loading states**: Shows loading indicators
2. **No data (unauthenticated)**: Shows demo/sample data (e.g., "68" for heart rate)
3. **No data (authenticated)**: Shows `"--"` ← **THIS IS THE PROBLEM**
4. **Has data**: Shows actual values

### Proposed State Handling
For authenticated users with no data, replace `"--"` with:
1. **Option A - Inline empty state**: "Not recorded" or "Not available"
2. **Option B - Preserve UI but improve message**: Keep numeric display area but show clear text
3. **Option C - Hide button**: Don't show measurement buttons if no data exists

## Recommendations

### Priority 1: Critical (Breaking UX)
1. **Biological Age "-- vs 25"**: Most confusing - fix immediately
2. **AIWS Score "--"**: Main app metric - needs clear messaging

### Priority 2: High (Biomarkers with "--")
3. Heart Rate
4. Blood Pressure
5. BMI, Body Fat, Waist
6. VO₂max, HRV, Reaction Time

### Design Approach

#### For AIWS Score and Biological Age (Hero Card)
Replace `"--"` with proper empty state card or informative text:

**Option 1 - Inline message**:
```
AIWS Score: "Not yet calculated"
Subtitle: "Requires blood biomarker panel"
```

**Option 2 - Preserve ring visual but improve**:
```
Keep ring at 0% (gray)
Center: "N/A" or empty
Label below: "Awaiting blood tests"
```

#### For Individual Biomarkers (Vitals, Body Scan, Fitness)
Since these already have "Not recorded" labels in some cases, standardize:

**Current inconsistency**:
- Some show: `"-- bpm"` (number display)
- Some show: `"-- bpm"` + label "Not recorded" (redundant)

**Proposed**:
- Number area: "--" → "—" (em dash, cleaner)
- OR: Remove dash, show only "Not recorded" in the status area
- OR: Gray out the button and show "Not recorded" in the label area

#### For Comparison Values (Biological Age vs Chronological Age)
When biological age is null:
- **Current**: `"-- vs 25"`
- **Proposed**: Hide comparison entirely, OR show only chronological age with context

### Technical Approach

1. **Don't change data fetching logic** - API responses stay the same
2. **Don't change calculations** - Clinical formulas untouched
3. **Only change display logic** - UI rendering improvements
4. **Preserve existing empty state cards** - They're already good
5. **Add TypeScript null checks** - Ensure proper handling

## Sections NOT Needing Changes

✅ **Plan Tab**: Already has proper empty states and good data display
✅ **Care Tab**: Appointments empty state is clean
✅ **Markers Tab Empty State Cards**: Well-designed empty states when no report exists
✅ **Report View**: Uses proper fallback messages
✅ **Loading States**: Properly handled throughout
✅ **Error States**: Appropriate error handling exists

## Implementation Priority

### Phase 1: Hero Card (Most Visible)
- [ ] Fix AIWS score `"--"` display
- [ ] Fix Biological Age `"-- vs 25"` display
- [ ] Improve supporting text

### Phase 2: Vital Signs
- [ ] Heart Rate
- [ ] Blood Pressure

### Phase 3: Body Measurements
- [ ] BMI
- [ ] Body Fat
- [ ] Waist
- [ ] Posture

### Phase 4: Fitness Markers
- [ ] VO₂max
- [ ] HRV
- [ ] Reaction Time

## Testing Checklist

After implementation:
- [ ] Unauthenticated user: See demo data (no changes)
- [ ] Authenticated, no assessments: See improved empty states (not `"--"`)
- [ ] Authenticated, with kiosk data: See actual data (no changes)
- [ ] Authenticated, partial data: See mix of values and improved empty states
- [ ] Loading state: See loading indicators (no changes)
- [ ] Mobile layout: All improvements responsive
- [ ] Accessibility: Screen readers announce proper empty state messages
- [ ] TypeScript build: No errors
- [ ] No visual regressions on data-populated views

## Compliance

- ✅ No backend changes
- ✅ No API modifications
- ✅ No database updates
- ✅ No Firebase auth changes
- ✅ No clinical calculation changes
- ✅ UI-only improvements
- ✅ Existing empty state cards preserved
- ✅ Demo data for unauthenticated users unchanged

## Files to Modify

1. `src/routes/liv.tsx` - All 11 empty state improvements (lines noted above)
2. No other files need changes

## Estimated Impact

**Lines of code changed**: ~30-50 lines
**Components affected**: Hero card, Vitals card, Body scan card, Fitness card
**User-facing improvement**: Elimination of all confusing `"--"` placeholders
**Risk level**: Low (UI-only, well-isolated changes)

---

**Next Step**: Proceed with Phase 1 implementation (Hero Card fixes)

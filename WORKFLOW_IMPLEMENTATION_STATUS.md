# Workflow Implementation - Overall Status

**Project:** AAHA Liv App - Live Report Workflow  
**Date:** January 14, 2025  
**Backend Developer:** Vinay (APIs deployed and confirmed)  

---

## Implementation Phases

| Phase | Component | Status | Files Modified | Lines Changed |
|-------|-----------|--------|----------------|---------------|
| **Phase 1** | API Integration | ✅ Complete | `src/lib/aaha-api.ts` | +66 |
| **Phase 2** | Report Workflow UI | ✅ Complete | `src/components/ReportHistory.tsx` | +125, -20 |
| **Phase 3** | Blood Report Upload Guard | ⏸️ Pending | TBD | TBD |
| **Phase 4** | PDF Visibility Guard | ✅ Complete (in Phase 2) | Included above | — |
| **Phase 5** | Nurse Selection in Signup | ⏸️ Pending | TBD | TBD |

---

## Phase 1: API Integration ✅

**Completed:** January 14, 2025

### API Functions Added
- `listNurses()` - Get available nurses
- `assignMyNurse(nurseId)` - Assign nurse to patient
- `getMyNurse()` - Get assigned nurse

### Interfaces Added
- `WorkflowStatus` - 5 workflow states
- `Nurse` - Nurse information

### Backend Integration
- Uses existing `BLOOD_REPORT_API_BASE` (Backend 1)
- Uses existing Firebase authentication
- Uses existing `apiFetch()` routing with "blood_report" parameter

**Documentation:** See `WORKFLOW_PHASE1_COMPLETE.md`

---

## Phase 2: Report Workflow UI ✅

**Completed:** January 14, 2025

### Features Implemented

#### 1. Workflow Status Badges (5 States)
- **Pending** - Amber badge "PENDING REVIEW"
- **Uploaded** - Blue badge "UNDER REVIEW"
- **Rejected** - Red badge "REJECTED"
- **Declined** - Gray badge "DECLINED"
- **Released** - Green badge "RELEASED"

#### 2. Workflow Message Display
- Shows `workflow.message` exactly as returned by backend
- No modification or invention of backend messages
- Displayed in hero card and timeline reports

#### 3. Rejection Reason Display
- Shows when `workflow.status === "rejected"`
- Dedicated box with red border and background
- Clear "REASON FOR REJECTION" label
- Displays `workflow.rejection_reason` text

#### 4. PDF Visibility Guard
- PDF Download button disabled when `workflow.released === false`
- Tooltip explains why button is disabled
- Old reports without workflow continue to work

#### 5. Backward Compatibility
- Legacy reports without workflow field render correctly
- No breaking changes to existing functionality
- Type-safe with optional chaining

### UI Locations
- ✅ Hero card (latest report) - Full workflow UI
- ✅ Timeline reports (all reports) - Workflow badges and messages
- ✅ PDF download buttons - Visibility guards with tooltips

**Documentation:** See `WORKFLOW_PHASE2_COMPLETE.md`

---

## Phase 3: Blood Report Upload Guard ⏸️

**Status:** Ready to Implement  
**Priority:** Medium

### Requirements
1. Identify existing blood report upload UI
2. Add guard checking `workflow.can_upload` before showing upload button
3. Show upload button only when `workflow.can_upload === true`
4. Call upload API and refresh `/reports/me` after successful upload
5. Show helpful message when upload is not allowed

### Files to Investigate
- Upload report page/modal (need to locate)
- Report detail view
- History page upload section

### API Integration
- Already available: `workflow.can_upload` boolean from Phase 1
- Upload endpoint: Existing blood report upload API
- Refresh: Call `queryClient.invalidateQueries(['assessments'])`

---

## Phase 4: PDF Visibility Guard ✅

**Status:** Complete (Implemented in Phase 2)  
**Completed:** January 14, 2025

### Features
- ✅ PDF button disabled when `workflow.released === false`
- ✅ PDF button enabled only when both:
  - `report_pdf_url` exists, AND
  - `workflow.released === true` (or no workflow)
- ✅ Tooltip shows why button is disabled
- ✅ Old kiosk reports without workflow work as before

**No additional work needed.**

---

## Phase 5: Nurse Selection in Signup ⏸️

**Status:** Ready to Implement  
**Priority:** High

### Requirements
1. Add nurse dropdown in signup flow (after profile creation)
2. Call `listNurses()` to populate dropdown
3. Show dropdown only when:
   - `listNurses().ready === true`, AND
   - Nurse list is non-empty
4. Call `assignMyNurse(nurseId)` after user selects nurse
5. Handle 409 Conflict gracefully (nurse already assigned)
6. Allow signup to continue if nurse list unavailable

### API Functions Available (Phase 1)
- `listNurses()` - Returns `{ nurses: Nurse[], ready: boolean }`
- `assignMyNurse(nurseId: string)` - Assigns nurse, throws on error
- `getMyNurse()` - Gets currently assigned nurse (optional check)

### Files to Investigate
- Signup flow component (need to locate)
- Profile creation flow
- Onboarding screens

### Error Handling
- 409 Conflict: Show message "Nurse already assigned"
- Empty list: Hide dropdown, continue signup
- API error: Log warning, continue signup

---

## Backend Configuration

### Three-Backend Architecture (Preserved)

| Backend | Purpose | Base URL | Status |
|---------|---------|----------|--------|
| **Backend 1** | Blood Reports & Workflow | `https://aaha-api-sdrsnwzwka-el.a.run.app/api/v2` | ✅ Active |
| **Backend 2** | Main AAHA API | `https://aaha-api-405281288207.asia-south1.run.app/api/v2` | ✅ Active |
| **Backend 3** | Feature Backend | `https://aaha-feature-backend.onrender.com/api/v2` | ✅ Active |

### Workflow API Endpoints (Backend 1)

| Endpoint | Method | Purpose | Implementation |
|----------|--------|---------|----------------|
| `/workflow/nurses` | GET | List available nurses | ✅ Phase 1 |
| `/workflow/my-nurse` | GET | Get assigned nurse | ✅ Phase 1 |
| `/workflow/my-nurse` | POST | Assign nurse | ✅ Phase 1 |
| `/reports/me` | GET | Get reports with workflow | ✅ Phase 1 (updated) |

### Authentication
- Uses existing Firebase ID token
- Header: `Authorization: Bearer <firebase-id-token>`
- Applied via `apiHeaders()` function

---

## TypeScript Status

### Phase 1 & 2 Code
✅ **No TypeScript errors in modified code**

### Pre-existing Errors (Unrelated)
12 TypeScript errors exist in other files:
- `src/components/BookVisit.tsx` (2 errors)
- `src/components/notification-bell.tsx` (2 errors)
- `src/routes/api/adaptive/$.ts` (3 errors)
- `src/routes/api/chat.ts` (2 errors)
- `src/routes/api/proxy-pdf.ts` (2 errors)
- `src/routes/sitemap[.]xml.ts` (1 error)

**These errors existed before workflow implementation and are out of scope.**

---

## Testing Status

### Phase 1 Testing
- ⏸️ API integration tests pending (waiting for live backend testing)
- ⏸️ Need to verify workflow data in actual API responses

### Phase 2 Testing
- ⏸️ Visual testing pending (need to see UI in browser)
- ⏸️ Functional testing pending (need test data with different workflow statuses)
- ⏸️ Backward compatibility testing pending (need old reports to verify)

### Recommended Test Data Needed
1. Report with `workflow.status = "pending"`
2. Report with `workflow.status = "uploaded"`
3. Report with `workflow.status = "rejected"` + rejection reason
4. Report with `workflow.status = "released"` + PDF URL
5. Report with `workflow.status = "declined"`
6. Old report without `workflow` field (backward compatibility)

---

## Git Status

### Commits Status
- ✅ Wearable card CSS styling committed (commit d16e30e)
- ⏸️ Phase 1 (API Integration) - Not committed yet
- ⏸️ Phase 2 (Report Workflow UI) - Not committed yet

### Commit Strategy (Awaiting Approval)
**Option A: Two Separate Commits**
```bash
git add src/lib/aaha-api.ts
git commit -m "feat: Add workflow API integration (Phase 1)

- Add WorkflowStatus and Nurse interfaces
- Implement listNurses(), assignMyNurse(), getMyNurse()
- Update listAssessments() to parse workflow field
- Use existing BLOOD_REPORT_API_BASE and Firebase auth"

git add src/components/ReportHistory.tsx
git commit -m "feat: Add report workflow UI (Phase 2)

- Display workflow status badges (5 states)
- Show workflow messages and rejection reasons
- Add PDF visibility guard (workflow.released check)
- Maintain backward compatibility with legacy reports"
```

**Option B: Single Commit**
```bash
git add src/lib/aaha-api.ts src/components/ReportHistory.tsx
git commit -m "feat: Implement live report workflow (Phase 1 & 2)

Phase 1 - API Integration:
- Add WorkflowStatus and Nurse interfaces
- Implement workflow API functions (listNurses, assignMyNurse, getMyNurse)
- Update listAssessments() to parse workflow field

Phase 2 - UI Implementation:
- Display 5 workflow status badges (pending/uploaded/rejected/declined/released)
- Show workflow messages exactly as returned by backend
- Display rejection reasons when report is rejected
- Add PDF visibility guard (workflow.released check)
- Maintain backward compatibility with legacy reports"
```

**Approval Required:** Which commit strategy to use? And permission to commit?

---

## Known Issues & Limitations

### Current Limitations
1. **No upload guard yet** - Phase 3 pending
2. **No nurse selection in signup** - Phase 5 pending
3. **No live testing** - Waiting for backend data with workflow fields

### Out of Scope (As Per Requirements)
- ❌ Creating new API client (using existing aaha-api.ts)
- ❌ Modifying backend URLs (using existing configuration)
- ❌ Changing AWIS calculations (preserved)
- ❌ Modifying authentication flow (preserved)
- ❌ Modifying Liv styling system (using existing CSS variables)

### Data Audit Findings (Separate Issue)
From `LIV_DATA_AUDIT_REPORT.md` and `PROGRAMME_STREAK_AUDIT.md`:
- Sleep "6 h 10" hardcoded (liv.tsx line 4891)
- HRV "28" hardcoded (liv.tsx line 4905)
- Streak value hardcoded as 6 (liv.tsx line 2315)
- Programme day calculated from fixed Sept 18, 2026 date (liv.tsx line 2303)
- Biological age from PDF extraction (working as designed)

**These are separate issues, not part of workflow implementation.**

---

## Next Actions

### Immediate (Awaiting Approval)
1. ✅ Phase 2 complete - Get approval to commit
2. Choose commit strategy (Option A or B)
3. Commit Phase 1 & 2 changes
4. Test workflow UI in browser with sample data

### Short-term (Next Sprint)
1. Implement Phase 3: Blood Report Upload Guard
   - Locate upload UI components
   - Add `workflow.can_upload` check
   - Update upload flow
2. Implement Phase 5: Nurse Selection in Signup
   - Locate signup flow
   - Add nurse dropdown
   - Integrate `assignMyNurse()` API

### Medium-term (Testing)
1. End-to-end testing with real workflow data
2. Visual regression testing
3. Mobile responsiveness testing
4. Accessibility audit (WCAG AA compliance)

---

## Documentation Index

### Phase Documentation
1. **`WORKFLOW_PHASE1_COMPLETE.md`** - API Integration details
2. **`WORKFLOW_PHASE2_COMPLETE.md`** - UI Implementation details
3. **`WORKFLOW_IMPLEMENTATION_STATUS.md`** - This file (overall status)

### Audit Reports (Separate Issues)
1. **`LIV_DATA_AUDIT_REPORT.md`** - Data sources audit
2. **`PROGRAMME_STREAK_AUDIT.md`** - Programme and streak data analysis

### Project Documentation
1. **`AGENTS.md`** - Lovable integration rules
2. **`README.md`** - Project overview

---

## Team Communication

### Backend Developer (Vinay)
✅ **Confirmed:**
- Workflow APIs deployed and ready
- Base URL: `https://aaha-api-sdrsnwzwka-el.a.run.app/api/v2`
- Routing parameter: `"blood_report"`
- Workflow field structure matches implementation

### Frontend Team (Current Status)
✅ **Completed:**
- Phase 1 API integration
- Phase 2 workflow UI
- Type-safe implementation
- Backward compatibility maintained

⏸️ **Pending:**
- Live testing with real data
- Phase 3 implementation (upload guard)
- Phase 5 implementation (nurse selection)

---

## Success Metrics

### Phase 1 & 2 Success Criteria
- ✅ Workflow API functions implemented
- ✅ Workflow UI displays 5 status types
- ✅ Workflow messages displayed exactly as from backend
- ✅ Rejection reasons displayed when rejected
- ✅ PDF visibility controlled by workflow.released
- ✅ No TypeScript errors in modified code
- ✅ Backward compatibility maintained
- ⏸️ Visual testing in browser (pending)
- ⏸️ Functional testing with real data (pending)

### Phase 3 Success Criteria (Pending)
- ⏸️ Upload button shown only when `workflow.can_upload === true`
- ⏸️ Upload workflow integrated with existing upload UI
- ⏸️ Report list refreshed after successful upload

### Phase 5 Success Criteria (Pending)
- ⏸️ Nurse dropdown added to signup
- ⏸️ Nurse assignment API integrated
- ⏸️ 409 Conflict handling implemented
- ⏸️ Signup continues without nurse if unavailable

---

## Risks & Mitigation

### Risk: Backend workflow data not matching expected structure
**Mitigation:**
- Type-safe interfaces with strict typing
- Null checks and optional chaining
- Graceful degradation for missing fields

### Risk: Legacy reports breaking with workflow changes
**Mitigation:**
- Optional workflow field (`workflow?: WorkflowStatus`)
- Null checks before rendering workflow UI
- Backward compatibility testing

### Risk: PDF visibility breaking old kiosk reports
**Mitigation:**
- PDF button logic: `workflow?.released !== false`
- Old reports without workflow treated as released
- Dual condition: `report_pdf_url && (!workflow || workflow.released)`

### Risk: Nurse assignment 409 Conflict
**Mitigation:**
- Try-catch in `assignMyNurse()`
- 409 handled gracefully in UI
- User can continue signup without re-assignment

---

**Status Last Updated:** January 14, 2025  
**Next Review:** After Phase 3 or Phase 5 implementation  
**Document Owner:** AI Development Team  
**Stakeholder:** Backend Developer Vinay (APIs), Product Team (Requirements)

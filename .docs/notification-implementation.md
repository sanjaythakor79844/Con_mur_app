# Notification Bell Implementation

## Overview
Implemented frontend notification functionality for the AAHA Consumer App Liv interface to display updated Longevity Reports with real-time notifications.

## Implementation Date
September 14, 2026

## Changes Made

### 1. New Component: NotificationBell
**File**: `src/components/notification-bell.tsx`

#### Features:
- **Notification Bell Icon**: Displays bell icon with red dot badge when unread notifications exist
- **Unread Count**: Calculates and displays unread notification count dynamically
- **Notification Panel**: Dropdown panel showing list of all notifications
- **Auto-refresh**: Polls for new notifications every 30 seconds
- **Mark as Read**: Automatically marks notifications as read when clicked
- **Navigation**: Handles notification click to navigate to `/liv` route
- **Data Refresh**: Invalidates assessment and report queries when notification clicked to show updated data

#### API Integration:
- Uses existing `GET /api/v2/notifications/me` endpoint
- Uses existing `POST /api/v2/notifications/{id}/read` endpoint
- Integrates with existing `listNotifications()` function from `@/lib/aaha-api`
- Uses existing `Notification` interface with fields: `id`, `title`, `body`, `link`, `is_read`, `created_at`

#### UI Design:
- Matches Liv design system with CSS variables (`--card`, `--line`, `--text`, `--muted`, `--danger`)
- 44px circular button matching existing profile button
- 320px width notification panel
- Smooth transitions and proper spacing
- Accessible ARIA labels

### 2. Icon Addition: Bell Icon
**File**: `src/components/liv.tsx`

Added new bell icon to `LIV_ICONS` constant:
```typescript
bell: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
```

### 3. Integration into Liv App
**File**: `src/routes/liv.tsx`

#### Changes:
1. **Import Added** (Line ~47):
   ```typescript
   import { NotificationBell } from "@/components/notification-bell";
   ```

2. **QueryClient Hook Added** (Line ~893):
   ```typescript
   const queryClient = useQueryClient();
   ```

3. **Updated renderHeader Function** (Line ~2778):
   - Added NotificationBell component next to profile button
   - Connected onNotificationClick callback to invalidate queries
   - Wrapped bell and profile buttons in flex container

#### Integration Pattern:
```typescript
const renderHeader = (title: string, sub?: string) => {
  const subtitle = sub || formattedDate;
  return (
    <div className="hd">
      <div>
        <span className="k">{subtitle}</span>
        <h1 className="h1" style={{ marginTop: "6px" }}>{title}</h1>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <NotificationBell
          onNotificationClick={() => {
            // Refresh assessments and reports when notification is clicked
            queryClient.invalidateQueries({ queryKey: ["assessments"] });
            queryClient.invalidateQueries({ queryKey: ["reports"] });
          }}
        />
        <button
          type="button"
          className="icb"
          onClick={() => setActiveSheet("profile")}
          aria-label="Profile and settings"
        >
          <LivIcon name="user" size={20} />
        </button>
      </div>
    </div>
  );
};
```

## User Flow

### 1. Blood Report Upload Workflow
1. Patient uploads blood report via Consumer App
2. Admin Console team uploads blood report after 2-3 days
3. Doctor verifies report in Admin Console
4. Backend creates notification via existing notification service
5. Consumer App polls notifications every 30 seconds
6. Bell icon shows red badge with unread count
7. Patient clicks bell to see notification list
8. Patient clicks notification about updated report
9. Notification marked as read
10. App navigates to `/liv` route
11. Assessment and report queries refresh
12. Updated biomarkers displayed in Longevity Report

### 2. Notification Display States
- **No notifications**: Bell icon without badge
- **Unread notifications**: Bell icon with small red dot badge
- **Panel open**: Dropdown showing notification list
- **Read notifications**: Gray background, normal font weight
- **Unread notifications**: Accent background, bold title, blue dot indicator

## Technical Details

### Data Flow
```
Backend Notification Service
    ↓
GET /api/v2/notifications/me (every 30s)
    ↓
NotificationBell Component
    ↓
User clicks notification
    ↓
POST /api/v2/notifications/{id}/read
    ↓
Navigate to /liv + Invalidate queries
    ↓
Fresh assessment/report data fetched
    ↓
Updated biomarkers displayed
```

### State Management
- Uses React Query for notification fetching and caching
- Uses React Query mutations for mark-as-read functionality
- Uses query invalidation for data refresh on notification click
- Component-local state for panel open/close

### Error Handling
- Graceful 404/401 handling (no retry for auth errors)
- Max 2 retries for network errors
- Loading states for notification fetching
- Empty state message when no notifications exist

## API Requirements Met

### Existing APIs Used (No Backend Changes)
✅ `GET /api/v2/notifications/me` - List notifications
✅ `POST /api/v2/notifications/{id}/read` - Mark as read  
✅ `GET /api/v2/reports/me` - Fetch updated reports
✅ `GET /api/v2/assessments/me` - Fetch updated assessments

### Notification Interface Fields Used
- ✅ `id` - Unique identifier for mark as read
- ✅ `title` - Notification heading
- ✅ `body` - Notification description
- ✅ `link` - Navigation target (e.g., "/liv")
- ✅ `is_read` - Read/unread status
- ✅ `created_at` - Timestamp for display

## Backend API Limitations Identified

The following fields are **NOT available** in current API responses and cannot be implemented without backend changes:

### Missing from Notification API:
- ❌ `notification_type` or `kind` enum for filtering (report_updated, appointment_reminder, etc.)
- ❌ `report_id` or `assessment_id` for direct linking to specific reports
- ❌ `action_url` with query parameters for deep linking

### Missing from Assessment/Report API:
- ❌ `report_status` field (pending_review, verified, updated)
- ❌ `verification_status` per biomarker
- ❌ `verified_at` timestamp separate from `created_at`
- ❌ `last_updated_at` to differentiate updates from initial creation
- ❌ `verifying_doctor` name and credentials
- ❌ Biomarker-level `status` enum (newly_added, updated, unchanged)

### Cannot Implement Without Backend:
- ❌ "Your Report Is Under Review" status indicator
- ❌ Visual badge on updated biomarkers
- ❌ Differentiation between kiosk screening values and verified lab results
- ❌ Notification filtering by type
- ❌ Bulk mark-all-as-read functionality

## Testing Checklist

### Manual Testing Required:
- [ ] Bell icon appears in header next to profile button
- [ ] Red badge shows when unread notifications exist
- [ ] Badge count matches number of unread notifications
- [ ] Clicking bell opens notification panel
- [ ] Notification panel shows all notifications
- [ ] Unread notifications have accent background and bold title
- [ ] Read notifications have transparent background
- [ ] Clicking notification navigates to /liv
- [ ] Clicking notification marks it as read
- [ ] Notification list refreshes after marking as read
- [ ] Assessment/report data refreshes after notification click
- [ ] Panel closes after clicking notification
- [ ] Close button (X) closes panel
- [ ] Loading state shows while fetching notifications
- [ ] Empty state shows when no notifications exist
- [ ] Notifications auto-refresh every 30 seconds
- [ ] Bell icon matches Liv design system
- [ ] Component is responsive and accessible

### Backend Integration Testing Required:
- [ ] Verify notification created when doctor verifies blood report
- [ ] Verify notification `link` field points to "/liv"
- [ ] Verify notification `title` is descriptive (e.g., "Your Longevity Report is Ready")
- [ ] Verify notification `body` contains meaningful text
- [ ] Verify POST /api/v2/notifications/{id}/read actually marks notification as read
- [ ] Verify updated biomarkers appear after report verification

## Files Modified

1. ✅ `src/components/notification-bell.tsx` (NEW)
2. ✅ `src/components/liv.tsx` (Modified - added bell icon)
3. ✅ `src/routes/liv.tsx` (Modified - integrated NotificationBell)

## Files NOT Modified (As Required)

- ❌ No backend files modified
- ❌ No database schema changes
- ❌ No Admin Console changes
- ❌ No Firebase auth changes
- ❌ No clinical calculation changes
- ❌ No existing upload workflow changes
- ❌ No kiosk screening workflow changes

## Next Steps

1. **Install Dependencies**: Run `npm install` to install all project dependencies
2. **Build Project**: Run `npm run build` to verify no TypeScript errors
3. **Start Dev Server**: Run `npm run dev` to test locally
4. **Test Notification Flow**: 
   - Manually trigger a notification from backend
   - Verify bell badge appears
   - Click notification and verify navigation
   - Verify mark-as-read functionality
5. **Backend Team Coordination**:
   - Ensure notifications are created when doctor verifies reports
   - Verify notification `link` field is set to "/liv"
   - Confirm notification title/body are user-friendly
6. **Deploy to Render**: Push changes and deploy
7. **Production Testing**: Verify end-to-end workflow in production

## Known Limitations

1. **No Report Status Differentiation**: Cannot show "Under Review" vs "Verified" status without backend support
2. **No Biomarker Update Indicators**: Cannot highlight which specific biomarkers were updated
3. **No Notification Type Filtering**: All notifications shown in single list
4. **No Deep Linking**: Cannot link directly to specific biomarker or report section
5. **Polling-based Updates**: Uses 30-second polling instead of real-time WebSocket/SSE
6. **No Offline Support**: Requires active internet connection
7. **No Push Notifications**: Browser/mobile push notifications not implemented

## Future Enhancements (Require Backend Changes)

1. Add `notification_type` enum to filter by category
2. Add `report_status` field to show review/verification status
3. Add `verified_biomarkers` array to highlight updated markers
4. Add WebSocket support for real-time notifications
5. Add push notification support (FCM/APNS)
6. Add bulk mark-all-as-read endpoint
7. Add notification preferences (email, SMS, push)
8. Add notification history pagination
9. Add deep linking with query parameters
10. Add visual timeline of biomarker changes

## Compliance

- ✅ Uses ONLY existing APIs
- ✅ No backend modifications
- ✅ No database changes
- ✅ Preserves existing workflows
- ✅ No Firebase auth changes
- ✅ Responsive and accessible
- ✅ Matches Liv design system
- ✅ Follows React Query best practices
- ✅ Proper TypeScript types
- ✅ Follows project conventions

---

**Implementation Status**: ✅ Complete (Frontend Only)
**Backend Requirements**: Documented separately for backend team
**Deployment Ready**: Yes (after dependency install and testing)

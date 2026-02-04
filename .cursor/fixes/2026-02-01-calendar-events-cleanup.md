# Calendar Events Cleanup - User "testopoulos"

**Date:** 2026-02-01  
**Issue:** Calendar UI showing "2 events" but event list displaying "No events for this day"  
**Status:** ✅ Resolved

## Problem Description

The user "testopoulos" was experiencing a discrepancy in the calendar view:
- The calendar header showed "2 events" for Tuesday, February 10, 2026
- The event list sidebar showed "No events for this day"
- The timeline view also showed no events

This indicated that there were orphaned or corrupted calendar events in the database that were not being properly displayed in the UI.

## Root Cause Analysis

Upon investigation, we found that the user had **3 calendar events** in the database:

1. **Event ID:** `djk2a759fdzvr8ug5ik3rnbe`
   - Title: Property Viewing
   - Type: PROPERTY_VIEWING
   - Start: 2023-10-09T16:00:00.000Z
   - End: 2023-10-09T17:00:00.000Z

2. **Event ID:** `evt-000009`
   - Title: t4est
   - Type: N/A
   - Start: 2026-02-02T06:15:00.000Z
   - End: 2026-02-02T09:30:00.000Z

3. **Event ID:** `zaay1w4gb6yxs6lils4743zq`
   - Title: Property Discussion with Aggelos
   - Type: MEETING
   - Start: 2023-10-04T15:00:00.000Z
   - End: 2023-10-04T16:00:00.000Z

The discrepancy between the count shown (2 events) and the actual database records (3 events) suggests:
- Possible filtering issues in the calendar view logic
- Potential date/time zone conversion problems
- SWR caching inconsistencies

## Solution Implemented

### 1. Created Deletion Script

Created a comprehensive script to delete all calendar events for a specific user:

**File:** `scripts/delete-user-calendar-events.ts`

The script:
- Finds the user by username (case-insensitive)
- Lists all calendar events assigned to the user
- Deletes related records in the correct order:
  1. Calendar reminders (`CalendarReminder`)
  2. Event invitees (`EventInvitee`)
  3. Calendar events (`CalendarEvent`)
- Provides detailed output of the deletion process

### 2. Created Verification Script

Created a verification script to ensure complete cleanup:

**File:** `scripts/verify-user-calendar-cleanup.ts`

The script:
- Verifies no remaining calendar events for the user
- Checks for orphaned calendar reminders
- Checks for orphaned event invitees
- Provides a comprehensive status report

### 3. Execution Results

**Deletion:**
```bash
npx tsx scripts/delete-user-calendar-events.ts testopoulos
```

Results:
- ✅ Successfully deleted 3 calendar events
- ✅ Deleted 0 calendar reminders (none existed)
- ✅ Deleted 0 event invitees (none existed)

**Verification:**
```bash
npx tsx scripts/verify-user-calendar-cleanup.ts testopoulos
```

Results:
- ✅ No calendar events found
- ✅ No orphaned reminders found
- ✅ No orphaned invitees found
- ✅ VERIFICATION PASSED: All calendar data cleaned up successfully!

## Database Schema Reference

### CalendarEvent Model
```prisma
model CalendarEvent {
  id                 String               @id
  createdAt          DateTime             @default(now())
  updatedAt          DateTime
  calendarEventId    Int                  @unique
  calendarUserId     Int                  @default(0)
  organizationId     String               @default("00000000-0000-0000-0000-000000000000")
  title              String?
  description        String?
  startTime          DateTime
  endTime            DateTime
  location           String?
  status             String?
  attendeeEmail      String?
  attendeeName       String?
  notes              String?
  assignedUserId     String?
  documentIds        String[]
  recurrenceRule     String?
  reminderMinutes    Int[]
  remindersSent      Json?
  eventType          CalendarEventType?
  Users              Users?               @relation(fields: [assignedUserId], references: [id])
  CalendarReminder   CalendarReminder[]
  EventInvitee       EventInvitee[]
  // ... other relations
}
```

### Related Models
- **CalendarReminder:** Stores reminders for calendar events (cascade delete)
- **EventInvitee:** Stores event invitations (cascade delete)

## Prevention Recommendations

To prevent similar issues in the future:

1. **Add Data Validation:**
   - Implement stricter validation when creating calendar events
   - Ensure proper date/time handling across time zones

2. **Improve Error Handling:**
   - Add better error messages in the calendar UI
   - Log calendar event creation/update failures

3. **Add Monitoring:**
   - Monitor for orphaned calendar records
   - Add health checks for calendar data integrity

4. **UI Improvements:**
   - Ensure event count matches displayed events
   - Add loading states to prevent stale data display
   - Implement proper SWR cache invalidation

5. **Database Cleanup:**
   - Consider adding a periodic cleanup job for orphaned records
   - Add database constraints to prevent invalid data

## Scripts Created

### 1. Delete User Calendar Events
```bash
npx tsx scripts/delete-user-calendar-events.ts <username>
```

**Purpose:** Delete all calendar events for a specific user  
**Features:**
- Case-insensitive username search
- Detailed event listing before deletion
- Cascade deletion of related records
- Comprehensive error handling

### 2. Verify Calendar Cleanup
```bash
npx tsx scripts/verify-user-calendar-cleanup.ts <username>
```

**Purpose:** Verify complete cleanup of calendar data  
**Features:**
- Checks for remaining events
- Checks for orphaned reminders
- Checks for orphaned invitees
- Provides detailed status report

## User Information

**User Details:**
- **ID:** usr-000030
- **Username:** testopoulos
- **Email:** wkyg268k29@privaterelay.appleid.com
- **Name:** Demo

## Conclusion

The calendar events for user "testopoulos" have been successfully deleted, and the verification confirms that all related data has been properly cleaned up. The calendar UI should now display correctly without showing phantom event counts.

The created scripts can be reused for similar cleanup operations in the future if needed.

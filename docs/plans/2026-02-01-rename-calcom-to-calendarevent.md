# Rename CalComEvent to CalendarEvent - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename all legacy Cal.com naming (`CalComEvent`, `calcomEventId`, `calcomUserId`) to use `CalendarEvent` naming throughout the codebase.

**Architecture:** This is a comprehensive refactoring that renames the database table, Prisma model, and all code references. The change is purely cosmetic and doesn't affect functionality - it removes legacy naming from when Cal.com was integrated.

**Tech Stack:** Prisma ORM, PostgreSQL, TypeScript, Next.js

**Scope:** 
- Prisma schema model rename
- Database migration for table/column renames
- ~198 code references across actions, API routes, components, hooks
- Environment variable examples
- Migration scripts

---

## Overview of Changes

**Database/Schema Changes:**
- Table: `CalComEvent` → `CalendarEvent`
- Column: `calcomEventId` → `calendarEventId`
- Column: `calcomUserId` → `calendarUserId`
- Relation names: `CalComEvent` → `CalendarEvent`
- Junction tables: `_DocumentsToCalComEvents` → `_DocumentsToCalendarEvents`

**Code Pattern Changes:**
- Prisma queries: `prismadb.calComEvent` → `prismadb.calendarEvent`
- Variables: `calComEvent`, `calcomEvent` → `calendarEvent`
- Types/Interfaces referencing the model
- Comments and documentation

---

## Task 1: Create Database Migration

**Files:**
- Create: `prisma/migrations/20260201000000_rename_calcom_to_calendar_event/migration.sql`

**Step 1: Create migration directory**

```bash
mkdir -p prisma/migrations/20260201000000_rename_calcom_to_calendar_event
```

**Step 2: Write migration SQL**

Create the migration file with the following SQL:

```sql
-- Rename CalComEvent table to CalendarEvent
ALTER TABLE "CalComEvent" RENAME TO "CalendarEvent";

-- Rename columns in CalendarEvent table
ALTER TABLE "CalendarEvent" RENAME COLUMN "calcomEventId" TO "calendarEventId";
ALTER TABLE "CalendarEvent" RENAME COLUMN "calcomUserId" TO "calendarUserId";

-- Rename indexes
ALTER INDEX "CalComEvent_calcomEventId_key" RENAME TO "CalendarEvent_calendarEventId_key";
ALTER INDEX "CalComEvent_assignedUserId_idx" RENAME TO "CalendarEvent_assignedUserId_idx";
ALTER INDEX "CalComEvent_eventType_idx" RENAME TO "CalendarEvent_eventType_idx";
ALTER INDEX "CalComEvent_organizationId_idx" RENAME TO "CalendarEvent_organizationId_idx";
ALTER INDEX "CalComEvent_startTime_idx" RENAME TO "CalendarEvent_startTime_idx";

-- Rename CalendarReminder relation column (already named eventId, just update constraint)
ALTER TABLE "CalendarReminder" DROP CONSTRAINT IF EXISTS "CalendarReminder_eventId_fkey";
ALTER TABLE "CalendarReminder" ADD CONSTRAINT "CalendarReminder_eventId_fkey" 
  FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rename EventInvitee relation
ALTER TABLE "EventInvitee" DROP CONSTRAINT IF EXISTS "EventInvitee_eventId_fkey";
ALTER TABLE "EventInvitee" ADD CONSTRAINT "EventInvitee_eventId_fkey" 
  FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rename crm_Accounts_Tasks relation
ALTER TABLE "crm_Accounts_Tasks" RENAME COLUMN "calcomEventId" TO "calendarEventId";
ALTER TABLE "crm_Accounts_Tasks" DROP CONSTRAINT IF EXISTS "crm_Accounts_Tasks_calcomEventId_fkey";
ALTER TABLE "crm_Accounts_Tasks" ADD CONSTRAINT "crm_Accounts_Tasks_calendarEventId_fkey" 
  FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Rename Documents relation columns
ALTER TABLE "Documents" RENAME COLUMN "linkedCalComEventsIds" TO "linkedCalendarEventsIds";

-- Rename junction table for Documents <-> CalendarEvent
ALTER TABLE "_DocumentsToCalComEvents" RENAME TO "_DocumentsToCalendarEvents";
ALTER TABLE "_DocumentsToCalendarEvents" DROP CONSTRAINT IF EXISTS "_DocumentsToCalComEvents_A_fkey";
ALTER TABLE "_DocumentsToCalendarEvents" DROP CONSTRAINT IF EXISTS "_DocumentsToCalComEvents_B_fkey";
ALTER TABLE "_DocumentsToCalendarEvents" ADD CONSTRAINT "_DocumentsToCalendarEvents_A_fkey" 
  FOREIGN KEY ("A") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_DocumentsToCalendarEvents" ADD CONSTRAINT "_DocumentsToCalendarEvents_B_fkey" 
  FOREIGN KEY ("B") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rename indexes on junction table
ALTER INDEX IF EXISTS "_DocumentsToCalComEvents_AB_unique" RENAME TO "_DocumentsToCalendarEvents_AB_unique";
ALTER INDEX IF EXISTS "_DocumentsToCalComEvents_B_index" RENAME TO "_DocumentsToCalendarEvents_B_index";

-- Rename _EventToClients junction table constraints
ALTER TABLE "_EventToClients" DROP CONSTRAINT IF EXISTS "_EventToClients_A_fkey";
ALTER TABLE "_EventToClients" ADD CONSTRAINT "_EventToClients_A_fkey" 
  FOREIGN KEY ("A") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rename _EventToProperties junction table constraints
ALTER TABLE "_EventToProperties" DROP CONSTRAINT IF EXISTS "_EventToProperties_A_fkey";
ALTER TABLE "_EventToProperties" ADD CONSTRAINT "_EventToProperties_A_fkey" 
  FOREIGN KEY ("A") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update RLS policies
DROP POLICY IF EXISTS "tenant_isolation_calcom_events" ON "CalendarEvent";
CREATE POLICY "tenant_isolation_calendar_events" ON "CalendarEvent"
  AS RESTRICTIVE
  USING ("organizationId"::text = current_setting('app.current_organization_id'::text, true));

-- Update event_tags foreign key if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'event_tags') THEN
    ALTER TABLE "event_tags" DROP CONSTRAINT IF EXISTS "event_tags_eventId_fkey";
    ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_eventId_fkey" 
      FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
```

**Step 3: Verify migration syntax**

Review the migration file to ensure all SQL statements are valid PostgreSQL syntax.

**Step 4: Commit migration file**

```bash
git add prisma/migrations/20260201000000_rename_calcom_to_calendar_event/migration.sql
git commit -m "feat(db): create migration to rename CalComEvent to CalendarEvent"
```

---

## Task 2: Update Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma` (lines 110-145 and all relations)

**Step 1: Rename CalComEvent model to CalendarEvent**

In `prisma/schema.prisma`, rename the model and its columns:

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
  crm_Accounts_Tasks crm_Accounts_Tasks[]
  Documents          Documents[]          @relation("DocumentsToCalendarEvents")
  Clients            Clients[]            @relation("EventToClients")
  Properties         Properties[]         @relation("EventToProperties")

  @@index([assignedUserId])
  @@index([calendarEventId])
  @@index([eventType])
  @@index([organizationId])
  @@index([startTime])
}
```

**Step 2: Update CalendarReminder model relation**

Find the CalendarReminder model and update the relation:

```prisma
model CalendarReminder {
  id               String           @id
  createdAt        DateTime         @default(now())
  updatedAt        DateTime
  eventId          String
  reminderMinutes  Int
  scheduledFor     DateTime
  sentAt           DateTime?
  status           ReminderStatus   @default(PENDING)
  notificationType NotificationType @default(EMAIL)
  organizationId   String           @default("00000000-0000-0000-0000-000000000000")
  CalendarEvent    CalendarEvent    @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@index([eventId])
  @@index([scheduledFor])
  @@index([status])
  @@index([organizationId])
}
```

**Step 3: Update EventInvitee model relation**

```prisma
model EventInvitee {
  // ... existing fields ...
  CalendarEvent      CalendarEvent      @relation(fields: [eventId], references: [id], onDelete: Cascade)
  // ... rest of model ...
}
```

**Step 4: Update crm_Accounts_Tasks model**

Find and update the task model:

```prisma
model crm_Accounts_Tasks {
  // ... existing fields ...
  calendarEventId                         String?
  // ... other fields ...
  CalendarEvent                           CalendarEvent?                @relation(fields: [calendarEventId], references: [id])
  // ... rest of model ...
}
```

**Step 5: Update Clients model relation**

```prisma
model Clients {
  // ... existing fields ...
  CalendarEvent                      CalendarEvent[]        @relation("EventToClients")
  // ... rest of model ...
}
```

**Step 6: Update Properties model relation**

```prisma
model Properties {
  // ... existing fields ...
  CalendarEvent                         CalendarEvent[]             @relation("EventToProperties")
  // ... rest of model ...
}
```

**Step 7: Update Documents model**

```prisma
model Documents {
  // ... existing fields ...
  linkedCalendarEventsIds                String[]
  // ... other fields ...
  CalendarEvent                          CalendarEvent[]        @relation("DocumentsToCalendarEvents")
  // ... rest of model ...
}
```

**Step 8: Generate Prisma client**

```bash
pnpm prisma generate
```

Expected: Prisma client regenerated successfully with new model names

**Step 9: Commit schema changes**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): rename CalComEvent to CalendarEvent in Prisma schema"
```

---

## Task 3: Update lib/tenant.ts

**Files:**
- Modify: `lib/tenant.ts`

**Step 1: Update tenant configuration**

Replace `calComEvent` with `calendarEvent`:

```typescript
export const TENANT_MODELS = {
  // ... other models ...
  calendarEvent: "organizationId",
  // ... rest of models ...
} as const;
```

**Step 2: Commit changes**

```bash
git add lib/tenant.ts
git commit -m "refactor(tenant): update tenant config for CalendarEvent"
```

---

## Task 4: Update lib/friendly-id.ts

**Files:**
- Modify: `lib/friendly-id.ts`

**Step 1: Update friendly ID configuration**

Replace the CalComEvent entry:

```typescript
const MODEL_PREFIXES: Record<string, string> = {
  // ... other prefixes ...
  CalendarEvent: "evt",
  // ... rest of prefixes ...
};
```

**Step 2: Commit changes**

```bash
git add lib/friendly-id.ts
git commit -m "refactor(friendly-id): update friendly ID config for CalendarEvent"
```

---

## Task 5: Update API Routes - Calendar Events

**Files:**
- Modify: `app/api/calendar/events/route.ts`
- Modify: `app/api/calendar/events/[eventId]/route.ts`
- Modify: `app/api/v1/calendar/events/route.ts`
- Modify: `app/api/v1/calendar/events/[eventId]/route.ts`
- Modify: `app/api/v1/calendar/events/upcoming/route.ts`

**Step 1: Update app/api/calendar/events/route.ts**

Replace all occurrences:
- `prismadb.calComEvent` → `prismadb.calendarEvent`
- `calcomEventId` → `calendarEventId`
- `calcomUserId` → `calendarUserId`
- Update the comment on line 350 from "Not using Cal.com anymore" to "Legacy field maintained for backwards compatibility"

**Step 2: Update app/api/calendar/events/[eventId]/route.ts**

Same replacements as Step 1.

**Step 3: Update app/api/v1/calendar/events/route.ts**

Same replacements as Step 1.

**Step 4: Update app/api/v1/calendar/events/[eventId]/route.ts**

Same replacements as Step 1.

**Step 5: Update app/api/v1/calendar/events/upcoming/route.ts**

Same replacements as Step 1.

**Step 6: Commit changes**

```bash
git add app/api/calendar/events/ app/api/v1/calendar/events/
git commit -m "refactor(api): update calendar event routes for CalendarEvent model"
```

---

## Task 6: Update API Routes - Other Modules

**Files:**
- Modify: `app/api/calendar/reminders/route.ts`
- Modify: `app/api/calendar/reminders/[reminderId]/route.ts`
- Modify: `app/api/calendar/invitations/route.ts`
- Modify: `app/api/calendar/tasks/sync/route.ts`
- Modify: `app/api/crm/tasks/[taskId]/route.ts`
- Modify: `app/api/export/calendar/route.ts`

**Step 1: Update all files**

In each file, replace:
- `CalComEvent` → `CalendarEvent`
- `calComEvent` → `calendarEvent`
- `prismadb.calComEvent` → `prismadb.calendarEvent`

**Step 2: Commit changes**

```bash
git add app/api/calendar/reminders/ app/api/calendar/invitations/ app/api/calendar/tasks/ app/api/crm/tasks/ app/api/export/
git commit -m "refactor(api): update reminder, invitation, task routes for CalendarEvent"
```

---

## Task 7: Update Global Search and Linked Resources

**Files:**
- Modify: `app/api/global-search/route.ts`
- Modify: `app/api/mls/properties/[propertyId]/linked/route.ts`
- Modify: `app/api/crm/clients/[clientId]/linked/route.ts`
- Modify: `app/api/documents/[documentId]/route.ts`

**Step 1: Update global search**

In `app/api/global-search/route.ts`, replace:
- `CalComEvent` → `CalendarEvent` (in comments and type references)
- `calComEvent` → `calendarEvent` (variable names)
- `(db as any).calComEvent` → `(db as any).calendarEvent`

**Step 2: Update linked resources routes**

In the three linked routes files, replace:
- `prismadb.calComEvent` → `prismadb.calendarEvent`
- `CalComEvent` → `CalendarEvent` (in queries)

**Step 3: Update documents route**

In `app/api/documents/[documentId]/route.ts`, replace:
- `linkedCalComEventsIds` → `linkedCalendarEventsIds`
- `CalComEvent` → `CalendarEvent`

**Step 4: Commit changes**

```bash
git add app/api/global-search/ app/api/mls/properties/ app/api/crm/clients/ app/api/documents/
git commit -m "refactor(api): update search and linked resources for CalendarEvent"
```

---

## Task 8: Update Internal Voice API Routes

**Files:**
- Modify: `app/api/internal/voice/query-calendar/route.ts`
- Modify: `app/api/internal/voice/create-event/route.ts`
- Modify: `app/api/internal/voice/link-entities/route.ts`

**Step 1: Update all voice routes**

In each file, replace:
- `prismadb.calComEvent` → `prismadb.calendarEvent`
- `calcomEventId` → `calendarEventId`
- `calcomUserId` → `calendarUserId`
- `CalComEvent` → `CalendarEvent`

**Step 2: Commit changes**

```bash
git add app/api/internal/voice/
git commit -m "refactor(api): update voice API routes for CalendarEvent"
```

---

## Task 9: Update AI Chat and Tools

**Files:**
- Modify: `app/api/ai/chat/route.ts`
- Modify: `app/api/ai/find-slots/route.ts`
- Modify: `actions/ai/tools/calendar.ts`
- Modify: `actions/ai/tools/crm.ts`
- Modify: `actions/ai/tools/mls.ts`
- Modify: `actions/ai/tools/documents.ts`

**Step 1: Update AI chat routes**

Replace `prismadb.calcomCalendarEvent` → `prismadb.calendarEvent` (note: there's a typo in current code)

**Step 2: Update AI tools**

In each tools file, replace:
- `prismadb.calComEvent` → `prismadb.calendarEvent`
- `calcomEventId` → `calendarEventId`
- `calcomUserId` → `calendarUserId`
- `CalComEvent` → `CalendarEvent` (in relations)

**Step 3: Commit changes**

```bash
git add app/api/ai/ actions/ai/tools/
git commit -m "refactor(ai): update AI tools and chat for CalendarEvent"
```

---

## Task 10: Update Calendar Actions

**Files:**
- Modify: `actions/calendar/get-event.ts`
- Modify: `actions/calendar/get-event-invitees.ts`
- Modify: `actions/calendar/invite-to-event.ts`
- Modify: `actions/calendar/respond-to-invite.ts`

**Step 1: Update all calendar actions**

In each file, replace:
- `prismadb.calComEvent` → `prismadb.calendarEvent`
- `prismaTenant.calComEvent` → `prismaTenant.calendarEvent`
- `CalComEvent` → `CalendarEvent` (in relations and types)

**Step 2: Commit changes**

```bash
git add actions/calendar/
git commit -m "refactor(actions): update calendar actions for CalendarEvent"
```

---

## Task 11: Update Documents and Feed Actions

**Files:**
- Modify: `actions/documents/get-documents.ts`
- Modify: `actions/documents/get-document.ts`
- Modify: `actions/documents/create-document.ts`
- Modify: `actions/documents/get-mention-options.ts`
- Modify: `actions/feed/get-recent-activities.ts`
- Modify: `actions/feed/get-upcoming-items.ts`

**Step 1: Update documents actions**

Replace:
- `linkedCalComEventsIds` → `linkedCalendarEventsIds`
- `CalComEvent` → `CalendarEvent`
- `prismadb.calComEvent` → `prismadb.calendarEvent`

**Step 2: Update feed actions**

Replace:
- `prisma.calComEvent` → `prisma.calendarEvent`
- `CalComEvent` → `CalendarEvent` (in relations)
- `reminder.CalComEvent` → `reminder.CalendarEvent`

**Step 3: Commit changes**

```bash
git add actions/documents/ actions/feed/
git commit -m "refactor(actions): update documents and feed actions for CalendarEvent"
```

---

## Task 12: Update Reports and Organization Actions

**Files:**
- Modify: `actions/reports/get-client-metrics.ts`
- Modify: `actions/organization/reset-personal-workspace.ts`

**Step 1: Update reports**

Replace `prismadb.calComEvent` → `prismadb.calendarEvent`

**Step 2: Update organization actions**

Replace `await tx.calComEvent.deleteMany` → `await tx.calendarEvent.deleteMany`

**Step 3: Commit changes**

```bash
git add actions/reports/ actions/organization/
git commit -m "refactor(actions): update reports and org actions for CalendarEvent"
```

---

## Task 13: Update Library Files

**Files:**
- Modify: `lib/calendar-reminders.ts`
- Modify: `lib/calendar-permissions.ts`
- Modify: `lib/documents/parse-mentions.ts`
- Modify: `lib/ai-data/aggregator.ts`

**Step 1: Update all lib files**

In each file, replace:
- `prismadb.calComEvent` → `prismadb.calendarEvent`
- `CalComEvent` → `CalendarEvent` (in relations)
- `reminder.CalComEvent` → `reminder.CalendarEvent`
- `(prismaClient as any).calComEvent` → `(prismaClient as any).calendarEvent`

**Step 2: Commit changes**

```bash
git add lib/calendar-reminders.ts lib/calendar-permissions.ts lib/documents/parse-mentions.ts lib/ai-data/aggregator.ts
git commit -m "refactor(lib): update library files for CalendarEvent"
```

---

## Task 14: Update React Components

**Files:**
- Modify: `components/calendar/CalendarPageView.tsx`
- Modify: `components/calendar/TaskEventCard.tsx`
- Modify: `app/[locale]/app/(routes)/calendar/events/[id]/components/EventDetailView.tsx`
- Modify: `app/[locale]/app/(routes)/crm/tasks/viewtask/[taskId]/components/TaskViewPage.tsx`
- Modify: `components/calendar/DocumentGrid.tsx`

**Step 1: Update component files**

In each file, replace references in TypeScript interfaces and variable names:
- `calcomEventId` → `calendarEventId`
- `linkedCalComEvents` → `linkedCalendarEvents`
- `task.calcomEvent` → `task.calendarEvent`

**Step 2: Commit changes**

```bash
git add components/calendar/ app/[locale]/app/(routes)/calendar/ app/[locale]/app/(routes)/crm/tasks/
git commit -m "refactor(components): update React components for CalendarEvent"
```

---

## Task 15: Update SWR Hooks

**Files:**
- Modify: `hooks/swr/useTask.ts`
- Modify: `hooks/swr/useCalendarEvent.ts`
- Modify: `hooks/swr/useCalendarEvents.ts`

**Step 1: Update hook types**

In each file, update interface/type definitions:
- `calcomEventId` → `calendarEventId`
- `calcomEvent` → `calendarEvent`

**Step 2: Commit changes**

```bash
git add hooks/swr/
git commit -m "refactor(hooks): update SWR hooks for CalendarEvent"
```

---

## Task 16: Update Migration Scripts

**Files:**
- Modify: `scripts/migrate-to-friendly-ids.ts`

**Step 1: Update migration script**

Replace all occurrences:
- `"CalComEvent"` → `"CalendarEvent"`
- `model: "CalComEvent"` → `model: "CalendarEvent"`
- `calcomEventId` → `calendarEventId`
- References in junction tables

**Step 2: Commit changes**

```bash
git add scripts/migrate-to-friendly-ids.ts
git commit -m "refactor(scripts): update migration script for CalendarEvent"
```

---

## Task 17: Update Database Migrations (Historical)

**Files:**
- Modify: `prisma/migrations/20260131100000_unified_tagging_system/migration.sql`
- Modify: `prisma/migrations/20250220000000_tenant_guardrails/migration.sql`

**Step 1: Update unified tagging migration**

Replace:
- Comment: `-- Junction table for Events (CalComEvent)` → `-- Junction table for Events (CalendarEvent)`
- References to `"CalComEvent"` in foreign key constraints

**Step 2: Update tenant guardrails migration**

Replace all references:
- `'CalComEvent'` → `'CalendarEvent'`
- `"CalComEvent"` → `"CalendarEvent"`
- Policy name: `"tenant_isolation_calcom_events"` → `"tenant_isolation_calendar_events"`

**Note:** These are historical migrations that have already been applied. We're updating them for consistency in the migration history, but they won't be re-run.

**Step 3: Commit changes**

```bash
git add prisma/migrations/
git commit -m "refactor(migrations): update historical migrations for CalendarEvent naming"
```

---

## Task 18: Update Environment Variable Examples

**Files:**
- Modify: `.env.example`
- Modify: `.env.local.example`

**Step 1: Update both files**

Update the Cal.com section comments to clarify these are legacy/unused:

```bash
# ----- CAL.COM INTEGRATION (Legacy - Not Currently Used) -----
# Note: Calendar functionality is now handled internally
# These variables are kept for backwards compatibility
CALCOM_API_KEY=""
CALCOM_API_URL="https://api.cal.com/v1"
CALCOM_WEBHOOK_SECRET=""
```

**Step 2: Commit changes**

```bash
git add .env.example .env.local.example
git commit -m "docs(env): clarify Cal.com variables are legacy/unused"
```

---

## Task 19: Run Database Migration

**Files:**
- Database

**Step 1: Review migration one more time**

Carefully review the migration SQL to ensure it's correct.

**Step 2: Apply the migration**

```bash
pnpm prisma migrate deploy
```

Expected: Migration applied successfully

**Step 3: Verify database schema**

```bash
pnpm prisma db pull
```

Expected: No schema changes detected (confirms migration matches Prisma schema)

**Step 4: Regenerate Prisma client**

```bash
pnpm prisma generate
```

Expected: Client generated successfully

**Step 5: Commit lock files if changed**

```bash
git add pnpm-lock.yaml
git commit -m "chore: regenerate Prisma client after CalendarEvent migration"
```

---

## Task 20: Test the Application

**Files:**
- N/A (Testing)

**Step 1: Start development server**

```bash
pnpm dev
```

Expected: Server starts without TypeScript errors

**Step 2: Test calendar page**

Navigate to `/calendar` and verify:
- Calendar loads without errors
- Events are displayed correctly
- Creating a new event works
- Editing an event works
- Deleting an event works

**Step 3: Test related features**

- Test CRM tasks with linked calendar events
- Test documents with linked calendar events
- Test AI chat asking about calendar events
- Test voice API creating events

**Step 4: Check browser console**

Verify no errors related to the renamed model.

**Step 5: Check server logs**

Verify no database errors related to the migration.

---

## Task 21: Final Verification and Documentation

**Files:**
- Create: `docs/migrations/2026-02-01-calcom-to-calendarevent-rename.md`

**Step 1: Create migration documentation**

Document the changes made:

```markdown
# CalComEvent to CalendarEvent Rename Migration

**Date:** 2026-02-01  
**Migration:** `20260201000000_rename_calcom_to_calendar_event`

## Overview

Renamed all legacy Cal.com references to use `CalendarEvent` naming throughout the codebase. This change removes naming from when Cal.com was integrated but is no longer actively used.

## Changes

### Database
- Table: `CalComEvent` → `CalendarEvent`
- Column: `calcomEventId` → `calendarEventId`
- Column: `calcomUserId` → `calendarUserId`
- Junction table: `_DocumentsToCalComEvents` → `_DocumentsToCalendarEvents`
- Document field: `linkedCalComEventsIds` → `linkedCalendarEventsIds`
- Task field: `calcomEventId` → `calendarEventId`

### Code
- Prisma model: `CalComEvent` → `CalendarEvent`
- All Prisma queries updated
- ~198 code references updated across:
  - API routes (calendar, CRM, documents, voice, AI)
  - Server actions (calendar, documents, feed, reports)
  - Components and hooks
  - Library utilities
  - Migration scripts

### Breaking Changes
- **Prisma Client:** All code using `prismadb.calComEvent` must use `prismadb.calendarEvent`
- **API responses:** Any external consumers expecting `calcomEventId` field will now receive `calendarEventId`
- **Database columns:** Direct SQL queries must use new table/column names

## Rollback

If rollback is needed, reverse the migration:

```sql
ALTER TABLE "CalendarEvent" RENAME TO "CalComEvent";
ALTER TABLE "CalendarEvent" RENAME COLUMN "calendarEventId" TO "calcomEventId";
ALTER TABLE "CalendarEvent" RENAME COLUMN "calendarUserId" TO "calcomUserId";
-- (reverse all other changes)
```

Then revert all code changes via git.

## Notes

- Legacy Cal.com environment variables remain in `.env.example` for backwards compatibility
- Historical migrations updated for consistency but won't be re-run
- No functional changes - purely cosmetic rename
```

**Step 2: Commit documentation**

```bash
git add docs/migrations/
git commit -m "docs: add CalendarEvent rename migration documentation"
```

**Step 3: Create summary of changes**

Run:
```bash
git log --oneline --since="2026-02-01" --grep="CalendarEvent\|calcom"
```

**Step 4: Verify all commits**

Review the commit history to ensure all changes were committed properly.

---

## Completion Checklist

- [ ] Database migration created and applied
- [ ] Prisma schema updated
- [ ] All API routes updated
- [ ] All server actions updated
- [ ] All components and hooks updated
- [ ] All library utilities updated
- [ ] Migration scripts updated
- [ ] Historical migrations updated
- [ ] Environment examples updated
- [ ] Application tested (calendar CRUD operations work)
- [ ] Documentation created
- [ ] All changes committed to git

---

## Estimated Time

- **Total:** 2-3 hours for careful execution
- **Critical path:** Tasks 1-2 (schema/migration) must be done first
- **Parallelizable:** Most code updates (Tasks 5-17) can be done in any order after Task 2

## Risk Assessment

**Low Risk** - This is a cosmetic rename with no functional changes:
- ✅ Database migration is straightforward table/column renames
- ✅ TypeScript will catch any missed references at compile time
- ✅ Existing data is preserved (just table/column names change)
- ✅ Can be rolled back if issues occur

## Notes

- Take your time with the database migration - review it carefully before applying
- Let TypeScript be your guide - compile errors will show any missed references
- Test thoroughly before considering complete
- The migration renames historical migrations for consistency, but they won't re-run

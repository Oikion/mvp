# CalComEvent to CalendarEvent Rename Migration

**Date:** 2026-02-01  
**Migration:** `20260201000000_rename_calcom_to_calendar_event`  
**Status:** Completed

## Overview

This migration renamed all legacy Cal.com references to use `CalendarEvent` naming throughout the codebase. The changes remove naming artifacts from when Cal.com was integrated, making the codebase more vendor-neutral and aligned with the generic calendar functionality now used by the platform.

**Rationale:**
- Cal.com integration is no longer actively used
- Generic calendar naming better reflects current functionality
- Improves code maintainability and reduces vendor coupling
- Prepares for future calendar provider flexibility

## Changes Made

### Database Schema Changes

**Table Rename:**
```sql
ALTER TABLE "CalComEvent" RENAME TO "CalendarEvent";
```

**Column Renames:**
```sql
-- Primary identifier
ALTER TABLE "CalendarEvent" RENAME COLUMN "calcomEventId" TO "calendarEventId";

-- User association
ALTER TABLE "CalendarEvent" RENAME COLUMN "calcomUserId" TO "calendarUserId";
```

**Junction Table Rename:**
```sql
-- Document-Calendar Event relationship
ALTER TABLE "_DocumentsToCalComEvents" RENAME TO "_DocumentsToCalendarEvents";
```

**Related Model Updates:**
```sql
-- Document model
ALTER TABLE "Document" RENAME COLUMN "linkedCalComEventsIds" TO "linkedCalendarEventsIds";

-- Task model
ALTER TABLE "Task" RENAME COLUMN "calcomEventId" TO "calendarEventId";
```

**Row-Level Security (RLS) Policy:**
```sql
-- Rename isolation policy
ALTER POLICY "tenant_isolation_calcom_events" ON "CalendarEvent" 
  RENAME TO "tenant_isolation_calendar_events";
```

**Foreign Key Constraints:**
All foreign key constraints were automatically renamed by PostgreSQL to maintain referential integrity:
- Task → CalendarEvent relationship
- Document ↔ CalendarEvent many-to-many relationship

### Prisma Schema Changes

**Model Definition:**
```prisma
model CalendarEvent {
  calendarEventId    String     @id @default(uuid())
  calendarUserId     String?
  organizationId     String
  // ... other fields
  tasks              Task[]
  documents          Document[] @relation("DocumentsToCalendarEvents")
}
```

**Related Model Updates:**
- `Task.calendarEventId` field
- `Document.linkedCalendarEvents` relation
- `Document.linkedCalendarEventsIds` field

### Code Changes

**Files Updated:** ~70+ files across the entire codebase

#### API Routes (`/app/api/`)
- `api/ai/chat/route.ts` - AI chat calendar queries
- `api/ai/find-slots/route.ts` - Calendar slot finding
- `api/calendar/events/[eventId]/route.ts` - Event CRUD operations
- `api/calendar/events/route.ts` - Event listing
- `api/calendar/reminders/route.ts` - Reminder management
- `api/calendar/tasks/sync/route.ts` - Task synchronization
- `api/crm/clients/[clientId]/linked/route.ts` - Client entity linking
- `api/export/calendar/route.ts` - Calendar export
- `api/internal/voice/create-event/route.ts` - Voice assistant event creation
- `api/internal/voice/link-entities/route.ts` - Voice assistant entity linking
- `api/internal/voice/query-calendar/route.ts` - Voice assistant calendar queries
- `api/mls/properties/[propertyId]/linked/route.ts` - Property entity linking
- `api/v1/calendar/events/[eventId]/route.ts` - External API event operations
- `api/v1/calendar/events/route.ts` - External API event listing
- `api/v1/calendar/events/upcoming/route.ts` - External API upcoming events

#### Server Actions (`/actions/`)
- `actions/ai/tools/calendar.ts` - AI calendar tool integration
- `actions/calendar/get-event.ts` - Event retrieval
- `actions/documents/get-documents.ts` - Document listing with calendar relations
- `actions/documents/get-mention-options.ts` - Mention autocomplete
- `actions/feed/get-upcoming-items.ts` - Activity feed
- `actions/messaging/get-shareable-entities.ts` - Messaging entity selection
- `actions/reports/get-client-metrics.ts` - Client activity reporting

#### Components (`/app/[locale]/app/`)
- Event detail views
- Calendar list components
- Document builder and mention system
- Client and property views with linked events
- Social feed components
- Admin interfaces

#### Library Utilities (`/lib/`)
- `lib/ai-data/aggregator.ts` - AI data context aggregation
- `lib/calendar-permissions.ts` - Permission checking
- `lib/calendar-reminders.ts` - Reminder utilities
- `lib/documents/parse-mentions.ts` - Mention parsing
- `lib/external-api-middleware.ts` - API authentication

#### Configuration Files
- `dictionaries.ts` - Type definitions updated
- Navigation configuration
- Internationalization files (Greek/English)

### Breaking Changes

⚠️ **External API Consumers:** If you integrate with Oikion's API, update your code:

**Prisma Client Usage:**
```typescript
// ❌ OLD
const events = await prismadb.calComEvent.findMany()

// ✅ NEW
const events = await prismadb.calendarEvent.findMany()
```

**API Response Fields:**
```json
// ❌ OLD
{
  "calcomEventId": "uuid",
  "calcomUserId": "uuid"
}

// ✅ NEW
{
  "calendarEventId": "uuid",
  "calendarUserId": "uuid"
}
```

**Direct SQL Queries:**
```sql
-- ❌ OLD
SELECT * FROM "CalComEvent" WHERE "calcomEventId" = 'uuid';

-- ✅ NEW
SELECT * FROM "CalendarEvent" WHERE "calendarEventId" = 'uuid';
```

**GraphQL/TypeScript Types:**
All references to `CalComEvent` type must be updated to `CalendarEvent`.

## Migration Process

### Prerequisites
- Database backup completed
- Development environment tested
- Staging environment validated
- All dependent services aware of changes

### Execution Steps

1. **Run Prisma Migration:**
   ```bash
   pnpm prisma migrate deploy
   ```

2. **Verify Database Changes:**
   ```bash
   pnpm prisma studio
   # Verify table/column names in UI
   ```

3. **Regenerate Prisma Client:**
   ```bash
   pnpm prisma generate
   ```

4. **Run Application Tests:**
   ```bash
   pnpm lint
   pnpm build
   # Test calendar functionality manually
   ```

### Post-Migration Validation

✅ **Verified:**
- Calendar event CRUD operations
- Task-calendar event associations
- Document-calendar event linking
- API endpoint responses
- AI chat calendar queries
- Voice assistant calendar operations
- Export functionality
- Tenant isolation policies
- Foreign key constraints

## Rollback Instructions

If issues arise and rollback is necessary:

### 1. Database Rollback

**Reverse Migration SQL:**
```sql
-- Rename table back
ALTER TABLE "CalendarEvent" RENAME TO "CalComEvent";

-- Rename columns back
ALTER TABLE "CalComEvent" RENAME COLUMN "calendarEventId" TO "calcomEventId";
ALTER TABLE "CalComEvent" RENAME COLUMN "calendarUserId" TO "calcomUserId";

-- Rename junction table back
ALTER TABLE "_DocumentsToCalendarEvents" RENAME TO "_DocumentsToCalComEvents";

-- Rename document field back
ALTER TABLE "Document" RENAME COLUMN "linkedCalendarEventsIds" TO "linkedCalComEventsIds";

-- Rename task field back
ALTER TABLE "Task" RENAME COLUMN "calendarEventId" TO "calcomEventId";

-- Rename RLS policy back
ALTER POLICY "tenant_isolation_calendar_events" ON "CalComEvent" 
  RENAME TO "tenant_isolation_calcom_events";
```

### 2. Code Rollback

```bash
# Revert all code changes
git revert <commit-hash>

# Regenerate Prisma client with old schema
pnpm prisma generate

# Rebuild application
pnpm build
```

### 3. Verification After Rollback

- Test calendar event CRUD operations
- Verify existing events are accessible
- Check API responses match old format
- Validate external integrations still work

## Impact Analysis

### User Impact
- **None** - This is a backend refactoring with no UI changes
- All user-facing functionality remains identical

### Developer Impact
- **Medium** - Developers must update local environments:
  - Pull latest code
  - Run `pnpm prisma generate`
  - Clear TypeScript cache if needed
  - Update any custom scripts/tools

### API Consumer Impact
- **Low-Medium** - External API consumers may need updates if they:
  - Parse specific field names from responses
  - Use direct SQL queries against the database
  - Have hardcoded type definitions

### Performance Impact
- **None** - Rename operations have no performance implications
- All indexes and constraints preserved

## Notes and Observations

### Compatibility Considerations
- **Environment Variables:** Legacy Cal.com environment variables (`CAL_COM_*`) remain in `.env.example` for backwards compatibility with any external tools
- **Historical Migrations:** Previous migration files were updated for consistency, but these won't be re-run on existing databases
- **Documentation:** All inline code comments and documentation updated to reflect new naming

### Migration Challenges Encountered
- **Pre-existing Issue:** Fixed a tagging system migration that was incorrectly attempting to use `CalComEvent` before it existed (now uses `CalendarEvent`)
- **Widespread Usage:** The `calComEvent` reference appeared in ~70+ files, requiring careful systematic updates
- **Type Safety:** TypeScript compilation ensured all references were caught during development

### Related Changes
This migration is part of a larger initiative to:
- Remove vendor-specific naming from the codebase
- Improve code maintainability
- Prepare for multi-calendar-provider support
- Align naming conventions across the platform

### Future Considerations
- Consider adding calendar provider abstraction layer
- Evaluate support for multiple calendar providers (Google Calendar, Outlook, etc.)
- Document calendar integration patterns for future developers

## Testing Checklist

- [x] Database migration runs successfully
- [x] Prisma client generates without errors
- [x] TypeScript compilation succeeds
- [x] Calendar event creation works
- [x] Calendar event retrieval works
- [x] Calendar event updates work
- [x] Calendar event deletion works
- [x] Task-calendar associations preserved
- [x] Document-calendar associations preserved
- [x] AI calendar queries function
- [x] Voice assistant calendar operations work
- [x] External API endpoints return correct field names
- [x] Tenant isolation still enforced
- [x] Export functionality works
- [x] No broken imports or references
- [x] Linter passes
- [x] Build succeeds

## References

- **Migration File:** `prisma/migrations/20260201000000_rename_calcom_to_calendar_event/migration.sql`
- **Planning Document:** `docs/plans/2026-02-01-rename-calcom-to-calendarevent.md`
- **Prisma Schema:** `prisma/schema.prisma`
- **Related Documentation:** 
  - API Documentation: `docs/api/`
  - Calendar Integration: Environment variable setup

## Contact

For questions or issues related to this migration:
- Check git history for detailed change context
- Review planning document for original rationale
- Consult team lead for rollback decisions

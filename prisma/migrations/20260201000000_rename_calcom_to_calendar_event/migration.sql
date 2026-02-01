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

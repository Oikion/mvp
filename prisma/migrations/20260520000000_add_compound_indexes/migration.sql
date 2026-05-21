-- Add compound indexes for common multi-column query patterns
-- These improve performance for KPI queries, feed queries, and messaging queries

-- Properties: KPI queries filter by org + status
CREATE INDEX IF NOT EXISTS "Properties_organizationId_property_status_idx" ON "Properties"("organizationId", "property_status");
CREATE INDEX IF NOT EXISTS "Properties_organizationId_property_status_draft_status_idx" ON "Properties"("organizationId", "property_status", "draft_status");

-- CalendarEvent: upcoming events query filters by org + startTime range
CREATE INDEX IF NOT EXISTS "CalendarEvent_organizationId_startTime_idx" ON "CalendarEvent"("organizationId", "startTime");

-- EventInvitee: upcoming events subquery filters invitees by userId + status
CREATE INDEX IF NOT EXISTS "EventInvitee_userId_status_idx" ON "EventInvitee"("userId", "status");

-- Notification: fetching unread notifications by org + type is a common pattern
CREATE INDEX IF NOT EXISTS "Notification_organizationId_type_idx" ON "Notification"("organizationId", "type");
CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- SharedEntity: getSharedClients filters by sharedWithId + entityType
CREATE INDEX IF NOT EXISTS "SharedEntity_sharedWithId_entityType_idx" ON "SharedEntity"("sharedWithId", "entityType");

-- ImportHistory: feed query filters by org + importPhase + createdAt
CREATE INDEX IF NOT EXISTS "ImportHistory_organizationId_importPhase_createdAt_idx" ON "ImportHistory"("organizationId", "importPhase", "createdAt");
CREATE INDEX IF NOT EXISTS "ImportHistory_status_idx" ON "ImportHistory"("status");

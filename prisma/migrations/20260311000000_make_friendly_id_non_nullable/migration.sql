-- Make friendlyId non-nullable on all 7 core business entities.
-- This is safe because all existing records have friendlyId populated
-- (copied from id in the previous migration).

ALTER TABLE "Properties" ALTER COLUMN "friendlyId" SET NOT NULL;
ALTER TABLE "Clients" ALTER COLUMN "friendlyId" SET NOT NULL;
ALTER TABLE "Mandate" ALTER COLUMN "friendlyId" SET NOT NULL;
ALTER TABLE "Documents" ALTER COLUMN "friendlyId" SET NOT NULL;
ALTER TABLE "crm_Accounts_Tasks" ALTER COLUMN "friendlyId" SET NOT NULL;
ALTER TABLE "Deal" ALTER COLUMN "friendlyId" SET NOT NULL;
ALTER TABLE "CalendarEvent" ALTER COLUMN "friendlyId" SET NOT NULL;

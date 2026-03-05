-- Drop external messaging indexes from Message table
DROP INDEX IF EXISTS "Message_externalContactId_idx";
DROP INDEX IF EXISTS "Message_externalPlatform_externalMessageId_idx";

-- Drop foreign key from Message to ExternalContact
ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_externalContactId_fkey";

-- Drop external columns from Message table
ALTER TABLE "Message" DROP COLUMN IF EXISTS "externalPlatform";
ALTER TABLE "Message" DROP COLUMN IF EXISTS "externalMessageId";
ALTER TABLE "Message" DROP COLUMN IF EXISTS "externalContactId";
ALTER TABLE "Message" DROP COLUMN IF EXISTS "externalMetadata";

-- Drop ExternalContact table (cascades from MessagingIntegration)
DROP TABLE IF EXISTS "ExternalContact";

-- Drop MessagingIntegration table
DROP TABLE IF EXISTS "MessagingIntegration";

-- Drop MessagingPlatform enum
DROP TYPE IF EXISTS "MessagingPlatform";

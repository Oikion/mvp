-- Drop Audience-related index on SharedEntity
DROP INDEX IF EXISTS "SharedEntity_audienceId_idx";

-- Remove audienceId column from SharedEntity
ALTER TABLE "SharedEntity" DROP COLUMN IF EXISTS "audienceId";

-- Drop AudienceMember first (has FK to Audience)
DROP TABLE IF EXISTS "AudienceMember";

-- Drop Audience table
DROP TABLE IF EXISTS "Audience";

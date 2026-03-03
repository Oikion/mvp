-- RemoveAI: Drop all AI and Market Intelligence tables and related enums
-- This migration cleans up modules removed in 2026-03-02.

-- DropTable: AI Agent system (foreign-key order: junction tables first)
DROP TABLE IF EXISTS "AiAgentTool" CASCADE;
DROP TABLE IF EXISTS "OrganizationAgentConfig" CASCADE;
DROP TABLE IF EXISTS "AiToolExecution" CASCADE;
DROP TABLE IF EXISTS "AiAgent" CASCADE;
DROP TABLE IF EXISTS "AiTool" CASCADE;
DROP TABLE IF EXISTS "AiSystemPrompt" CASCADE;
DROP TABLE IF EXISTS "AiConversation" CASCADE;

-- DropTable: Market Intelligence
DROP TABLE IF EXISTS "MarketIntelAlertTrigger" CASCADE;
DROP TABLE IF EXISTS "MarketIntelAlert" CASCADE;
DROP TABLE IF EXISTS "MarketIntelConfig" CASCADE;

-- DropEnum: AI-specific enums
DROP TYPE IF EXISTS "AiToolEndpointType";
DROP TYPE IF EXISTS "AiToolExecutionSource";
DROP TYPE IF EXISTS "AiModelProvider";
DROP TYPE IF EXISTS "AiToolChoice";

-- DropEnum: Market Intelligence enums
DROP TYPE IF EXISTS "MarketIntelFrequency";
DROP TYPE IF EXISTS "MarketIntelStatus";
DROP TYPE IF EXISTS "MarketAlertType";

-- RemoveEnumValue: Remove MARKET_INTEL_SCRAPE from BackgroundJobType
-- PostgreSQL does not support DROP VALUE directly; recreate the enum.
ALTER TYPE "BackgroundJobType" RENAME TO "BackgroundJobType_old";
CREATE TYPE "BackgroundJobType" AS ENUM ('NEWSLETTER_SEND', 'PORTAL_PUBLISH_XE', 'BULK_EXPORT');
ALTER TABLE "BackgroundJob" ALTER COLUMN "type" TYPE "BackgroundJobType" USING "type"::text::"BackgroundJobType";
DROP TYPE "BackgroundJobType_old";

-- AlterTable: Remove AI-specific columns from OrganizationSettings
ALTER TABLE "OrganizationSettings"
  DROP COLUMN IF EXISTS "aiProvider",
  DROP COLUMN IF EXISTS "openaiApiKey",
  DROP COLUMN IF EXISTS "openaiModel",
  DROP COLUMN IF EXISTS "anthropicApiKey",
  DROP COLUMN IF EXISTS "anthropicModel",
  DROP COLUMN IF EXISTS "voiceAssistantEnabled",
  DROP COLUMN IF EXISTS "voiceLanguage",
  DROP COLUMN IF EXISTS "ttsVoice",
  DROP COLUMN IF EXISTS "aiCreditsUsed",
  DROP COLUMN IF EXISTS "aiCreditsLimit",
  DROP COLUMN IF EXISTS "lastCreditResetAt";

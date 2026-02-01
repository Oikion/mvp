-- Add AI Provider Settings to OrganizationSettings
-- Migration: add_ai_provider_settings

-- Add new columns for AI provider configuration
ALTER TABLE "OrganizationSettings" 
ADD COLUMN IF NOT EXISTS "aiProvider" TEXT DEFAULT 'openai',
ADD COLUMN IF NOT EXISTS "anthropicApiKey" TEXT,
ADD COLUMN IF NOT EXISTS "anthropicModel" TEXT DEFAULT 'claude-3-5-sonnet-20241022';

-- Add comment for documentation
COMMENT ON COLUMN "OrganizationSettings"."aiProvider" IS 'AI provider preference: "openai" or "anthropic"';
COMMENT ON COLUMN "OrganizationSettings"."anthropicApiKey" IS 'Organization''s Anthropic API key (encrypted)';
COMMENT ON COLUMN "OrganizationSettings"."anthropicModel" IS 'Claude model to use (default: claude-3-5-sonnet-20241022)';

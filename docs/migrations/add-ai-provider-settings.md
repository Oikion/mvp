# Migration: Add AI Provider Settings

## Overview

This migration adds support for organization-level AI provider configuration, allowing organizations to choose between OpenAI and Anthropic Claude.

## Changes

Adds three new fields to `OrganizationSettings`:

1. `aiProvider` - Provider preference ("openai" or "anthropic"), defaults to "openai"
2. `anthropicApiKey` - Organization's Anthropic API key (encrypted)
3. `anthropicModel` - Claude model to use, defaults to "claude-3-5-sonnet-20241022"

## Migration Steps

### Option 1: Using Prisma Migrate (Recommended)

```bash
# Create migration
pnpm prisma migrate dev --name add_ai_provider_settings

# Or if migration already exists, apply it
pnpm prisma migrate deploy
```

### Option 2: Manual SQL Execution

If Prisma migrate fails, you can run the SQL manually:

```sql
-- Add new columns for AI provider configuration
ALTER TABLE "OrganizationSettings" 
ADD COLUMN IF NOT EXISTS "aiProvider" TEXT DEFAULT 'openai',
ADD COLUMN IF NOT EXISTS "anthropicApiKey" TEXT,
ADD COLUMN IF NOT EXISTS "anthropicModel" TEXT DEFAULT 'claude-3-5-sonnet-20241022';
```

### Option 3: Using Prisma DB Push (Development Only)

```bash
pnpm prisma db push
```

**Warning**: `db push` is for development only and doesn't create migration files.

## Verification

After migration, verify the schema:

```bash
pnpm prisma studio
```

Check that `OrganizationSettings` table has the new columns:
- `aiProvider`
- `anthropicApiKey`
- `anthropicModel`

## Usage

After migration, organizations can set their provider preference:

```typescript
import { upsertOrgSettings } from "@/lib/org-settings";

// Set organization to use Claude
await upsertOrgSettings(organizationId, {
  aiProvider: "anthropic",
  anthropicApiKey: "sk-ant-...",
  anthropicModel: "claude-3-5-sonnet-20241022",
});

// Or use OpenAI
await upsertOrgSettings(organizationId, {
  aiProvider: "openai",
  openaiApiKey: "sk-...",
  openaiModel: "gpt-4o-mini",
});
```

## Rollback

If you need to rollback:

```sql
ALTER TABLE "OrganizationSettings" 
DROP COLUMN IF EXISTS "aiProvider",
DROP COLUMN IF EXISTS "anthropicApiKey",
DROP COLUMN IF EXISTS "anthropicModel";
```

## Related Files

- Schema: `prisma/schema.prisma`
- Helper functions: `lib/org-settings.ts`
- Base agent: `lib/ai-agents/base-agent.ts`
- Documentation: `docs/claude-integration.md`

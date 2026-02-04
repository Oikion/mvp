# Claude (Anthropic) Integration Guide

This guide explains how to use Claude as your AI model provider alongside or instead of OpenAI.

## Overview

The AI agent system now supports both OpenAI and Anthropic Claude models. You can configure which provider to use at the organization level or per-agent basis.

## Quick Start

### Using Claude with Base Agent

```typescript
import { BaseAgent } from "@/lib/ai-agents";

const agent = new BaseAgent({
  userId: "user_123",
  organizationId: "org_456",
  apiKey: process.env.ANTHROPIC_API_KEY!,
  provider: "anthropic", // Use Claude
  model: "claude-3-5-sonnet-20241022", // Optional, defaults to this
});

const response = await agent.processMessage("List all active clients");
```

### Using Organization Settings

```typescript
import { getOrgAgentConfig } from "@/lib/org-settings";
import { CRMAgent } from "@/lib/ai-agents";

// Automatically gets provider, API key, and model from org settings
const config = await getOrgAgentConfig(userId, organizationId);
const agent = new CRMAgent(config);

const response = await agent.processMessage("Create a new client");
```

## Database Schema Migration

To enable Claude support at the organization level, you need to add the following fields to `OrganizationSettings`:

```prisma
model OrganizationSettings {
  // ... existing fields ...
  
  // AI Provider Settings
  aiProvider          String?  @default("openai") // "openai" | "anthropic"
  anthropicApiKey     String?  // Organization's Anthropic API key (encrypted)
  anthropicModel      String?  @default("claude-3-5-sonnet-20241022")
}
```

### Migration Steps

1. **Add fields to schema** (`prisma/schema.prisma`):
   ```prisma
   model OrganizationSettings {
     // ... existing fields ...
     
     // AI Provider Settings
     aiProvider          String?  @default("openai")
     anthropicApiKey     String?
     anthropicModel      String?  @default("claude-3-5-sonnet-20241022")
   }
   ```

2. **Create and run migration**:
   ```bash
   pnpm prisma migrate dev --name add_anthropic_support
   ```

3. **Update TypeScript types**:
   ```bash
   pnpm prisma generate
   ```

## Configuration

### Environment Variables

Add to your `.env.local`:

```bash
# Anthropic API Key (fallback if org doesn't have one)
ANTHROPIC_API_KEY=sk-ant-...

# System-wide Anthropic model (optional)
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

### Organization Settings

Set organization-specific Claude configuration:

```typescript
import { upsertOrgSettings } from "@/lib/org-settings";

await upsertOrgSettings(organizationId, {
  aiProvider: "anthropic",
  anthropicApiKey: "sk-ant-...",
  anthropicModel: "claude-3-5-sonnet-20241022",
});
```

## Available Claude Models

- `claude-3-5-sonnet-20241022` (default) - Latest and most capable
- `claude-3-opus-20240229` - Most powerful, slower
- `claude-3-sonnet-20240229` - Balanced performance
- `claude-3-haiku-20240307` - Fastest, most cost-effective

## Differences from OpenAI

### Message Format

Claude uses a different message structure:
- System prompts are passed separately (not as a message)
- Tool results use `tool_result` blocks instead of `tool` role
- Content is structured as an array of content blocks

The `BaseAgent` class handles these differences automatically.

### Tool Calling

Claude's tool calling works similarly but uses different terminology:
- OpenAI: `tool_calls` → Claude: `tool_use` blocks
- OpenAI: `tool` role → Claude: `tool_result` content blocks

### Token Usage

Claude reports tokens differently:
- OpenAI: `prompt_tokens` and `completion_tokens`
- Claude: `input_tokens` and `output_tokens`

The agent normalizes these to a consistent format.

## Examples

### Example 1: Simple Claude Agent

```typescript
import { BaseAgent } from "@/lib/ai-agents";

class MyClaudeAgent extends BaseAgent {
  protected async getSystemPrompt(): Promise<string> {
    return "You are a helpful assistant powered by Claude.";
  }

  constructor(config: AgentConfig) {
    super(
      { ...config, provider: "anthropic" },
      { categories: ["crm", "mls"] }
    );
  }
}

const agent = new MyClaudeAgent({
  userId: "user_123",
  organizationId: "org_456",
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const response = await agent.processMessage("Help me find properties");
```

### Example 2: Provider-Agnostic Agent

```typescript
import { getOrgAgentConfig } from "@/lib/org-settings";
import { CRMAgent } from "@/lib/ai-agents";

// Works with either OpenAI or Claude based on org settings
const config = await getOrgAgentConfig(userId, organizationId);
const agent = new CRMAgent(config);

const response = await agent.processMessage("List clients");
```

### Example 3: API Route with Claude

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getOrgAgentConfig } from "@/lib/org-settings";
import { BaseAgent } from "@/lib/ai-agents";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  const orgId = await getCurrentOrgIdSafe();
  
  if (!user || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message } = await request.json();
  
  // Get config from org settings (supports both providers)
  const config = await getOrgAgentConfig(user.id, orgId);
  
  const agent = new BaseAgent(config);
  const response = await agent.processMessage(message);

  return NextResponse.json({
    success: true,
    response: response.content,
    toolCalls: response.toolCalls,
    provider: config.provider, // "openai" or "anthropic"
  });
}
```

## Switching Between Providers

### Per-Organization

```typescript
// Switch organization to Claude
await upsertOrgSettings(organizationId, {
  aiProvider: "anthropic",
  anthropicApiKey: "sk-ant-...",
});

// Switch back to OpenAI
await upsertOrgSettings(organizationId, {
  aiProvider: "openai",
  openaiApiKey: "sk-...",
});
```

### Per-Agent Instance

```typescript
// Use Claude for this specific agent
const claudeAgent = new CRMAgent({
  userId,
  organizationId,
  apiKey: process.env.ANTHROPIC_API_KEY!,
  provider: "anthropic",
});

// Use OpenAI for this agent
const openaiAgent = new CRMAgent({
  userId,
  organizationId,
  apiKey: process.env.OPENAI_API_KEY!,
  provider: "openai",
});
```

## Cost Considerations

Claude pricing (as of 2024):
- **Claude 3.5 Sonnet**: $3/1M input tokens, $15/1M output tokens
- **Claude 3 Opus**: $15/1M input tokens, $75/1M output tokens
- **Claude 3 Sonnet**: $3/1M input tokens, $15/1M output tokens
- **Claude 3 Haiku**: $0.25/1M input tokens, $1.25/1M output tokens

Compare with OpenAI:
- **GPT-4o-mini**: $0.15/1M input tokens, $0.6/1M output tokens
- **GPT-4o**: $2.50/1M input tokens, $10/1M output tokens

**Recommendation**: Use Claude 3.5 Sonnet for complex reasoning tasks, Claude 3 Haiku for simple queries, and GPT-4o-mini for cost-sensitive applications.

## Troubleshooting

### "Anthropic client not initialized"

Make sure you're passing `provider: "anthropic"` in the config or the organization has `aiProvider` set to `"anthropic"`.

### "Anthropic API key not configured"

1. Check environment variable `ANTHROPIC_API_KEY`
2. Verify organization settings have `anthropicApiKey` set
3. Ensure the API key is valid and has sufficient credits

### Tool calling not working

Claude requires tools to be in a specific format. The `toolsToClaudeFormat` function handles this automatically. If tools aren't being called:

1. Verify tools are enabled: `isEnabled: true`
2. Check tool descriptions are clear and specific
3. Ensure tool parameters match the expected schema

## Migration Checklist

- [ ] Install `@anthropic-ai/sdk`: `pnpm add @anthropic-ai/sdk`
- [ ] Add schema fields: `aiProvider`, `anthropicApiKey`, `anthropicModel`
- [ ] Run migration: `pnpm prisma migrate dev`
- [ ] Set environment variable: `ANTHROPIC_API_KEY`
- [ ] Update organization settings (optional)
- [ ] Test agent with Claude provider
- [ ] Update API routes to use `getOrgAgentConfig` (optional)

## Next Steps

- Read [AI Agents with Modular Tool Access](./ai-agents-modular-tools.md) for advanced usage
- Check [Anthropic API Documentation](https://docs.anthropic.com/) for latest features
- Review tool execution logs in `AiToolExecution` table

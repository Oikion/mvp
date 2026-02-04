# AI Agents with Modular Tool Access

## Overview

Oikion implements a sophisticated modular tool system that allows AI agents to dynamically access different sets of tools based on context, permissions, and configuration. This document explains the architecture and how to extend it.

## Architecture

### Core Components

The AI tool system consists of four main components:

1. **Registry** (`lib/ai-tools/registry.ts`) - Discovers and caches available tools
2. **Executor** (`lib/ai-tools/executor.ts`) - Executes tools with validation and logging
3. **Schema Validator** (`lib/ai-tools/schema.ts`) - Validates inputs against JSON Schema
4. **Format Converters** (`lib/ai-tools/openai-format.ts`) - Converts tools to various AI provider formats

### Database Schema

Tools are stored in the `AiTool` table with the following key fields:

```prisma
model AiTool {
  id              String    @id @default(cuid())
  name            String    @unique  // Tool identifier (e.g., "list_properties")
  displayName     String    // Human-readable name
  description     String    @db.Text // AI context description
  category        String    // Tool category (crm, mls, calendar, etc.)
  
  // JSON Schema for parameters
  parameters      Json
  
  // Endpoint configuration
  endpointType    AiToolEndpointType  // INTERNAL_ACTION | API_ROUTE | EXTERNAL_URL
  endpointPath    String    // Path to action/route/URL
  httpMethod      String    @default("POST")
  
  // Authorization
  requiredScopes  String[]  // API scopes needed
  
  // Status
  isEnabled       Boolean   @default(true)
  isSystemTool    Boolean   @default(false)
  
  // Audit
  executions      AiToolExecution[]
}
```

## Tool Access Patterns

### 1. **Global Tool Access** (All Enabled Tools)

```typescript
import { getEnabledTools } from "@/lib/ai-tools";

// Get all enabled tools
const tools = await getEnabledTools();
```

**Use Case**: Voice assistant, chat interface where all tools should be available.

### 2. **Scope-Based Access** (API Key Permissions)

```typescript
import { getToolsForScopes } from "@/lib/ai-tools";

// Get tools available for specific API scopes
const apiKeyScopes = ["crm:read", "mls:read"];
const availableTools = await getToolsForScopes(apiKeyScopes);
```

**Use Case**: External API integrations where API keys have limited scopes.

### 3. **Category-Based Access** (Feature Modules)

```typescript
import { getEnabledToolsByCategory } from "@/lib/ai-tools";

// Get only CRM tools
const crmTools = await getEnabledToolsByCategory("crm");
```

**Use Case**: Specialized agents that only need specific feature sets.

### 4. **Custom Filtering** (User/Org Permissions)

```typescript
import { getEnabledTools } from "@/lib/ai-tools";
import { getUserPermissions } from "@/lib/permissions";

// Custom filtering based on user permissions
const allTools = await getEnabledTools();
const userPermissions = await getUserPermissions(userId, organizationId);

const accessibleTools = allTools.filter(tool => {
  // Check if user has required permissions for this tool
  return tool.requiredScopes.every(scope => 
    userPermissions.includes(scope)
  );
});
```

**Use Case**: Role-based access control, organization-specific tool sets.

## Creating Custom Tools

### Method 1: Database-Driven (Recommended)

Tools can be created through the platform admin interface or programmatically:

```typescript
import { createAiTool } from "@/actions/platform-admin/ai-tools/create-ai-tool";

const result = await createAiTool({
  name: "create_custom_report",
  displayName: "Create Custom Report",
  description: "Generate a custom report with specified filters and date range",
  category: "reports",
  parameters: {
    type: "object",
    properties: {
      reportType: {
        type: "string",
        enum: ["sales", "listings", "clients"],
        description: "Type of report to generate"
      },
      startDate: {
        type: "string",
        format: "date",
        description: "Report start date (YYYY-MM-DD)"
      },
      endDate: {
        type: "string",
        format: "date",
        description: "Report end date (YYYY-MM-DD)"
      },
      includeCharts: {
        type: "boolean",
        default: true,
        description: "Include visual charts in the report"
      }
    },
    required: ["reportType", "startDate", "endDate"]
  },
  endpointType: "INTERNAL_ACTION",
  endpointPath: "reports/create-custom-report",
  httpMethod: "POST",
  requiredScopes: ["reports:write"],
  isEnabled: true,
  isSystemTool: false
});
```

### Method 2: Using Templates

Pre-defined templates make creating common tool patterns easier:

```typescript
import { TOOL_TEMPLATES, getTemplateById } from "@/lib/ai-tools";

// Get a template
const template = getTemplateById("list-paginated");

// Customize and create
const customTool = {
  ...template.defaultValues,
  name: "list_custom_entities",
  displayName: "List Custom Entities",
  description: "List custom entities with pagination",
  endpointPath: "custom/list-entities"
};
```

## Tool Endpoint Types

### 1. INTERNAL_ACTION

Calls a server action directly:

```typescript
// actions/crm/clients/get-clients.ts
"use server";

export default async function getClients(params: {
  search?: string;
  status?: string;
  _toolContext?: ToolExecutionContext;
}) {
  const { search, status, _toolContext } = params;
  
  // Access context for organization/user info
  const orgId = _toolContext?.organizationId;
  
  // Your logic here
  return { clients: [...] };
}
```

**Pros**: Fast, type-safe, direct database access  
**Cons**: Requires server action file

### 2. API_ROUTE

Calls an internal API route:

```typescript
// app/api/crm/clients/route.ts
export async function GET(request: NextRequest) {
  // Tool context passed via headers:
  // X-Tool-Context-Org
  // X-Tool-Context-User
  // X-Tool-Context-Source
  
  const orgId = request.headers.get("X-Tool-Context-Org");
  // Your logic here
  return NextResponse.json({ clients: [...] });
}
```

**Pros**: Standard HTTP, can be tested independently  
**Cons**: Slightly slower, requires HTTP overhead

### 3. EXTERNAL_URL

Calls an external API:

```typescript
// Tool configuration
{
  endpointType: "EXTERNAL_URL",
  endpointPath: "https://api.example.com/v1/data",
  httpMethod: "POST"
}
```

**Pros**: Integrate with third-party services  
**Cons**: Requires external API availability, authentication handling

## Customizing Tool Access Per Agent

### Example: Role-Based Agent

```typescript
// lib/ai-agents/role-based-agent.ts
import { getEnabledTools } from "@/lib/ai-tools";
import { getUserRole } from "@/lib/permissions";

export async function getToolsForRoleBasedAgent(
  userId: string,
  organizationId: string
) {
  const role = await getUserRole(userId, organizationId);
  const allTools = await getEnabledTools();
  
  // Define tool access by role
  const roleToolMap: Record<string, string[]> = {
    ORG_OWNER: ["*"], // All tools
    ADMIN: ["crm", "mls", "calendar", "documents"],
    AGENT: ["crm", "mls", "calendar"],
    VIEWER: ["crm", "mls"], // Read-only
  };
  
  const allowedCategories = roleToolMap[role] || [];
  
  if (allowedCategories.includes("*")) {
    return allTools;
  }
  
  return allTools.filter(tool => 
    allowedCategories.includes(tool.category)
  );
}
```

### Example: Context-Aware Agent

```typescript
// lib/ai-agents/context-aware-agent.ts
import { getEnabledTools } from "@/lib/ai-tools";

export async function getToolsForContext(
  context: {
    page?: string;
    feature?: string;
    userIntent?: string;
  }
) {
  const allTools = await getEnabledTools();
  
  // Context-based filtering
  if (context.page === "crm") {
    return allTools.filter(t => t.category === "crm");
  }
  
  if (context.feature === "property-search") {
    return allTools.filter(t => 
      t.category === "mls" && 
      (t.name.includes("search") || t.name.includes("list"))
    );
  }
  
  // Intent-based filtering
  if (context.userIntent === "create") {
    return allTools.filter(t => 
      t.name.includes("create") || t.name.includes("add")
    );
  }
  
  return allTools;
}
```

### Example: Multi-Tenant Agent with Org-Specific Tools

```typescript
// lib/ai-agents/org-specific-agent.ts
import { getEnabledTools } from "@/lib/ai-tools";
import { getOrgSettings } from "@/lib/org-settings";

export async function getToolsForOrganization(organizationId: string) {
  const allTools = await getEnabledTools();
  const orgSettings = await getOrgSettings(organizationId);
  
  // Get organization-specific tool configuration
  const enabledToolNames = orgSettings.enabledAiTools || [];
  const disabledCategories = orgSettings.disabledAiToolCategories || [];
  
  return allTools.filter(tool => {
    // Check if explicitly enabled
    if (enabledToolNames.length > 0) {
      return enabledToolNames.includes(tool.name);
    }
    
    // Check if category is disabled
    if (disabledCategories.includes(tool.category)) {
      return false;
    }
    
    return true;
  });
}
```

## Integration with AI Providers

The `BaseAgent` class supports both OpenAI and Anthropic Claude models. You can specify the provider when creating an agent.

### Using OpenAI (Default)

```typescript
import { CRMAgent } from "@/lib/ai-agents";

const agent = new CRMAgent({
  userId: "user_123",
  organizationId: "org_456",
  apiKey: process.env.OPENAI_API_KEY!,
  provider: "openai", // Optional, defaults to "openai"
  model: "gpt-4o-mini",
});
```

### Using Anthropic Claude

```typescript
import { CRMAgent } from "@/lib/ai-agents";

const agent = new CRMAgent({
  userId: "user_123",
  organizationId: "org_456",
  apiKey: process.env.ANTHROPIC_API_KEY!,
  provider: "anthropic",
  model: "claude-3-5-sonnet-20241022",
});
```

### Using Organization Settings (Provider-Agnostic)

```typescript
import { getOrgAgentConfig } from "@/lib/org-settings";
import { CRMAgent } from "@/lib/ai-agents";

// Automatically uses org's preferred provider (OpenAI or Claude)
const config = await getOrgAgentConfig(userId, organizationId);
const agent = new CRMAgent(config);
```

**See [Claude Integration Guide](./claude-integration.md) for detailed Claude setup instructions.**

### MCP (Model Context Protocol)

```typescript
import { getEnabledTools, toolsToMCPFormat } from "@/lib/ai-tools";

const tools = await getEnabledTools();
const mcpTools = toolsToMCPFormat(tools);
// Use with MCP server
```

## Best Practices

### 1. Tool Naming Conventions

- Use snake_case: `create_client`, `list_properties`
- Be descriptive: `search_properties_by_location` not `search`
- Group by action: `create_*`, `list_*`, `update_*`, `delete_*`

### 2. Parameter Design

- Always include descriptions for AI context
- Use enums for constrained values
- Provide sensible defaults
- Mark required fields explicitly

```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["ACTIVE", "INACTIVE", "PENDING"],
      "description": "Filter by status"
    },
    "limit": {
      "type": "number",
      "default": 20,
      "minimum": 1,
      "maximum": 100,
      "description": "Number of results to return"
    }
  },
  "required": ["status"]
}
```

### 3. Error Handling

Tools should return consistent error formats:

```typescript
// Success
return {
  success: true,
  data: { ... }
};

// Error
return {
  success: false,
  error: "Descriptive error message",
  statusCode: 400
};
```

### 4. Caching Strategy

- Tools are cached for 60 seconds
- Invalidate cache after creating/updating tools:
  ```typescript
  import { invalidateToolsCache } from "@/lib/ai-tools";
  await invalidateToolsCache();
  ```

### 5. Security Considerations

- Always validate inputs using JSON Schema
- Check permissions before executing tools
- Log all tool executions for audit
- Use scopes to limit tool access
- Never expose sensitive data in tool descriptions

## Example: Complete Custom Agent

```typescript
// lib/ai-agents/custom-agent.ts
import { getEnabledTools, executeTool } from "@/lib/ai-tools";
import OpenAI from "openai";

interface CustomAgentConfig {
  userId: string;
  organizationId: string;
  allowedCategories?: string[];
  maxToolsPerRequest?: number;
}

export class CustomAgent {
  private config: CustomAgentConfig;
  private openai: OpenAI;
  
  constructor(config: CustomAgentConfig, apiKey: string) {
    this.config = config;
    this.openai = new OpenAI({ apiKey });
  }
  
  async getAvailableTools() {
    const allTools = await getEnabledTools();
    
    // Filter by allowed categories
    if (this.config.allowedCategories) {
      return allTools.filter(tool => 
        this.config.allowedCategories!.includes(tool.category)
      );
    }
    
    return allTools;
  }
  
  async processMessage(userMessage: string) {
    const tools = await this.getAvailableTools();
    
    // Limit tools if configured
    const limitedTools = this.config.maxToolsPerRequest
      ? tools.slice(0, this.config.maxToolsPerRequest)
      : tools;
    
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant with access to tools."
        },
        { role: "user", content: userMessage }
      ],
      tools: toolsToOpenAIFormat(limitedTools),
      tool_choice: "auto"
    });
    
    const response = completion.choices[0]?.message;
    
    // Execute tool calls if any
    if (response.tool_calls) {
      const results = await Promise.all(
        response.tool_calls.map(async (call) => {
          const result = await executeTool(
            call.function.name,
            JSON.parse(call.function.arguments),
            {
              userId: this.config.userId,
              organizationId: this.config.organizationId,
              source: "CUSTOM_AGENT"
            }
          );
          return result;
        })
      );
      
      // Continue conversation with tool results
      // ... (follow-up request)
    }
    
    return response.content;
  }
}

// Usage
const agent = new CustomAgent({
  userId: "user_123",
  organizationId: "org_456",
  allowedCategories: ["crm", "mls"],
  maxToolsPerRequest: 10
}, process.env.OPENAI_API_KEY!);

const response = await agent.processMessage("List all active clients");
```

## Monitoring and Debugging

### View Tool Executions

```typescript
import { getToolExecutions } from "@/actions/platform-admin/ai-tools/get-tool-executions";

const executions = await getToolExecutions({
  toolId: "tool_123",
  organizationId: "org_456",
  limit: 100
});
```

### Test Tools

```typescript
import { executeToolForTesting } from "@/lib/ai-tools/executor";

const result = await executeToolForTesting(
  "create_client",
  { name: "Test Client", email: "test@example.com" },
  adminUserId,
  organizationId,
  testMode: true // Returns mock data
);
```

## Summary

The modular tool system provides:

✅ **Flexible Access Control** - Scope-based, category-based, or custom filtering  
✅ **Multiple Endpoint Types** - Server actions, API routes, or external URLs  
✅ **Type Safety** - JSON Schema validation for all inputs  
✅ **Audit Trail** - All executions are logged  
✅ **Provider Agnostic** - Works with OpenAI, Claude, MCP, etc.  
✅ **Easy Extension** - Add new tools via database or code  

This architecture allows you to create specialized AI agents with exactly the tools they need, while maintaining security, performance, and maintainability.

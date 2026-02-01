/**
 * Example Usage of Base Agent Classes
 * 
 * This file demonstrates how to use the base agent classes to create
 * custom AI agents with modular tool access.
 */

import {
  BaseAgent,
  CRMAgent,
  ReadOnlyAgent,
  PropertySearchAgent,
  type AgentConfig,
  type ToolFilter,
} from "./base-agent";

// ============================================
// Example 1: Basic CRM Agent
// ============================================

export async function exampleCRMAgent() {
  const config: AgentConfig = {
    userId: "user_123",
    organizationId: "org_456",
    apiKey: process.env.OPENAI_API_KEY!,
    model: "gpt-4o-mini",
    temperature: 0.7,
  };

  const agent = new CRMAgent(config);

  const response = await agent.processMessage(
    "List all active clients and show me their contact information"
  );

  console.log("Response:", response.content);
  console.log("Tool calls:", response.toolCalls);
}

// ============================================
// Example 2: Custom Agent with Specific Tools
// ============================================

export class CustomReportingAgent extends BaseAgent {
  protected async getSystemPrompt(): Promise<string> {
    return `You are a reporting assistant. You help users generate reports and analyze data.
Focus on understanding what data the user wants to see and use the appropriate tools to retrieve it.`;
  }

  constructor(config: AgentConfig) {
    // Only allow specific reporting-related tools
    super(config, {
      toolNames: [
        "list_clients",
        "list_properties",
        "get_deals",
        "generate_report",
      ],
    });
  }
}

// ============================================
// Example 3: Role-Based Agent
// ============================================

export class RoleBasedAgent extends BaseAgent {
  private userRole: string;

  protected async getSystemPrompt(): Promise<string> {
    const rolePrompts: Record<string, string> = {
      ORG_OWNER: `You are an assistant for organization owners. You have full access to all features.
Help manage the organization, users, and settings.`,
      ADMIN: `You are an assistant for administrators. You can manage clients, properties, and deals.
You have access to most features except organization settings.`,
      AGENT: `You are an assistant for real estate agents. You can manage your clients and properties.
Focus on helping with daily tasks like scheduling, client communication, and property management.`,
      VIEWER: `You are a read-only assistant. You can view data but cannot make changes.
Inform users if they request actions that require write permissions.`,
    };

    return rolePrompts[this.userRole] || rolePrompts.VIEWER;
  }

  protected async getAvailableTools() {
    const allTools = await super.getAvailableTools();

    // Filter tools based on role
    const roleToolMap: Record<string, string[]> = {
      ORG_OWNER: ["*"], // All tools
      ADMIN: ["crm", "mls", "calendar", "documents"],
      AGENT: ["crm", "mls", "calendar"],
      VIEWER: ["crm", "mls"], // Read-only categories
    };

    const allowedCategories = roleToolMap[this.userRole] || [];

    if (allowedCategories.includes("*")) {
      return allTools;
    }

    return allTools.filter((tool) => allowedCategories.includes(tool.category));
  }

  constructor(config: AgentConfig, userRole: string) {
    super(config);
    this.userRole = userRole;
  }
}

// ============================================
// Example 4: Context-Aware Agent
// ============================================

export class ContextAwareAgent extends BaseAgent {
  private currentPage?: string;
  private userIntent?: string;

  protected async getSystemPrompt(): Promise<string> {
    let prompt = `You are a helpful assistant. `;

    if (this.currentPage === "crm") {
      prompt += `You are currently helping with CRM tasks. Focus on client and contact management.`;
    } else if (this.currentPage === "mls") {
      prompt += `You are currently helping with property listings. Focus on property search and management.`;
    }

    if (this.userIntent === "create") {
      prompt += ` The user wants to create something. Use create/add tools.`;
    } else if (this.userIntent === "search") {
      prompt += ` The user wants to search for something. Use search/list tools.`;
    }

    return prompt;
  }

  protected async getAvailableTools() {
    const allTools = await super.getAvailableTools();

    // Filter based on context
    if (this.currentPage === "crm") {
      return allTools.filter((tool) => tool.category === "crm");
    }

    if (this.currentPage === "mls") {
      return allTools.filter((tool) => tool.category === "mls");
    }

    // Intent-based filtering
    if (this.userIntent === "create") {
      return allTools.filter(
        (tool) =>
          tool.name.includes("create") || tool.name.includes("add")
      );
    }

    if (this.userIntent === "search") {
      return allTools.filter(
        (tool) =>
          tool.name.includes("search") || tool.name.includes("list")
      );
    }

    return allTools;
  }

  constructor(
    config: AgentConfig,
    context?: { page?: string; intent?: string }
  ) {
    super(config);
    this.currentPage = context?.page;
    this.userIntent = context?.intent;
  }

  setContext(context: { page?: string; intent?: string }) {
    this.currentPage = context.page;
    this.userIntent = context.intent;
  }
}

// ============================================
// Example 5: Multi-Tenant Agent with Org Settings
// ============================================

export class OrgSpecificAgent extends BaseAgent {
  protected async getSystemPrompt(): Promise<string> {
    return `You are an assistant customized for this organization.
Follow organization-specific guidelines and preferences.`;
  }

  protected async getAvailableTools() {
    const allTools = await super.getAvailableTools();

    // In a real implementation, you would fetch org settings from database
    // const orgSettings = await getOrgSettings(this.config.organizationId);
    // const enabledToolNames = orgSettings.enabledAiTools || [];
    // const disabledCategories = orgSettings.disabledAiToolCategories || [];

    // For this example, we'll use a simple filter
    // Replace with actual org settings lookup
    const enabledToolNames: string[] = []; // From org settings
    const disabledCategories: string[] = []; // From org settings

    if (enabledToolNames.length > 0) {
      return allTools.filter((tool) => enabledToolNames.includes(tool.name));
    }

    return allTools.filter(
      (tool) => !disabledCategories.includes(tool.category)
    );
  }
}

// ============================================
// Example 6: Usage in API Route
// ============================================

export async function exampleApiRouteUsage() {
  // In an API route handler:
  /*
  import { CRMAgent } from "@/lib/ai-agents/examples";
  import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
  import { getOrgOpenAIKey } from "@/lib/org-settings";

  export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    const orgId = await getCurrentOrgIdSafe();
    const apiKey = await getOrgOpenAIKey(orgId);

    if (!user || !orgId || !apiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message } = await request.json();

    const agent = new CRMAgent({
      userId: user.id,
      organizationId: orgId,
      apiKey,
    });

    const response = await agent.processMessage(message);

    return NextResponse.json({
      success: true,
      response: response.content,
      toolCalls: response.toolCalls,
    });
  }
  */
}

// ============================================
// Example 7: Advanced Filtering
// ============================================

export class AdvancedFilterAgent extends BaseAgent {
  protected async getSystemPrompt(): Promise<string> {
    return `You are an advanced assistant with carefully selected tools.`;
  }

  constructor(config: AgentConfig) {
    // Complex filtering: CRM and MLS categories, but exclude delete operations
    super(config, {
      categories: ["crm", "mls"],
      excludeToolNames: [
        "delete_client",
        "delete_property",
        "delete_deal",
        "remove_contact",
      ],
    });
  }
}

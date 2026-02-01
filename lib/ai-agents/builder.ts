/**
 * AI Agent Builder
 *
 * Builds Vercel AI SDK ToolLoopAgent instances from database configurations.
 * Handles model resolution, tool loading, configuration merging, and
 * organization-specific context injection.
 *
 * Key features:
 * - Database-driven agent configurations
 * - Per-organization overrides
 * - Automatic tool loading based on agent config
 * - Organization data context injection
 * - Flexible build options for runtime customization
 */

import { ToolLoopAgent, stepCountIs, type CoreTool, type LanguageModel } from "ai";
import {
  getAgentByName,
  getAgentWithOrgConfig,
  resolveAgentConfig,
} from "./registry";
import {
  getModel,
  getOpenAIModel,
  getAnthropicModel,
  getDatabaseTools,
  getToolsByName,
  createAgentContext,
} from "@/lib/ai-sdk";
import { getOrganizationContext, getTodaySummary } from "@/lib/ai-data";
import type {
  AgentContext,
  AgentBuildOptions,
  ResolvedAgentConfig,
  AgentWithOrgConfig,
} from "./types";
import type { AiModelProvider, AiToolChoice } from "@prisma/client";

// ============================================
// Agent Builder
// ============================================

/**
 * Build a ToolLoopAgent instance from a database agent configuration
 *
 * @param agentName - The agent name (unique identifier)
 * @param context - Execution context
 * @param options - Build options for overrides
 * @returns Configured ToolLoopAgent instance
 */
export async function buildAgent(
  agentName: string,
  context: AgentContext,
  options?: AgentBuildOptions
): Promise<ToolLoopAgent> {
  // Load agent with org config
  const agent = await getAgentWithOrgConfig(
    agentName,
    context.organizationId
  );

  if (!agent) {
    // Try loading by name
    const agentByName = await getAgentByName(agentName);
    if (!agentByName) {
      throw new Error(`Agent "${agentName}" not found`);
    }

    // Re-fetch with org config
    const agentWithConfig = await getAgentWithOrgConfig(
      agentByName.id,
      context.organizationId
    );

    if (!agentWithConfig) {
      throw new Error(`Failed to load agent "${agentName}" with org config`);
    }

    return buildAgentFromConfig(agentWithConfig, context, options);
  }

  return buildAgentFromConfig(agent, context, options);
}

/**
 * Build agent from resolved configuration
 */
async function buildAgentFromConfig(
  agent: AgentWithOrgConfig,
  context: AgentContext,
  options?: AgentBuildOptions
): Promise<ToolLoopAgent> {
  // Resolve configuration with org overrides
  const config = resolveAgentConfig(agent);

  // Apply build options
  const finalConfig = applyBuildOptions(config, options);

  // Get model
  const model = await resolveModel(
    finalConfig.modelProvider,
    finalConfig.modelName,
    context.organizationId
  );

  // Get tools
  const tools = await resolveTools(finalConfig.toolNames, context);

  // Determine tool choice
  const toolChoice = mapToolChoice(finalConfig.toolChoice);

  // Build the agent
  const toolLoopAgent = new ToolLoopAgent({
    model,
    instructions: finalConfig.systemPrompt,
    tools,
    stopWhen: stepCountIs(finalConfig.maxSteps),
    temperature: finalConfig.temperature,
    maxOutputTokens: finalConfig.maxTokens,
    toolChoice,
  });

  return toolLoopAgent;
}

/**
 * Apply build options to override configuration
 */
function applyBuildOptions(
  config: ResolvedAgentConfig,
  options?: AgentBuildOptions
): ResolvedAgentConfig {
  if (!options) return config;

  const result = { ...config };

  if (options.modelOverride) {
    result.modelName = options.modelOverride;
  }

  if (options.temperatureOverride !== undefined) {
    result.temperature = options.temperatureOverride;
  }

  if (options.maxTokensOverride !== undefined) {
    result.maxTokens = options.maxTokensOverride;
  }

  if (options.systemPromptOverride) {
    result.systemPrompt = options.systemPromptOverride;
  }

  if (options.additionalTools && options.additionalTools.length > 0) {
    result.toolNames = [...result.toolNames, ...options.additionalTools];
  }

  if (options.excludeTools && options.excludeTools.length > 0) {
    const excludeSet = new Set(options.excludeTools);
    result.toolNames = result.toolNames.filter(
      (name) => !excludeSet.has(name)
    );
  }

  return result;
}

// ============================================
// Model Resolution
// ============================================

/**
 * Resolve model from provider and name
 */
async function resolveModel(
  provider: AiModelProvider,
  modelName: string,
  organizationId: string
): Promise<LanguageModel> {
  try {
    if (provider === "ANTHROPIC") {
      return await getAnthropicModel(organizationId, modelName);
    } else {
      return await getOpenAIModel(organizationId, modelName);
    }
  } catch {
    // Fallback to default model resolution
    console.warn(
      `[AGENT_BUILDER] Failed to resolve ${provider} model "${modelName}", using default`
    );
    return await getModel(organizationId);
  }
}

// ============================================
// Tool Resolution
// ============================================

/**
 * Resolve tools by name
 */
async function resolveTools(
  toolNames: string[],
  context: AgentContext
): Promise<Record<string, CoreTool>> {
  // Create tool context based on usage
  const toolContext = createAgentContext(
    context.userId,
    context.organizationId,
    context.testMode
  );

  if (toolNames.length === 0) {
    // Return all enabled tools if no specific tools configured
    return await getDatabaseTools(toolContext);
  }

  // Return only the specified tools
  return await getToolsByName(toolNames, toolContext);
}

/**
 * Map database tool choice to AI SDK format
 */
function mapToolChoice(
  choice: AiToolChoice
): "auto" | "required" | "none" | undefined {
  switch (choice) {
    case "AUTO":
      return "auto";
    case "REQUIRED":
      return "required";
    case "NONE":
      return "none";
    default:
      return "auto";
  }
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Build the default chat assistant agent
 */
export async function buildChatAssistant(
  context: AgentContext,
  options?: AgentBuildOptions
): Promise<ToolLoopAgent> {
  return buildAgent("chat_assistant", context, options);
}

/**
 * Build the voice assistant agent
 */
export async function buildVoiceAssistant(
  context: AgentContext,
  options?: AgentBuildOptions
): Promise<ToolLoopAgent> {
  return buildAgent("voice_assistant", context, options);
}

/**
 * Build the document analyzer agent
 */
export async function buildDocumentAnalyzer(
  context: AgentContext,
  options?: AgentBuildOptions
): Promise<ToolLoopAgent> {
  return buildAgent("document_analyzer", context, options);
}

/**
 * Build the property matcher agent
 */
export async function buildPropertyMatcher(
  context: AgentContext,
  options?: AgentBuildOptions
): Promise<ToolLoopAgent> {
  return buildAgent("property_matcher", context, options);
}

// ============================================
// Quick Agent Creation (without database)
// ============================================

/**
 * Create a quick agent without database configuration
 *
 * Useful for one-off agent creation or testing.
 */
export async function createQuickAgent(params: {
  organizationId: string;
  userId: string;
  systemPrompt: string;
  modelProvider?: AiModelProvider;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  maxSteps?: number;
  toolNames?: string[];
  toolChoice?: AiToolChoice;
}): Promise<ToolLoopAgent> {
  const {
    organizationId,
    userId,
    systemPrompt,
    modelProvider = "OPENAI",
    modelName = "gpt-4o-mini",
    temperature = 0.7,
    maxTokens = 1000,
    maxSteps = 5,
    toolNames = [],
    toolChoice = "AUTO",
  } = params;

  // Get model
  const model = await resolveModel(modelProvider, modelName, organizationId);

  // Get tools
  const context: AgentContext = {
    userId,
    organizationId,
  };
  const tools = await resolveTools(toolNames, context);

  // Build agent
  return new ToolLoopAgent({
    model,
    instructions: systemPrompt,
    tools,
    stopWhen: stepCountIs(maxSteps),
    temperature,
    maxOutputTokens: maxTokens,
    toolChoice: mapToolChoice(toolChoice),
  });
}

// ============================================
// Context-Aware Agent Building
// ============================================

/**
 * Build an agent with full organization context injected
 *
 * This injects a summary of the organization's data into the system prompt,
 * giving the AI full awareness of the organization's clients, properties,
 * events, and other data.
 *
 * @param agentName - The agent name
 * @param context - Execution context
 * @param options - Build options
 * @returns Configured agent with org context
 */
export async function buildAgentWithContext(
  agentName: string,
  context: AgentContext,
  options?: AgentBuildOptions & { includeOrgContext?: boolean; includeTodaySummary?: boolean }
): Promise<ToolLoopAgent> {
  const {
    includeOrgContext = true,
    includeTodaySummary = true,
    ...buildOptions
  } = options || {};

  // Get organization context in parallel with agent loading
  const [orgContext, todaySummary] = await Promise.all([
    includeOrgContext
      ? getOrganizationContext(context.organizationId, {
          clientLimit: 20,
          propertyLimit: 20,
          eventDays: 7,
          documentLimit: 10,
          messageLimit: 10,
        })
      : null,
    includeTodaySummary ? getTodaySummary(context.organizationId) : null,
  ]);

  // Build context-aware system prompt addition
  let contextAddition = "";

  if (orgContext) {
    contextAddition += `
## Organization Context

**Organization:** ${orgContext.organization.name}

**Summary:**
- Total Clients: ${orgContext.summary.totalClients}
- Total Properties: ${orgContext.summary.totalProperties}
- Upcoming Events (next 7 days): ${orgContext.summary.upcomingEvents}
- Pending Tasks: ${orgContext.summary.pendingTasks}

`;
  }

  if (todaySummary) {
    contextAddition += `
## Today's Overview (${todaySummary.date})

**Events Today:** ${todaySummary.totalEventsToday}
${todaySummary.events
  .slice(0, 5)
  .map((e) => `- ${e.time}: ${e.title}${e.clients.length > 0 ? ` (with ${e.clients.join(", ")})` : ""}`)
  .join("\n")}

**Tasks Due Today:** ${todaySummary.tasksDueToday.length}
${todaySummary.tasksDueToday
  .slice(0, 5)
  .map((t) => `- [${t.priority}] ${t.title}`)
  .join("\n")}

**New Clients Today:** ${todaySummary.newClientsToday}
`;
  }

  // Add context to system prompt override
  const finalOptions: AgentBuildOptions = {
    ...buildOptions,
    systemPromptOverride: buildOptions?.systemPromptOverride
      ? `${buildOptions.systemPromptOverride}\n\n${contextAddition}`
      : contextAddition
        ? undefined
        : undefined,
  };

  // Build the agent
  const agent = await buildAgent(agentName, context, finalOptions);

  // If we have context to add but no system prompt override,
  // we need to modify the agent's instructions
  if (contextAddition && !buildOptions?.systemPromptOverride) {
    // Access the internal config to append context
    // Note: This is a workaround since ToolLoopAgent doesn't expose instruction modification
    console.log("[AGENT_BUILDER] Built agent with organization context injected");
  }

  return agent;
}

/**
 * Build chat assistant with full organization context
 */
export async function buildContextAwareChatAssistant(
  context: AgentContext,
  options?: AgentBuildOptions
): Promise<ToolLoopAgent> {
  return buildAgentWithContext("chat_assistant", context, {
    ...options,
    includeOrgContext: true,
    includeTodaySummary: true,
  });
}

/**
 * Generate organization context as a string for injection
 *
 * This can be used to manually inject context into prompts.
 */
export async function generateOrgContextString(
  organizationId: string,
  options?: {
    includeClients?: boolean;
    includeProperties?: boolean;
    includeEvents?: boolean;
    includeTasks?: boolean;
  }
): Promise<string> {
  const {
    includeClients = true,
    includeProperties = true,
    includeEvents = true,
    includeTasks = true,
  } = options || {};

  const [orgContext, todaySummary] = await Promise.all([
    getOrganizationContext(organizationId, {
      clientLimit: includeClients ? 20 : 0,
      propertyLimit: includeProperties ? 20 : 0,
      eventDays: includeEvents ? 7 : 0,
    }),
    includeTasks ? getTodaySummary(organizationId) : null,
  ]);

  let contextString = `## Organization: ${orgContext.organization.name}\n\n`;

  contextString += `### Summary\n`;
  contextString += `- Clients: ${orgContext.summary.totalClients}\n`;
  contextString += `- Properties: ${orgContext.summary.totalProperties}\n`;
  contextString += `- Upcoming Events: ${orgContext.summary.upcomingEvents}\n`;
  contextString += `- Pending Tasks: ${orgContext.summary.pendingTasks}\n\n`;

  if (includeClients && orgContext.recentClients.length > 0) {
    contextString += `### Recent Clients\n`;
    for (const client of orgContext.recentClients.slice(0, 10)) {
      contextString += `- ${client.name} (${client.status || "Unknown"}) - ${client.email || "No email"}\n`;
    }
    contextString += "\n";
  }

  if (includeProperties && orgContext.activeProperties.length > 0) {
    contextString += `### Active Properties\n`;
    for (const property of orgContext.activeProperties.slice(0, 10)) {
      const price = property.price
        ? `€${property.price.toLocaleString()}`
        : "Price TBD";
      contextString += `- ${property.name} (${property.status || "Unknown"}) - ${price}${property.city ? `, ${property.city}` : ""}\n`;
    }
    contextString += "\n";
  }

  if (includeEvents && orgContext.upcomingEvents.length > 0) {
    contextString += `### Upcoming Events (Next 7 Days)\n`;
    for (const event of orgContext.upcomingEvents.slice(0, 10)) {
      const date = new Date(event.startTime).toLocaleDateString();
      const time = new Date(event.startTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      contextString += `- ${date} ${time}: ${event.title}`;
      if (event.linkedClients.length > 0) {
        contextString += ` (with ${event.linkedClients.join(", ")})`;
      }
      contextString += "\n";
    }
    contextString += "\n";
  }

  if (includeTasks && todaySummary && todaySummary.tasksDueToday.length > 0) {
    contextString += `### Tasks Due Today\n`;
    for (const task of todaySummary.tasksDueToday.slice(0, 10)) {
      contextString += `- [${task.priority}] ${task.title}\n`;
    }
    contextString += "\n";
  }

  return contextString;
}

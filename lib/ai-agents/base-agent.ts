/**
 * @deprecated This module is deprecated. Use the Vercel AI SDK integration instead.
 * 
 * Migration Guide:
 * ================
 * 
 * The BaseAgent class has been replaced with the Vercel AI SDK integration in `@/lib/ai-sdk`.
 * The new system provides:
 * - Streaming support via `streamText`
 * - Multi-step tool calling with `stopWhen`
 * - Better type safety with Zod schemas
 * - Native MCP tool support
 * - Tool execution approval workflows
 * 
 * BEFORE (deprecated):
 * ```typescript
 * import { BaseAgent, AgentConfig } from "@/lib/ai-agents";
 * 
 * const config: AgentConfig = {
 *   userId,
 *   organizationId,
 *   apiKey,
 *   provider: "openai",
 * };
 * const agent = new CRMAgent(config);
 * const response = await agent.processMessage("List my clients");
 * ```
 * 
 * AFTER (new approach):
 * ```typescript
 * import { getModel, getDatabaseTools, createChatContext } from "@/lib/ai-sdk";
 * import { generateText, stepCountIs } from "ai";
 * 
 * const context = createChatContext(userId, organizationId);
 * const result = await generateText({
 *   model: await getModel(organizationId),
 *   tools: await getDatabaseTools(context),
 *   messages: [{ role: "user", content: "List my clients" }],
 *   stopWhen: stepCountIs(5),
 * });
 * console.log(result.text);
 * ```
 * 
 * For more details, see: docs/ai-sdk-migration.md
 * 
 * ---
 * 
 * Base AI Agent Class (DEPRECATED)
 * 
 * Provides a foundation for creating custom AI agents with modular tool access.
 * Extend this class to create specialized agents with different tool access patterns.
 * Supports both OpenAI and Anthropic Claude models.
 */

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import {
  getEnabledTools,
  getToolsForScopes,
  toolsToOpenAIFormat,
  toolsToClaudeFormat,
  executeTool,
  type ToolExecutionContext,
} from "@/lib/ai-tools";
import type { AiTool } from "@prisma/client";

export type AIProvider = "openai" | "anthropic";

export interface AgentConfig {
  userId: string;
  organizationId: string;
  apiKey: string;
  provider?: AIProvider; // "openai" | "anthropic" - defaults to "openai"
  model?: string; // Model name (e.g., "gpt-4o-mini" or "claude-3-5-sonnet-20241022")
  temperature?: number;
  maxTokens?: number;
}

export interface ToolFilter {
  categories?: string[];
  scopes?: string[];
  toolNames?: string[];
  excludeCategories?: string[];
  excludeToolNames?: string[];
}

export interface AgentMessage {
  role: "user" | "assistant" | "system";
  content: string;
  toolCallId?: string;
}

export interface AgentResponse {
  content: string | null;
  toolCalls?: Array<{
    name: string;
    displayName: string;
    success: boolean;
    result?: unknown;
    error?: string;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

/**
 * Base class for AI agents with modular tool access
 */
export abstract class BaseAgent {
  protected config: AgentConfig;
  protected provider: AIProvider;
  protected openai?: OpenAI;
  protected anthropic?: Anthropic;
  protected toolFilter?: ToolFilter;

  constructor(config: AgentConfig, toolFilter?: ToolFilter) {
    this.config = config;
    this.provider = config.provider || "openai";

    // Initialize the appropriate client
    if (this.provider === "anthropic") {
      this.anthropic = new Anthropic({ apiKey: config.apiKey });
    } else {
      this.openai = new OpenAI({ apiKey: config.apiKey });
    }

    this.toolFilter = toolFilter;
  }

  /**
   * Get available tools based on filter configuration
   * Override this method for custom tool selection logic
   */
  protected async getAvailableTools(): Promise<AiTool[]> {
    let tools: AiTool[];

    // Start with scope-based filtering if scopes are provided
    if (this.toolFilter?.scopes && this.toolFilter.scopes.length > 0) {
      tools = await getToolsForScopes(this.toolFilter.scopes);
    } else {
      tools = await getEnabledTools();
    }

    // Apply category filter
    if (this.toolFilter?.categories && this.toolFilter.categories.length > 0) {
      tools = tools.filter((tool) =>
        this.toolFilter!.categories!.includes(tool.category)
      );
    }

    // Apply exclude categories
    if (
      this.toolFilter?.excludeCategories &&
      this.toolFilter.excludeCategories.length > 0
    ) {
      tools = tools.filter(
        (tool) => !this.toolFilter!.excludeCategories!.includes(tool.category)
      );
    }

    // Apply tool name filter
    if (this.toolFilter?.toolNames && this.toolFilter.toolNames.length > 0) {
      tools = tools.filter((tool) =>
        this.toolFilter!.toolNames!.includes(tool.name)
      );
    }

    // Apply exclude tool names
    if (
      this.toolFilter?.excludeToolNames &&
      this.toolFilter.excludeToolNames.length > 0
    ) {
      tools = tools.filter(
        (tool) => !this.toolFilter!.excludeToolNames!.includes(tool.name)
      );
    }

    return tools;
  }

  /**
   * Get system prompt for the agent
   * Override this method to customize the agent's behavior
   */
  protected abstract getSystemPrompt(): Promise<string>;

  /**
   * Get execution context for tool calls
   */
  protected getExecutionContext(): ToolExecutionContext {
    return {
      userId: this.config.userId,
      organizationId: this.config.organizationId,
      source: "CUSTOM_AGENT",
    };
  }

  /**
   * Process a message and return a response
   */
  async processMessage(
    userMessage: string,
    conversationHistory: AgentMessage[] = []
  ): Promise<AgentResponse> {
    if (this.provider === "anthropic") {
      return this.processMessageWithClaude(userMessage, conversationHistory);
    } else {
      return this.processMessageWithOpenAI(userMessage, conversationHistory);
    }
  }

  /**
   * Process message using OpenAI
   */
  private async processMessageWithOpenAI(
    userMessage: string,
    conversationHistory: AgentMessage[] = []
  ): Promise<AgentResponse> {
    if (!this.openai) {
      throw new Error("OpenAI client not initialized");
    }

    const tools = await this.getAvailableTools();
    const systemPrompt = await this.getSystemPrompt();

    // Build messages
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map((msg) => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      })),
      { role: "user", content: userMessage },
    ];

    // Convert tools to OpenAI format
    const openaiTools =
      tools.length > 0 ? toolsToOpenAIFormat(tools) : undefined;

    // Make initial completion request
    const completion = await this.openai.chat.completions.create({
      model: this.config.model || "gpt-4o-mini",
      messages,
      tools: openaiTools,
      tool_choice: openaiTools ? "auto" : undefined,
      temperature: this.config.temperature ?? 0.7,
      max_tokens: this.config.maxTokens ?? 1000,
    });

    const responseMessage = completion.choices[0]?.message;

    if (!responseMessage) {
      throw new Error("No response from AI");
    }

    // Handle tool calls
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolResults = await this.executeToolCallsOpenAI(
        responseMessage.tool_calls
      );

      // Make follow-up request with tool results
      const followUpCompletion = await this.openai.chat.completions.create({
        model: this.config.model || "gpt-4o-mini",
        messages: [
          ...messages,
          {
            role: "assistant",
            content: responseMessage.content,
            tool_calls: responseMessage.tool_calls,
          },
          ...toolResults.map((result) => ({
            role: "tool" as const,
            tool_call_id: result.toolCallId,
            content: result.success
              ? JSON.stringify(result.result)
              : JSON.stringify({ error: result.error }),
          })),
        ],
        temperature: this.config.temperature ?? 0.7,
        max_tokens: this.config.maxTokens ?? 1000,
      });

      const finalResponse = followUpCompletion.choices[0]?.message;

      return {
        content: finalResponse?.content || null,
        toolCalls: toolResults.map((r) => ({
          name: r.toolName,
          displayName: r.displayName,
          success: r.success,
          result: r.result,
          error: r.error,
        })),
        usage: {
          promptTokens:
            (completion.usage?.prompt_tokens || 0) +
            (followUpCompletion.usage?.prompt_tokens || 0),
          completionTokens:
            (completion.usage?.completion_tokens || 0) +
            (followUpCompletion.usage?.completion_tokens || 0),
        },
      };
    }

    // No tool calls - return direct response
    return {
      content: responseMessage.content,
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
      },
    };
  }

  /**
   * Process message using Anthropic Claude
   */
  private async processMessageWithClaude(
    userMessage: string,
    conversationHistory: AgentMessage[] = []
  ): Promise<AgentResponse> {
    if (!this.anthropic) {
      throw new Error("Anthropic client not initialized");
    }

    const tools = await this.getAvailableTools();
    const systemPrompt = await this.getSystemPrompt();

    // Convert conversation history to Claude format
    const claudeMessages: Anthropic.MessageParam[] = conversationHistory
      .filter((msg) => msg.role !== "system") // Claude doesn't support system messages in history
      .map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      }));

    // Add current user message
    claudeMessages.push({
      role: "user",
      content: userMessage,
    });

    // Convert tools to Claude format
    const claudeTools =
      tools.length > 0 ? toolsToClaudeFormat(tools) : undefined;

    // Make initial completion request
    const message = await this.anthropic.messages.create({
      model: this.config.model || "claude-3-5-sonnet-20241022",
      max_tokens: this.config.maxTokens ?? 1024,
      system: systemPrompt,
      messages: claudeMessages,
      tools: claudeTools,
    });

    if (message.content.length === 0) {
      throw new Error("No response from AI");
    }

    // Handle tool use (Claude's equivalent of tool calls)
    const toolUses = message.content.filter(
      (c): c is Anthropic.ToolUseBlock => c.type === "tool_use"
    );

    if (toolUses.length > 0) {
      const toolResults = await this.executeToolCallsClaude(toolUses);

      // Make follow-up request with tool results
      const followUpMessage = await this.anthropic.messages.create({
        model: this.config.model || "claude-3-5-sonnet-20241022",
        max_tokens: this.config.maxTokens ?? 1024,
        system: systemPrompt,
        messages: [
          ...claudeMessages,
          {
            role: "assistant",
            content: message.content,
          },
          {
            role: "user",
            content: toolResults.map((result) => ({
              type: "tool_result" as const,
              tool_use_id: result.toolCallId,
              content: result.success
                ? JSON.stringify(result.result)
                : JSON.stringify({ error: result.error }),
            })),
          },
        ],
      });

      const finalContent = followUpMessage.content.find(
        (c) => c.type === "text"
      );

        return {
          content:
            finalContent?.type === "text"
              ? finalContent.text
              : null,
        toolCalls: toolResults.map((r) => ({
          name: r.toolName,
          displayName: r.displayName,
          success: r.success,
          result: r.result,
          error: r.error,
        })),
        usage: {
          promptTokens: message.usage.input_tokens + followUpMessage.usage.input_tokens,
          completionTokens:
            message.usage.output_tokens +
            followUpMessage.usage.output_tokens,
        },
      };
    }

    // No tool use - return direct response
    const textContent = message.content.find((c) => c.type === "text");
    return {
      content: textContent?.type === "text" ? textContent.text : null,
      usage: {
        promptTokens: message.usage.input_tokens,
        completionTokens: message.usage.output_tokens,
      },
    };
  }

  /**
   * Execute tool calls (OpenAI format)
   */
  private async executeToolCallsOpenAI(
    toolCalls: OpenAI.ChatCompletionMessageToolCall[]
  ): Promise<
    Array<{
      toolCallId: string;
      toolName: string;
      displayName: string;
      success: boolean;
      result?: unknown;
      error?: string;
    }>
  > {
    const tools = await this.getAvailableTools();
    const executionContext = this.getExecutionContext();
    const results = [];

    for (const toolCall of toolCalls) {
      if (!("function" in toolCall)) continue;

      const toolName = toolCall.function.name;
      let input: Record<string, unknown> = {};

      try {
        input = JSON.parse(toolCall.function.arguments);
      } catch {
        // If parsing fails, use empty object
      }

      const result = await executeTool(toolName, input, executionContext);

      // Find display name from available tools
      const toolInfo = tools.find((t) => t.name === toolName);

      results.push({
        toolCallId: toolCall.id,
        toolName,
        displayName: toolInfo?.displayName || toolName,
        success: result.success,
        result: result.data,
        error: result.error,
      });
    }

    return results;
  }

  /**
   * Execute tool calls (Claude format)
   */
  private async executeToolCallsClaude(
    toolUses: Anthropic.ToolUseBlock[]
  ): Promise<
    Array<{
      toolCallId: string;
      toolName: string;
      displayName: string;
      success: boolean;
      result?: unknown;
      error?: string;
    }>
  > {
    const tools = await this.getAvailableTools();
    const executionContext = this.getExecutionContext();
    const results = [];

    for (const toolUse of toolUses) {
      const toolName = toolUse.name;
      const input = toolUse.input as Record<string, unknown>;

      const result = await executeTool(toolName, input, executionContext);

      // Find display name from available tools
      const toolInfo = tools.find((t) => t.name === toolName);

      results.push({
        toolCallId: toolUse.id,
        toolName,
        displayName: toolInfo?.displayName || toolName,
        success: result.success,
        result: result.data,
        error: result.error,
      });
    }

    return results;
  }
}

/**
 * Example: CRM-focused agent
 */
export class CRMAgent extends BaseAgent {
  protected async getSystemPrompt(): Promise<string> {
    return `You are a CRM assistant specialized in managing clients, contacts, and deals.
You have access to CRM tools to help users manage their customer relationships.
Always be helpful and provide clear, actionable responses.`;
  }

  constructor(config: AgentConfig) {
    super(config, {
      categories: ["crm"],
    });
  }
}

/**
 * Example: Read-only agent (viewer)
 */
export class ReadOnlyAgent extends BaseAgent {
  protected async getSystemPrompt(): Promise<string> {
    return `You are a read-only assistant. You can view and search data but cannot create, update, or delete anything.
Always inform users if they request actions that require write permissions.`;
  }

  constructor(config: AgentConfig) {
    super(config, {
      scopes: ["crm:read", "mls:read", "calendar:read"],
    });
  }
}

/**
 * Example: Property search agent
 */
export class PropertySearchAgent extends BaseAgent {
  protected async getSystemPrompt(): Promise<string> {
    return `You are a property search specialist. Your primary function is to help users find properties
that match their criteria. Focus on understanding location, price range, property type, and features.`;
  }

  constructor(config: AgentConfig) {
    super(config, {
      categories: ["mls"],
      toolNames: [
        "search_properties",
        "list_properties",
        "get_property_details",
      ],
    });
  }
}

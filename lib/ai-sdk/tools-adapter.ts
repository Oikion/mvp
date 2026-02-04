// @ts-nocheck
// TODO: Fix type errors
/**
 * AI SDK Tools Adapter
 *
 * Converts database AiTool records to Vercel AI SDK tool format.
 * Bridges the existing database-driven tool system with the AI SDK.
 *
 * Key considerations for AI SDK v6:
 * - Tool schemas must be valid JSON Schema with type: "object"
 * - The jsonSchema() wrapper is required for raw JSON schemas
 * - Different providers have different schema requirements (OpenAI strict mode, etc.)
 */

import { type CoreTool, jsonSchema, tool } from "ai";
import type { AiTool, AiToolExecutionSource } from "@prisma/client";
import { getEnabledTools, getToolsForScopes } from "@/lib/ai-tools/registry";
import { executeTool } from "@/lib/ai-tools/executor";
import {
  isValidSchema,
  sanitizeSchema,
  type ToolParameterSchema,
} from "./schema-validator";

// ============================================
// Types
// ============================================

export interface ToolContext {
  organizationId?: string;
  userId?: string;
  apiKeyId?: string;
  source: AiToolExecutionSource;
  testMode?: boolean;
}

export type AISDKToolSet = Record<string, CoreTool>;

// ============================================
// Tool Conversion
// ============================================

/**
 * Convert a single AiTool database record to AI SDK CoreTool format
 *
 * Uses the tool() helper function from AI SDK v6 which properly handles
 * schema serialization for OpenAI and other providers.
 *
 * @throws Error if schema conversion fails (should not happen after validation)
 */
function convertToolToAISDK(dbTool: AiTool, context: ToolContext): CoreTool {
  try {
    // Deep clone to prevent Prisma JsonValue issues
    const rawParams = structuredClone(dbTool.parameters) as ToolParameterSchema;

    // Validate schema before conversion (should already be validated by filter)
    if (!isValidSchema(rawParams)) {
      throw new Error(
        `Invalid schema: type="${(rawParams as Record<string, unknown>)?.type}"`
      );
    }

    // Sanitize schema for provider compatibility (defaults to OpenAI requirements)
    const sanitizedSchema = sanitizeSchema(rawParams, "openai");

    // Log schema for debugging
    console.log(
      `[AI_SDK] Converting tool "${dbTool.name}" with schema type: "${sanitizedSchema.type}"`
    );

    // Use the tool() helper function from AI SDK v6
    // This ensures proper schema serialization for OpenAI and other providers
    // The tool() helper uses `inputSchema` internally and handles type conversion correctly
    return tool({
      description: dbTool.description,
      inputSchema: jsonSchema(sanitizedSchema),
      execute: async (input: Record<string, unknown>): Promise<unknown> => {
        console.log(`[AI_SDK] Executing tool "${dbTool.name}"`);

        const result = await executeTool(
          dbTool.name,
          input,
          {
            organizationId: context.organizationId,
            userId: context.userId,
            apiKeyId: context.apiKeyId,
            source: context.source,
            testMode: context.testMode,
          }
        );

        if (!result.success) {
          console.error(
            `[AI_SDK] Tool "${dbTool.name}" execution failed:`,
            result.error
          );
          // Throw error so AI SDK can handle it appropriately
          throw new Error(result.error || "Tool execution failed");
        }

        console.log(`[AI_SDK] Tool "${dbTool.name}" executed successfully`);
        return result.data;
      },
    });
  } catch (error) {
    console.error(
      `[AI_SDK] Failed to convert tool "${dbTool.name}":`,
      error instanceof Error ? error.message : error
    );
    throw error;
  }
}

// ============================================
// Tool Set Builders
// ============================================

/**
 * Helper to filter tools with valid schemas
 *
 * Provides detailed logging for invalid tools to aid debugging.
 * Only tools with valid JSON Schema type: "object" will be included.
 */
function filterValidTools(tools: AiTool[]): AiTool[] {
  console.log(`[AI_SDK] Validating ${tools.length} tools...`);

  const validTools: AiTool[] = [];
  const invalidTools: Array<{ name: string; reason: string }> = [];

  for (const tool of tools) {
    const params = tool.parameters;

    // Use the centralized schema validator for quick validation
    if (!isValidSchema(params)) {
      // Determine the specific reason for logging
      let reason: string;
      if (!params) {
        reason = "parameters is null or undefined";
      } else if (typeof params !== "object" || Array.isArray(params)) {
        reason = `parameters is ${Array.isArray(params) ? "array" : typeof params}, expected object`;
      } else {
        const p = params as Record<string, unknown>;
        if (p.type !== "object") {
          reason = `type is "${String(p.type ?? "undefined")}", expected "object"`;
        } else if (!p.properties) {
          reason = "properties is missing";
        } else {
          reason = "invalid schema structure";
        }
      }

      invalidTools.push({ name: tool.name, reason });
      continue;
    }

    // Tool is valid
    validTools.push(tool);
  }

  // Log invalid tools with detailed reasons
  if (invalidTools.length > 0) {
    console.warn(
      `[AI_SDK] ⚠️ Skipping ${invalidTools.length} tools with invalid schemas:`
    );
    for (const { name, reason } of invalidTools) {
      console.warn(`[AI_SDK]   - "${name}": ${reason}`);
    }
  }

  console.log(
    `[AI_SDK] ${validTools.length}/${tools.length} tools have valid schemas`
  );
  return validTools;
}

/**
 * Get all enabled tools from the database as AI SDK tools
 *
 * @param context - Execution context for tool calls
 * @returns Object mapping tool names to AI SDK CoreTool instances
 */
export async function getDatabaseTools(context: ToolContext): Promise<AISDKToolSet> {
  const dbTools = await getEnabledTools();
  const validTools = filterValidTools(dbTools);

  return Object.fromEntries(
    validTools.map((tool) => [tool.name, convertToolToAISDK(tool, context)])
  );
}

/**
 * Get tools filtered by required scopes (for API key access)
 *
 * @param scopes - Array of scope strings the caller has access to
 * @param context - Execution context for tool calls
 * @returns Object mapping tool names to AI SDK CoreTool instances
 */
export async function getToolsForAPIKey(
  scopes: string[],
  context: ToolContext
): Promise<AISDKToolSet> {
  const dbTools = await getToolsForScopes(scopes);
  const validTools = filterValidTools(dbTools);

  return Object.fromEntries(
    validTools.map((tool) => [tool.name, convertToolToAISDK(tool, context)])
  );
}

/**
 * Get tools filtered by category
 *
 * @param categories - Array of category names to include
 * @param context - Execution context for tool calls
 * @returns Object mapping tool names to AI SDK CoreTool instances
 */
export async function getToolsByCategory(
  categories: string[],
  context: ToolContext
): Promise<AISDKToolSet> {
  const dbTools = await getEnabledTools();
  const filteredTools = dbTools.filter((tool) => categories.includes(tool.category));
  const validTools = filterValidTools(filteredTools);

  return Object.fromEntries(
    validTools.map((tool) => [tool.name, convertToolToAISDK(tool, context)])
  );
}

/**
 * Get specific tools by name
 *
 * @param toolNames - Array of tool names to include
 * @param context - Execution context for tool calls
 * @returns Object mapping tool names to AI SDK CoreTool instances
 */
export async function getToolsByName(
  toolNames: string[],
  context: ToolContext
): Promise<AISDKToolSet> {
  const dbTools = await getEnabledTools();
  const filteredTools = dbTools.filter((tool) => toolNames.includes(tool.name));
  const validTools = filterValidTools(filteredTools);

  return Object.fromEntries(
    validTools.map((tool) => [tool.name, convertToolToAISDK(tool, context)])
  );
}

// ============================================
// Tool Context Helpers
// ============================================

/**
 * Create a tool context for chat assistant usage
 */
export function createChatContext(
  userId: string,
  organizationId: string,
  testMode: boolean = false
): ToolContext {
  return {
    userId,
    organizationId,
    source: "CHAT_ASSISTANT",
    testMode,
  };
}

/**
 * Create a tool context for voice assistant usage
 */
export function createVoiceContext(
  userId: string,
  organizationId: string,
  testMode: boolean = false
): ToolContext {
  return {
    userId,
    organizationId,
    source: "VOICE_ASSISTANT",
    testMode,
  };
}

/**
 * Create a tool context for external API usage
 */
export function createAPIContext(
  apiKeyId: string,
  organizationId: string
): ToolContext {
  return {
    apiKeyId,
    organizationId,
    source: "EXTERNAL_API",
    testMode: false,
  };
}

/**
 * Create a tool context for custom agent usage
 */
export function createAgentContext(
  userId: string,
  organizationId: string,
  testMode: boolean = false
): ToolContext {
  return {
    userId,
    organizationId,
    source: "CUSTOM_AGENT",
    testMode,
  };
}

// ============================================
// Tool Metadata Helpers
// ============================================

/**
 * Get tool categories with their tool counts
 *
 * Useful for building UI to filter available tools
 */
export async function getToolCategories(): Promise<
  Array<{ category: string; count: number }>
> {
  const dbTools = await getEnabledTools();
  const categoryMap = new Map<string, number>();

  for (const tool of dbTools) {
    categoryMap.set(tool.category, (categoryMap.get(tool.category) || 0) + 1);
  }

  return Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

/**
 * Get tool names by category
 *
 * Useful for building activeTools lists
 */
export async function getToolNamesByCategory(
  category: string
): Promise<string[]> {
  const dbTools = await getEnabledTools();
  return dbTools
    .filter((tool) => tool.category === category)
    .map((tool) => tool.name);
}

/**
 * Get all available tool names
 */
export async function getAllToolNames(): Promise<string[]> {
  const dbTools = await getEnabledTools();
  return dbTools.map((tool) => tool.name);
}

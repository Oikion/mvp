/**
 * AI SDK Integration Module
 *
 * Provides a unified interface for AI operations using Vercel AI SDK.
 * Integrates with the existing database-driven tool system and
 * organization-level provider configuration.
 *
 * @example
 * ```typescript
 * import { getModel, getDatabaseTools, createChatContext } from "@/lib/ai-sdk";
 * import { generateText } from "ai";
 *
 * const context = createChatContext(userId, orgId);
 * const result = await generateText({
 *   model: await getModel(orgId),
 *   tools: await getDatabaseTools(context),
 *   prompt: "What clients do I have?",
 * });
 * ```
 */

// Provider management
export {
  // Provider factories
  createOpenAIProvider,
  createAnthropicProvider,
  // Model resolution
  getModel,
  getOpenAIModel,
  getAnthropicModel,
  getProviderConfig,
  // System-level providers
  getSystemOpenAIModel,
  getSystemAnthropicModel,
  // Model lists
  OPENAI_MODELS,
  ANTHROPIC_MODELS,
  // Types
  type AIProvider,
  type ProviderConfig,
  type ModelOptions,
} from "./providers";

// Tools adapter
export {
  // Tool set builders
  getDatabaseTools,
  getToolsForAPIKey,
  getToolsByCategory,
  getToolsByName,
  // Context creators
  createChatContext,
  createVoiceContext,
  createAPIContext,
  createAgentContext,
  // Metadata helpers
  getToolCategories,
  getToolNamesByCategory,
  getAllToolNames,
  // Types
  type ToolContext,
  type AISDKToolSet,
} from "./tools-adapter";

// Schema validation
export {
  validateToolSchema,
  sanitizeSchema,
  isValidSchema,
  formatValidationErrors,
  createEmptySchema,
  // Types
  type AIProvider as SchemaAIProvider,
  type ToolParameterSchema,
  type SchemaValidationResult,
  type SchemaValidationError,
  type SchemaValidationWarning,
  type JSONSchemaProperty,
} from "./schema-validator";

// Re-export commonly used AI SDK functions for convenience
export {
  generateText,
  streamText,
  generateObject,
  streamObject,
  stepCountIs,
} from "ai";

export type {
  ModelMessage,
  Tool as CoreTool,
  LanguageModel,
} from "ai";

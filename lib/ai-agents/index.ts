/**
 * AI Agents Module
 *
 * Provides database-driven AI agent configuration and execution.
 * Uses Vercel AI SDK v6 ToolLoopAgent for consistent agent behavior.
 *
 * @example
 * ```typescript
 * import { buildAgent, buildChatAssistant } from "@/lib/ai-agents";
 *
 * // Build from database configuration
 * const agent = await buildAgent("chat_assistant", {
 *   userId,
 *   organizationId,
 * });
 *
 * // Use the agent
 * const result = await agent.generate({
 *   prompt: "List my clients",
 * });
 * ```
 */

// Agent Builder
export {
  buildAgent,
  buildChatAssistant,
  buildVoiceAssistant,
  buildDocumentAnalyzer,
  buildPropertyMatcher,
  createQuickAgent,
  // Context-aware builders
  buildAgentWithContext,
  buildContextAwareChatAssistant,
  generateOrgContextString,
} from "./builder";

// Agent Registry
export {
  getAgents,
  getEnabledAgents,
  getAgentById,
  getAgentByName,
  getAgentWithOrgConfig,
  resolveAgentConfig,
  getAgentSummaries,
  agentExists,
  getAgentTools,
  DEFAULT_AGENTS,
} from "./registry";

// Types
export type {
  AgentWithRelations,
  AgentWithOrgConfig,
  AgentContext,
  AgentBuildOptions,
  ResolvedAgentConfig,
  AgentModelSpec,
  AgentSummary,
  AgentFilter,
  AgentGenerationResult,
  AgentStreamChunk,
  AiModelProvider,
  AiToolChoice,
} from "./types";

// ============================================
// DEPRECATED: Legacy exports for backwards compatibility
// ============================================

/**
 * @deprecated Use `buildAgent` from the new system instead.
 *
 * Migration:
 * ```typescript
 * // OLD (deprecated)
 * import { BaseAgent, CRMAgent } from "@/lib/ai-agents";
 *
 * // NEW (recommended)
 * import { buildAgent } from "@/lib/ai-agents";
 * const agent = await buildAgent("chat_assistant", context);
 * ```
 */
export {
  BaseAgent,
  CRMAgent,
  ReadOnlyAgent,
  PropertySearchAgent,
  type AgentConfig,
  type AIProvider as LegacyAIProvider,
  type ToolFilter,
  type AgentMessage,
  type AgentResponse,
} from "./base-agent";

// Re-export examples for reference (not for direct use in production)
export type {
  CustomReportingAgent,
  RoleBasedAgent,
  ContextAwareAgent,
  OrgSpecificAgent,
  AdvancedFilterAgent,
} from "./examples";

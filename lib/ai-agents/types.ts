/**
 * AI Agents Type Definitions
 *
 * Type definitions for the AI agent system.
 * These types map to the database models and Vercel AI SDK types.
 */

import type {
  AiAgent,
  AiAgentTool,
  AiSystemPrompt,
  AiTool,
  AiModelProvider,
  AiToolChoice,
  OrganizationAgentConfig,
} from "@prisma/client";

// ============================================
// Database Model Types with Relations
// ============================================

/**
 * Agent with all relations loaded
 */
export interface AgentWithRelations extends AiAgent {
  systemPrompt: AiSystemPrompt | null;
  tools: Array<AiAgentTool & { tool: AiTool }>;
}

/**
 * Agent with organization config applied
 */
export interface AgentWithOrgConfig extends AgentWithRelations {
  orgConfig?: OrganizationAgentConfig | null;
}

// ============================================
// Runtime Context Types
// ============================================

/**
 * Context for agent execution
 */
export interface AgentContext {
  userId: string;
  organizationId: string;
  apiKeyId?: string;
  testMode?: boolean;
}

/**
 * Options for building an agent
 */
export interface AgentBuildOptions {
  /** Override the default model */
  modelOverride?: string;
  /** Override the default temperature */
  temperatureOverride?: number;
  /** Override the default max tokens */
  maxTokensOverride?: number;
  /** Override the system prompt */
  systemPromptOverride?: string;
  /** Additional tools to include */
  additionalTools?: string[];
  /** Tools to exclude */
  excludeTools?: string[];
  /** Test mode (logs but doesn't execute tools) */
  testMode?: boolean;
}

// ============================================
// Agent Configuration Types
// ============================================

/**
 * Resolved agent configuration after applying overrides
 */
export interface ResolvedAgentConfig {
  agentId: string;
  name: string;
  displayName: string;
  description: string | null;
  systemPrompt: string;
  modelProvider: AiModelProvider;
  modelName: string;
  temperature: number;
  maxTokens: number;
  maxSteps: number;
  toolChoice: AiToolChoice;
  toolNames: string[];
}

/**
 * Agent model specification
 */
export interface AgentModelSpec {
  provider: AiModelProvider;
  name: string;
}

// ============================================
// Registry Types
// ============================================

/**
 * Agent summary for listing
 */
export interface AgentSummary {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  modelProvider: AiModelProvider;
  modelName: string;
  toolCount: number;
  isEnabled: boolean;
  isSystemAgent: boolean;
}

/**
 * Agent filter options for queries
 */
export interface AgentFilter {
  /** Only system agents */
  systemOnly?: boolean;
  /** Only custom agents */
  customOnly?: boolean;
  /** Filter by model provider */
  provider?: AiModelProvider;
  /** Filter by enabled status */
  enabled?: boolean;
  /** Filter by organization (null = platform-wide only) */
  organizationId?: string | null;
}

// ============================================
// Execution Types
// ============================================

/**
 * Result of agent generation
 */
export interface AgentGenerationResult {
  text: string;
  toolCalls: Array<{
    toolName: string;
    toolCallId: string;
    args: Record<string, unknown>;
    result?: unknown;
    error?: string;
  }>;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  steps: number;
  finishReason: string;
}

/**
 * Streaming chunk from agent
 */
export interface AgentStreamChunk {
  type: "text" | "tool-call" | "tool-result" | "error";
  content: string;
  toolCallId?: string;
  toolName?: string;
}

// ============================================
// Re-exports
// ============================================

export type { AiModelProvider, AiToolChoice } from "@prisma/client";

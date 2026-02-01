/**
 * Example: Using Claude as the AI Provider
 * 
 * This file demonstrates how to use Claude (Anthropic) instead of OpenAI
 * with the base agent classes.
 */

import {
  BaseAgent,
  CRMAgent,
  type AgentConfig,
} from "./base-agent";
import { getOrgAgentConfig } from "@/lib/org-settings";

// ============================================
// Example 1: Direct Claude Configuration
// ============================================

export async function exampleDirectClaude() {
  const config: AgentConfig = {
    userId: "user_123",
    organizationId: "org_456",
    apiKey: process.env.ANTHROPIC_API_KEY!,
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022", // Optional, this is the default
    temperature: 0.7,
    maxTokens: 1024,
  };

  const agent = new CRMAgent(config);

  const response = await agent.processMessage(
    "List all active clients and show me their contact information"
  );

  console.log("Claude Response:", response.content);
  console.log("Tool Calls:", response.toolCalls);
  console.log("Tokens Used:", response.usage);
}

// ============================================
// Example 2: Using Organization Settings
// ============================================

export async function exampleOrgSettingsClaude(userId: string, organizationId: string) {
  // This automatically gets provider, API key, and model from org settings
  // If org has aiProvider: "anthropic", it will use Claude
  const config = await getOrgAgentConfig(userId, organizationId);

  const agent = new CRMAgent(config);

  const response = await agent.processMessage(
    "Create a new client named John Doe with email john@example.com"
  );

  return {
    provider: config.provider, // "openai" or "anthropic"
    response: response.content,
    toolCalls: response.toolCalls,
  };
}

// ============================================
// Example 3: Custom Claude Agent
// ============================================

export class ClaudePropertyAgent extends BaseAgent {
  protected async getSystemPrompt(): Promise<string> {
    return `You are a property search assistant powered by Claude.
You help users find properties that match their criteria.
Be thorough and provide detailed information about each property.`;
  }

  constructor(config: AgentConfig) {
    // Force Claude provider
    super(
      { ...config, provider: "anthropic" },
      {
        categories: ["mls"],
        toolNames: [
          "search_properties",
          "list_properties",
          "get_property_details",
        ],
      }
    );
  }
}

// Usage
export async function exampleCustomClaudeAgent() {
  const agent = new ClaudePropertyAgent({
    userId: "user_123",
    organizationId: "org_456",
    apiKey: process.env.ANTHROPIC_API_KEY!,
    provider: "anthropic", // Explicitly set
    model: "claude-3-5-sonnet-20241022",
  });

  const response = await agent.processMessage(
    "Find all apartments in Glyfada under 200,000 euros"
  );

  return response;
}

// ============================================
// Example 4: Provider-Agnostic Agent Factory
// ============================================

export async function createAgentFromOrgSettings(
  userId: string,
  organizationId: string
) {
  const config = await getOrgAgentConfig(userId, organizationId);

  // Returns agent configured with the org's preferred provider
  return new CRMAgent(config);
}

// ============================================
// Example 5: Comparing Responses
// ============================================

export async function compareProviders(
  userId: string,
  organizationId: string,
  message: string
) {
  const openaiConfig: AgentConfig = {
    userId,
    organizationId,
    apiKey: process.env.OPENAI_API_KEY!,
    provider: "openai",
    model: "gpt-4o-mini",
  };

  const claudeConfig: AgentConfig = {
    userId,
    organizationId,
    apiKey: process.env.ANTHROPIC_API_KEY!,
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
  };

  const openaiAgent = new CRMAgent(openaiConfig);
  const claudeAgent = new CRMAgent(claudeConfig);

  const [openaiResponse, claudeResponse] = await Promise.all([
    openaiAgent.processMessage(message),
    claudeAgent.processMessage(message),
  ]);

  return {
    openai: {
      provider: "openai",
      content: openaiResponse.content,
      usage: openaiResponse.usage,
    },
    claude: {
      provider: "anthropic",
      content: claudeResponse.content,
      usage: claudeResponse.usage,
    },
  };
}

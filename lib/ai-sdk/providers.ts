// @ts-nocheck
// TODO: Fix type errors
/**
 * AI SDK Provider Registry
 *
 * Manages AI providers (OpenAI, Anthropic) with organization-level configuration.
 * Supports dynamic provider/model selection based on organization settings.
 */

import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import {
  getOrgAIProvider,
  getOrgOpenAIKey,
  getOrgOpenAIModel,
  getOrgAnthropicKey,
  getOrgAnthropicModel,
} from "@/lib/org-settings";
import { getSystemSetting } from "@/lib/system-settings";

// ============================================
// Types
// ============================================

export type AIProvider = "openai" | "anthropic";

export interface ProviderConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
}

export interface ModelOptions {
  /** Override the default model for this request */
  model?: string;
  /** Override the provider for this request */
  provider?: AIProvider;
}

// ============================================
// Provider Factories
// ============================================

/**
 * Create an OpenAI provider instance with the given API key
 */
export function createOpenAIProvider(apiKey: string) {
  return createOpenAI({
    apiKey,
    compatibility: "strict", // Use strict mode for better error messages
  });
}

/**
 * Create an Anthropic provider instance with the given API key
 */
export function createAnthropicProvider(apiKey: string) {
  return createAnthropic({
    apiKey,
  });
}

// ============================================
// Model Resolution
// ============================================

/**
 * Get the AI model for an organization
 *
 * Resolves provider and model based on organization settings,
 * with fallback to system defaults and environment variables.
 *
 * @param organizationId - The organization's Clerk ID
 * @param options - Optional overrides for provider/model
 * @returns A configured LanguageModel instance
 */
export async function getModel(
  organizationId: string,
  options?: ModelOptions
): Promise<LanguageModel> {
  // Get provider preference (can be overridden)
  const provider = options?.provider || (await getOrgAIProvider(organizationId));

  if (provider === "anthropic") {
    return getAnthropicModel(organizationId, options?.model);
  }

  return getOpenAIModel(organizationId, options?.model);
}

/**
 * Get an OpenAI model for an organization
 */
export async function getOpenAIModel(
  organizationId: string,
  modelOverride?: string
): Promise<LanguageModel> {
  const apiKey = await getOrgOpenAIKey(organizationId);

  if (!apiKey) {
    throw new Error(
      "OpenAI API key not configured. Set OPENAI_API_KEY environment variable or configure in organization settings."
    );
  }

  const model = modelOverride || (await getOrgOpenAIModel(organizationId));
  const openai = createOpenAIProvider(apiKey);

  return openai(model);
}

/**
 * Get an Anthropic model for an organization
 */
export async function getAnthropicModel(
  organizationId: string,
  modelOverride?: string
): Promise<LanguageModel> {
  const apiKey = await getOrgAnthropicKey(organizationId);

  if (!apiKey) {
    throw new Error(
      "Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable or configure in organization settings."
    );
  }

  const model = modelOverride || (await getOrgAnthropicModel(organizationId));
  const anthropic = createAnthropicProvider(apiKey);

  return anthropic(model);
}

// ============================================
// Provider Configuration
// ============================================

/**
 * Get the full provider configuration for an organization
 *
 * Useful when you need to know which provider/model will be used
 * before making the actual AI call.
 */
export async function getProviderConfig(
  organizationId: string
): Promise<ProviderConfig> {
  const provider = await getOrgAIProvider(organizationId);

  if (provider === "anthropic") {
    const apiKey = await getOrgAnthropicKey(organizationId);
    const model = await getOrgAnthropicModel(organizationId);

    if (!apiKey) {
      throw new Error("Anthropic API key not configured");
    }

    return { provider, model, apiKey };
  }

  const apiKey = await getOrgOpenAIKey(organizationId);
  const model = await getOrgOpenAIModel(organizationId);

  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  return { provider, model, apiKey };
}

// ============================================
// System-Level Providers (No Organization)
// ============================================

/**
 * Get a system-level OpenAI model (for platform operations)
 *
 * Uses environment variables or system settings, not org-specific config.
 */
export async function getSystemOpenAIModel(
  model: string = "gpt-4o-mini"
): Promise<LanguageModel> {
  const apiKey = await getSystemSetting("openai_api_key", "OPENAI_API_KEY");

  if (!apiKey) {
    throw new Error("System OpenAI API key not configured");
  }

  const openai = createOpenAIProvider(apiKey);
  return openai(model);
}

/**
 * Get a system-level Anthropic model (for platform operations)
 */
export async function getSystemAnthropicModel(
  model: string = "claude-3-5-sonnet-20241022"
): Promise<LanguageModel> {
  const apiKey = await getSystemSetting("anthropic_api_key", "ANTHROPIC_API_KEY");

  if (!apiKey) {
    throw new Error("System Anthropic API key not configured");
  }

  const anthropic = createAnthropicProvider(apiKey);
  return anthropic(model);
}

// ============================================
// Available Models Reference
// ============================================

/**
 * List of available OpenAI models
 */
export const OPENAI_MODELS = [
  { id: "gpt-4o", name: "GPT-4o", description: "Most capable model for complex tasks" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Fast and cost-effective" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "Previous generation, still powerful" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", description: "Fast and affordable" },
] as const;

/**
 * List of available Anthropic models
 */
export const ANTHROPIC_MODELS = [
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", description: "Best balance of speed and capability" },
  { id: "claude-3-opus-20240229", name: "Claude 3 Opus", description: "Most capable for complex analysis" },
  { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet", description: "Previous generation Sonnet" },
  { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", description: "Fastest, most cost-effective" },
] as const;

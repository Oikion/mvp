import { prismadb } from "./prisma";
import { getSystemSetting } from "./system-settings";

// ============================================
// Organization Settings Helper
// ============================================

/**
 * Get organization settings with fallback to system/env defaults
 */
export async function getOrgSettings(organizationId: string) {
  const settings = await prismadb.organizationSettings.findUnique({
    where: { organizationId },
  });

  return settings;
}

/**
 * Get the OpenAI API key for an organization
 * Priority: Org-specific key > System setting > Environment variable
 */
export async function getOrgOpenAIKey(organizationId: string): Promise<string | null> {
  // First, try to get org-specific key
  const orgSettings = await prismadb.organizationSettings.findUnique({
    where: { organizationId },
    select: { openaiApiKey: true },
  });

  if (orgSettings?.openaiApiKey) {
    return orgSettings.openaiApiKey;
  }

  // Fall back to system setting / env variable
  return getSystemSetting("openai_api_key", "OPENAI_API_KEY");
}

/**
 * Get the OpenAI model to use for an organization
 */
export async function getOrgOpenAIModel(organizationId: string): Promise<string> {
  const orgSettings = await prismadb.organizationSettings.findUnique({
    where: { organizationId },
    select: { openaiModel: true },
  });

  return orgSettings?.openaiModel || "gpt-4o-mini";
}

/**
 * Get the Anthropic Claude API key for an organization
 * Priority: Org-specific key > System setting > Environment variable
 */
export async function getOrgAnthropicKey(organizationId: string): Promise<string | null> {
  // First, try to get org-specific key
  const orgSettings = await prismadb.organizationSettings.findUnique({
    where: { organizationId },
    select: { anthropicApiKey: true },
  });

  if (orgSettings?.anthropicApiKey) {
    return orgSettings.anthropicApiKey;
  }

  // Fall back to system setting / env variable
  return getSystemSetting("anthropic_api_key", "ANTHROPIC_API_KEY");
}

/**
 * Get the Anthropic Claude model to use for an organization
 */
export async function getOrgAnthropicModel(organizationId: string): Promise<string> {
  const orgSettings = await prismadb.organizationSettings.findUnique({
    where: { organizationId },
    select: { anthropicModel: true },
  });

  return orgSettings?.anthropicModel || "claude-3-5-sonnet-20241022";
}

/**
 * Get the AI provider preference for an organization
 * Returns "openai" or "anthropic"
 */
export async function getOrgAIProvider(organizationId: string): Promise<"openai" | "anthropic"> {
  const orgSettings = await prismadb.organizationSettings.findUnique({
    where: { organizationId },
    select: { aiProvider: true },
  });

  return (orgSettings?.aiProvider as "openai" | "anthropic") || "openai";
}

/**
 * Get agent configuration from organization settings
 * Automatically selects provider and API key based on org preferences
 */
export async function getOrgAgentConfig(
  userId: string,
  organizationId: string
): Promise<{
  userId: string;
  organizationId: string;
  apiKey: string;
  provider: "openai" | "anthropic";
  model: string;
}> {
  const provider = await getOrgAIProvider(organizationId);

  if (provider === "anthropic") {
    const apiKey = await getOrgAnthropicKey(organizationId);
    if (!apiKey) {
      throw new Error("Anthropic API key not configured for organization");
    }
    const model = await getOrgAnthropicModel(organizationId);
    return {
      userId,
      organizationId,
      apiKey,
      provider: "anthropic",
      model,
    };
  } else {
    const apiKey = await getOrgOpenAIKey(organizationId);
    if (!apiKey) {
      throw new Error("OpenAI API key not configured for organization");
    }
    const model = await getOrgOpenAIModel(organizationId);
    return {
      userId,
      organizationId,
      apiKey,
      provider: "openai",
      model,
    };
  }
}

/**
 * Get TTS voice preference for an organization
 */
export async function getOrgTTSVoice(organizationId: string): Promise<string> {
  const orgSettings = await prismadb.organizationSettings.findUnique({
    where: { organizationId },
    select: { ttsVoice: true },
  });

  return orgSettings?.ttsVoice || "nova";
}

/**
 * Check if voice assistant is enabled for an organization
 */
export async function isVoiceAssistantEnabled(organizationId: string): Promise<boolean> {
  const orgSettings = await prismadb.organizationSettings.findUnique({
    where: { organizationId },
    select: { voiceAssistantEnabled: true },
  });

  // Default to true if no settings found
  return orgSettings?.voiceAssistantEnabled ?? true;
}

/**
 * Get database connection for an organization (for silo architecture)
 * Returns null if org uses shared database
 */
export async function getOrgDatabaseConnection(organizationId: string) {
  const orgSettings = await prismadb.organizationSettings.findUnique({
    where: { organizationId },
    select: {
      databaseSiloEnabled: true,
      databaseHost: true,
      databasePort: true,
      databaseName: true,
      databaseUser: true,
      databasePassword: true,
      databaseSslEnabled: true,
    },
  });

  if (!orgSettings?.databaseSiloEnabled) {
    return null;
  }

  // Build connection string
  const ssl = orgSettings.databaseSslEnabled ? "?sslmode=require" : "";
  const connectionString = `postgresql://${orgSettings.databaseUser}:${orgSettings.databasePassword}@${orgSettings.databaseHost}:${orgSettings.databasePort}/${orgSettings.databaseName}${ssl}`;

  return {
    connectionString,
    host: orgSettings.databaseHost,
    port: orgSettings.databasePort,
    database: orgSettings.databaseName,
    user: orgSettings.databaseUser,
    ssl: orgSettings.databaseSslEnabled,
  };
}

/**
 * Create or update organization settings
 */
export async function upsertOrgSettings(
  organizationId: string,
  settings: Partial<{
    openaiApiKey: string;
    openaiModel: string;
    anthropicApiKey: string;
    anthropicModel: string;
    aiProvider: "openai" | "anthropic";
    voiceAssistantEnabled: boolean;
    voiceLanguage: string;
    ttsVoice: string;
    databaseSiloEnabled: boolean;
    databaseHost: string;
    databasePort: number;
    databaseName: string;
    databaseUser: string;
    databasePassword: string;
    databaseSslEnabled: boolean;
    k8sNamespace: string;
    k8sResourceQuota: object;
    k8sStorageClass: string;
    aiCreditsLimit: number;
    customBrandingEnabled: boolean;
    customDomainEnabled: boolean;
    customDomain: string;
  }>,
  createdBy?: string
) {
  return prismadb.organizationSettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      ...settings,
      createdBy,
    },
    update: settings,
  });
}

/**
 * Log a settings change for audit purposes
 */
export async function logSettingsChange(
  organizationId: string,
  settingKey: string,
  oldValue: string | null,
  newValue: string | null,
  changedBy: string,
  ipAddress?: string
) {
  // Sanitize sensitive values
  const sensitiveKeys = ["openaiApiKey", "databasePassword"];
  const sanitize = (val: string | null) => {
    if (!val) return null;
    if (sensitiveKeys.includes(settingKey)) {
      return val.length > 4 ? `****${val.slice(-4)}` : "****";
    }
    return val;
  };

  return prismadb.organizationSettingsAudit.create({
    data: {
      organizationId,
      settingKey,
      oldValue: sanitize(oldValue),
      newValue: sanitize(newValue),
      changedBy,
      ipAddress,
    },
  });
}

/**
 * Track AI credit usage for an organization
 */
export async function trackAICreditsUsage(organizationId: string, creditsUsed: number) {
  return prismadb.organizationSettings.update({
    where: { organizationId },
    data: {
      aiCreditsUsed: { increment: creditsUsed },
    },
  });
}

/**
 * Check if organization has exceeded AI credits limit
 */
export async function hasExceededAICredits(organizationId: string): Promise<boolean> {
  const settings = await prismadb.organizationSettings.findUnique({
    where: { organizationId },
    select: { aiCreditsUsed: true, aiCreditsLimit: true },
  });

  if (!settings || !settings.aiCreditsLimit) {
    return false; // No limit set
  }

  return settings.aiCreditsUsed >= settings.aiCreditsLimit;
}

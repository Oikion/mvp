import { prismadb } from "./prisma";

/**
 * System Settings Helper
 * 
 * Retrieves system settings from the database with fallback to environment variables.
 * This allows settings to be managed through the Platform Admin UI while maintaining
 * backwards compatibility with environment variables.
 */

// Cache settings in memory for 5 minutes to reduce database queries
const settingsCache = new Map<string, { value: string | null; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get a system setting value
 * 
 * Priority:
 * 1. Database value (if exists and not empty)
 * 2. Environment variable
 * 3. Default value
 */
export async function getSystemSetting(
  name: string,
  envKey?: string,
  defaultValue?: string
): Promise<string | null> {
  // Check cache first
  const cached = settingsCache.get(name);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    // Try to get from database
    const setting = await prismadb.systemServices.findFirst({
      where: { name },
      select: { serviceKey: true }
    });

    const dbValue = setting?.serviceKey;

    // If we have a database value, use it
    if (dbValue) {
      settingsCache.set(name, { value: dbValue, expiresAt: Date.now() + CACHE_TTL });
      return dbValue;
    }

    // Fall back to environment variable
    if (envKey && process.env[envKey]) {
      const envValue = process.env[envKey];
      settingsCache.set(name, { value: envValue, expiresAt: Date.now() + CACHE_TTL });
      return envValue;
    }

    // Fall back to default
    const value = defaultValue || null;
    settingsCache.set(name, { value, expiresAt: Date.now() + CACHE_TTL });
    return value;

  } catch (error) {
    console.error(`Error fetching system setting "${name}":`, error);
    
    // On error, try environment variable or default
    if (envKey && process.env[envKey]) {
      return process.env[envKey];
    }
    return defaultValue || null;
  }
}

/**
 * Get a boolean system setting
 */
export async function getSystemSettingBool(
  name: string,
  envKey?: string,
  defaultValue: boolean = false
): Promise<boolean> {
  const value = await getSystemSetting(name, envKey);
  
  if (value === null) {
    return defaultValue;
  }
  
  return value === "true" || value === "1" || value === "yes";
}

/**
 * Get a numeric system setting
 */
export async function getSystemSettingNumber(
  name: string,
  envKey?: string,
  defaultValue: number = 0
): Promise<number> {
  const value = await getSystemSetting(name, envKey);
  
  if (value === null) {
    return defaultValue;
  }
  
  const num = Number.parseInt(value, 10);
  return Number.isNaN(num) ? defaultValue : num;
}

/**
 * Clear the settings cache (useful after updates)
 */
export function clearSettingsCache(): void {
  settingsCache.clear();
}

/**
 * Clear a specific setting from cache
 */
export function clearSettingCache(name: string): void {
  settingsCache.delete(name);
}

// Common setting getters for frequently used settings

/**
 * Get the cron secret for authenticating cron job requests
 */
export async function getCronSecret(): Promise<string | null> {
  return getSystemSetting("cron_secret", "CRON_SECRET");
}

/**
 * Check if Market Intelligence feature is globally enabled
 */
export async function isMarketIntelEnabled(): Promise<boolean> {
  return getSystemSettingBool("market_intel_enabled", undefined, true);
}

/**
 * Get max organizations allowed for Market Intelligence
 */
export async function getMarketIntelMaxOrgs(): Promise<number> {
  return getSystemSettingNumber("market_intel_max_orgs", undefined, 100);
}

/**
 * Get Resend API key
 */
export async function getResendApiKey(): Promise<string | null> {
  return getSystemSetting("resend_smtp", "RESEND_API_KEY");
}

/**
 * Get OpenAI API key
 */
export async function getOpenAIApiKey(): Promise<string | null> {
  return getSystemSetting("openai_api_key", "OPENAI_API_KEY");
}

import { createHash, randomBytes } from "crypto";
import { prismadb } from "@/lib/prisma";

// API Key prefix for easy identification
const API_KEY_PREFIX = "oik_";

// Available permission scopes
export const API_SCOPES = {
  CALENDAR_READ: "calendar:read",
  CALENDAR_WRITE: "calendar:write",
  CRM_READ: "crm:read",
  CRM_WRITE: "crm:write",
  MLS_READ: "mls:read",
  MLS_WRITE: "mls:write",
  TASKS_READ: "tasks:read",
  TASKS_WRITE: "tasks:write",
  DOCUMENTS_READ: "documents:read",
  DOCUMENTS_WRITE: "documents:write",
  WEBHOOKS_MANAGE: "webhooks:manage",
  // Blog content management
  BLOG_READ: "blog:read",
  BLOG_WRITE: "blog:write",
  // Newsletter management
  NEWSLETTER_READ: "newsletter:read",
  NEWSLETTER_WRITE: "newsletter:write",
  NEWSLETTER_SEND: "newsletter:send",
  // Social media logging
  SOCIAL_READ: "social:read",
  SOCIAL_WRITE: "social:write",
  // n8n automation
  N8N_WEBHOOK: "n8n:webhook",
  // Referrals
  REFERRALS_READ: "referrals:read",
  REFERRALS_WRITE: "referrals:write",
} as const;

export type ApiScope = (typeof API_SCOPES)[keyof typeof API_SCOPES];

// All available scopes as array
export const ALL_SCOPES: ApiScope[] = Object.values(API_SCOPES);

// Read-only scopes
export const READ_ONLY_SCOPES: ApiScope[] = [
  API_SCOPES.CALENDAR_READ,
  API_SCOPES.CRM_READ,
  API_SCOPES.MLS_READ,
  API_SCOPES.TASKS_READ,
  API_SCOPES.DOCUMENTS_READ,
  API_SCOPES.BLOG_READ,
  API_SCOPES.NEWSLETTER_READ,
  API_SCOPES.SOCIAL_READ,
  API_SCOPES.REFERRALS_READ,
];

// Scope descriptions for UI
export const SCOPE_DESCRIPTIONS: Record<ApiScope, string> = {
  "calendar:read": "View calendar events and schedules",
  "calendar:write": "Create, update, and delete calendar events",
  "crm:read": "View clients, contacts, and CRM data",
  "crm:write": "Create, update, and delete clients and contacts",
  "mls:read": "View properties and MLS listings",
  "mls:write": "Create, update, and delete properties",
  "tasks:read": "View tasks and assignments",
  "tasks:write": "Create, update, and complete tasks",
  "documents:read": "View and download documents",
  "documents:write": "Upload and manage documents",
  "webhooks:manage": "Configure webhook endpoints",
  "blog:read": "View blog posts and content",
  "blog:write": "Create, update, and delete blog posts",
  "newsletter:read": "View newsletter campaigns and subscribers",
  "newsletter:write": "Create and manage newsletter campaigns",
  "newsletter:send": "Send newsletter campaigns to subscribers",
  "social:read": "View social media post logs and metrics",
  "social:write": "Create and update social media post logs",
  "n8n:webhook": "Receive webhook callbacks from n8n workflows",
  "referrals:read": "View referral codes, referrals, and statistics",
  "referrals:write": "Track referrals and manage referral data",
};

/**
 * Generate a secure API key
 * Returns both the plain key (to show once) and the hash (to store)
 */
export function generateApiKey(): { key: string; keyHash: string; keyPrefix: string } {
  // Generate 32 random bytes (256 bits of entropy)
  const randomPart = randomBytes(32).toString("base64url");
  const key = `${API_KEY_PREFIX}${randomPart}`;

  // Create SHA256 hash of the full key
  const keyHash = hashApiKey(key);

  // Store first 12 characters (prefix + 8 chars) for identification
  const keyPrefix = key.substring(0, 12);

  return { key, keyHash, keyPrefix };
}

/**
 * Hash an API key using SHA256
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Validate an API key and return the associated key record
 */
export async function validateApiKey(key: string): Promise<{
  valid: boolean;
  apiKey?: {
    id: string;
    organizationId: string;
    name: string;
    scopes: string[];
    createdById: string;
  };
  error?: string;
}> {
  // Check key format
  if (!key || !key.startsWith(API_KEY_PREFIX)) {
    return { valid: false, error: "Invalid API key format" };
  }

  // Hash the provided key
  const keyHash = hashApiKey(key);

  // Look up the key in the database
  const apiKey = await prismadb.apiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      organizationId: true,
      name: true,
      scopes: true,
      createdById: true,
      expiresAt: true,
      revokedAt: true,
    },
  });

  if (!apiKey) {
    return { valid: false, error: "API key not found" };
  }

  // Check if revoked
  if (apiKey.revokedAt) {
    return { valid: false, error: "API key has been revoked" };
  }

  // Check if expired
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { valid: false, error: "API key has expired" };
  }

  // Update last used timestamp (fire and forget)
  prismadb.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // Ignore errors updating last used timestamp
    });

  return {
    valid: true,
    apiKey: {
      id: apiKey.id,
      organizationId: apiKey.organizationId,
      name: apiKey.name,
      scopes: apiKey.scopes,
      createdById: apiKey.createdById,
    },
  };
}

/**
 * Check if an API key has the required scope(s)
 */
export function hasScope(keyScopes: string[], requiredScope: ApiScope): boolean {
  return keyScopes.includes(requiredScope);
}

/**
 * Check if an API key has any of the required scopes
 */
export function hasAnyScope(keyScopes: string[], requiredScopes: ApiScope[]): boolean {
  return requiredScopes.some((scope) => keyScopes.includes(scope));
}

/**
 * Check if an API key has all of the required scopes
 */
export function hasAllScopes(keyScopes: string[], requiredScopes: ApiScope[]): boolean {
  return requiredScopes.every((scope) => keyScopes.includes(scope));
}

/**
 * Create a new API key for an organization
 */
export async function createApiKey(params: {
  organizationId: string;
  name: string;
  scopes: ApiScope[];
  createdById: string;
  expiresAt?: Date;
}): Promise<{ key: string; id: string; keyPrefix: string }> {
  const { key, keyHash, keyPrefix } = generateApiKey();

  const apiKey = await prismadb.apiKey.create({
    data: {
      organizationId: params.organizationId,
      name: params.name,
      keyPrefix,
      keyHash,
      scopes: params.scopes,
      createdById: params.createdById,
      expiresAt: params.expiresAt,
    },
  });

  return { key, id: apiKey.id, keyPrefix };
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string, organizationId: string): Promise<boolean> {
  const result = await prismadb.apiKey.updateMany({
    where: {
      id: keyId,
      organizationId,
      revokedAt: null, // Only revoke if not already revoked
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return result.count > 0;
}

/**
 * List API keys for an organization (without showing the actual keys)
 */
export async function listApiKeys(organizationId: string) {
  return prismadb.apiKey.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Log an API request
 */
export async function logApiRequest(params: {
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  await prismadb.apiLog.create({
    data: {
      apiKeyId: params.apiKeyId,
      endpoint: params.endpoint,
      method: params.method,
      statusCode: params.statusCode,
      responseTime: params.responseTime,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}

/**
 * Get API usage statistics for an organization
 */
export async function getApiUsageStats(
  organizationId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    keyId?: string;
  }
) {
  const where: {
    ApiKey: { organizationId: string };
    createdAt?: { gte?: Date; lte?: Date };
    apiKeyId?: string;
  } = {
    ApiKey: { organizationId },
  };

  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options.startDate) where.createdAt.gte = options.startDate;
    if (options.endDate) where.createdAt.lte = options.endDate;
  }

  if (options?.keyId) {
    where.apiKeyId = options.keyId;
  }

  const logs = await prismadb.apiLog.findMany({
    where,
    select: {
      endpoint: true,
      method: true,
      statusCode: true,
      responseTime: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  // Calculate statistics
  const totalRequests = logs.length;
  const successfulRequests = logs.filter((l) => l.statusCode >= 200 && l.statusCode < 300).length;
  const failedRequests = logs.filter((l) => l.statusCode >= 400).length;
  const avgResponseTime =
    logs.length > 0
      ? Math.round(logs.reduce((sum, l) => sum + l.responseTime, 0) / logs.length)
      : 0;

  // Group by endpoint
  const endpointStats = logs.reduce(
    (acc, log) => {
      const key = `${log.method} ${log.endpoint}`;
      if (!acc[key]) {
        acc[key] = { count: 0, avgResponseTime: 0, totalResponseTime: 0 };
      }
      acc[key].count++;
      acc[key].totalResponseTime += log.responseTime;
      acc[key].avgResponseTime = Math.round(acc[key].totalResponseTime / acc[key].count);
      return acc;
    },
    {} as Record<string, { count: number; avgResponseTime: number; totalResponseTime: number }>
  );

  return {
    totalRequests,
    successfulRequests,
    failedRequests,
    avgResponseTime,
    endpointStats,
    recentLogs: logs.slice(0, 100),
  };
}

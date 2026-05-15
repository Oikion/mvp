import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { validateApiKey, hasScope, logApiRequest, ApiScope } from "@/lib/api-auth";
import { rateLimit, getApiKeyRateLimitIdentifier } from "@/lib/rate-limit";
import { prismadb } from "@/lib/prisma";
import {
  parsePaginationParams as parseSharedPaginationParams,
  createExternalPaginatedResponse,
  type PaginationParams,
  type ExternalPaginatedResponse,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "@/lib/pagination";

/**
 * Context passed to API route handlers after authentication
 */
export interface ExternalApiContext {
  apiKeyId: string;
  organizationId: string;
  apiKeyName: string;
  scopes: string[];
  createdById: string;
}

/**
 * Rate limit information returned from authentication
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Result of external API authentication
 */
export interface ExternalApiAuthResult {
  success: boolean;
  context?: ExternalApiContext;
  error?: string;
  statusCode?: number;
  rateLimit?: RateLimitInfo;
}

/**
 * Extract API key from Authorization header
 */
export function extractApiKey(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader) {
    return null;
  }

  // Support both "Bearer oik_xxx" and just "oik_xxx"
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  if (authHeader.startsWith("oik_")) {
    return authHeader;
  }

  return null;
}

/**
 * Authenticate an external API request
 */
export async function authenticateExternalApi(
  req: NextRequest
): Promise<ExternalApiAuthResult> {
  const apiKey = extractApiKey(req);

  if (!apiKey) {
    return {
      success: false,
      error: "Missing API key. Provide Authorization header with Bearer token.",
      statusCode: 401,
    };
  }

  // Validate the API key
  const validation = await validateApiKey(apiKey);

  if (!validation.valid || !validation.apiKey) {
    return {
      success: false,
      error: validation.error || "Invalid API key",
      statusCode: 401,
    };
  }

  // Apply rate limiting for this API key
  const identifier = getApiKeyRateLimitIdentifier(validation.apiKey.id);
  const rateLimitResult = await rateLimit(identifier, "api");

  const rateLimitInfo: RateLimitInfo = {
    limit: rateLimitResult.limit,
    remaining: rateLimitResult.remaining,
    reset: rateLimitResult.reset,
  };

  if (!rateLimitResult.success) {
    return {
      success: false,
      error: "Rate limit exceeded. Please try again later.",
      statusCode: 429,
      rateLimit: rateLimitInfo,
    };
  }

  return {
    success: true,
    context: {
      apiKeyId: validation.apiKey.id,
      organizationId: validation.apiKey.organizationId,
      apiKeyName: validation.apiKey.name,
      scopes: validation.apiKey.scopes,
      createdById: validation.apiKey.createdById,
    },
    rateLimit: rateLimitInfo,
  };
}

/**
 * Check if the authenticated API key has the required scope
 */
export function requireScope(
  context: ExternalApiContext,
  requiredScope: ApiScope
): { allowed: boolean; error?: string } {
  if (!hasScope(context.scopes, requiredScope)) {
    return {
      allowed: false,
      error: `Missing required scope: ${requiredScope}`,
    };
  }
  return { allowed: true };
}

/**
 * Create an error response for external API
 */
export function createApiErrorResponse(
  error: string,
  statusCode: number,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      error,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

/**
 * Create a success response for external API
 */
export function createApiSuccessResponse<T>(
  data: T,
  statusCode: number = 200,
  meta?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      data,
      ...(meta && { meta }),
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

/**
 * Wrapper for external API route handlers
 * Handles authentication, scope checking, logging, and error handling
 */
export function withExternalApi<T>(
  handler: (
    req: NextRequest,
    context: ExternalApiContext
  ) => Promise<NextResponse<T>>,
  options: {
    requiredScopes?: ApiScope[];
  } = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    let statusCode = 500;
    let apiKeyId: string | undefined;
    let rateLimitInfo: RateLimitInfo | undefined;

    /** Attach rate limit headers to a response if available */
    function applyRateLimitHeaders(response: NextResponse): NextResponse {
      if (rateLimitInfo) {
        response.headers.set("X-RateLimit-Limit", String(rateLimitInfo.limit));
        response.headers.set("X-RateLimit-Remaining", String(rateLimitInfo.remaining));
        response.headers.set("X-RateLimit-Reset", String(rateLimitInfo.reset));
      }
      return response;
    }

    try {
      // Authenticate the request via API key
      const authResult = await authenticateExternalApi(req);
      rateLimitInfo = authResult.rateLimit;

      if (!authResult.success || !authResult.context) {
        statusCode = authResult.statusCode || 401;
        return applyRateLimitHeaders(
          createApiErrorResponse(
            authResult.error || "Authentication failed",
            statusCode
          )
        );
      }

      apiKeyId = authResult.context.apiKeyId;

      // Check required scopes
      if (options.requiredScopes && options.requiredScopes.length > 0) {
        for (const scope of options.requiredScopes) {
          const scopeCheck = requireScope(authResult.context, scope);
          if (!scopeCheck.allowed) {
            statusCode = 403;
            return applyRateLimitHeaders(
              createApiErrorResponse(
                scopeCheck.error || "Insufficient permissions",
                statusCode
              )
            );
          }
        }
      }

      // Call the actual handler
      const response = await handler(req, authResult.context);
      statusCode = response.status;
      return applyRateLimitHeaders(response);
    } catch (error) {
      console.error("[EXTERNAL_API_ERROR]", error);
      statusCode = 500;
      return applyRateLimitHeaders(
        createApiErrorResponse(
          "Internal server error",
          statusCode
        )
      );
    } finally {
      // Log the API request (fire and forget)
      if (apiKeyId) {
        const responseTime = Date.now() - startTime;
        logApiRequest({
          apiKeyId,
          endpoint: req.nextUrl.pathname,
          method: req.method,
          statusCode,
          responseTime,
          ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            undefined,
          userAgent: req.headers.get("user-agent") || undefined,
        }).catch(() => {
          // Ignore logging errors
        });
      }
    }
  };
}

/**
 * Get IP address from request
 */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Parse pagination parameters from request.
 * Re-exports from shared pagination utilities for backward compatibility.
 *
 * @see lib/pagination.ts for the canonical implementation
 */
export function parsePaginationParams(req: NextRequest): PaginationParams {
  return parseSharedPaginationParams(req);
}

/**
 * Create a paginated response for external API endpoints.
 * Wraps data in the standard data/meta/timestamp envelope.
 *
 * @param data - Response data object
 * @param pagination - Pagination metadata
 * @returns NextResponse with external API format
 *
 * @example
 * ```typescript
 * return createPaginatedApiResponse(
 *   { clients: pageItems },
 *   { nextCursor, hasMore, limit }
 * );
 * ```
 */
export function createPaginatedApiResponse<T>(
  data: T,
  pagination: { nextCursor: string | null; hasMore: boolean; limit: number }
): NextResponse {
  const response = createExternalPaginatedResponse(data, pagination);
  return NextResponse.json(response);
}

// Re-export pagination types and constants for convenience
export type { PaginationParams, ExternalPaginatedResponse };
export { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };

/**
 * Verify that a user ID exists AND is a member of the given organization.
 * Uses DB lookup to get the Clerk user ID, then Clerk membership API to verify.
 * Call before persisting any external-caller-supplied user reference (assignedTo, assignedAgentId).
 */
export async function validateOrgUser(
  userId: string,
  organizationId: string
): Promise<{ valid: boolean; error?: string }> {
  const user = await prismadb.users.findFirst({
    where: { id: userId },
    select: { id: true, clerkUserId: true },
  });

  if (!user) return { valid: false, error: "user not found" };
  if (!user.clerkUserId) return { valid: false, error: "user account not fully configured" };

  try {
    const clerk = await clerkClient();
    const memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId,
    });
    const isMember = memberships.data.some(
      (m) => m.publicUserData?.userId === user.clerkUserId
    );
    if (!isMember) {
      return { valid: false, error: "user is not a member of this organization" };
    }
  } catch {
    return { valid: false, error: "could not verify organization membership" };
  }

  return { valid: true };
}

/**
 * Parse filter parameters from request
 */
export function parseFilterParams(
  req: NextRequest,
  allowedFilters: string[]
): Record<string, string> {
  const { searchParams } = req.nextUrl;
  const filters: Record<string, string> = {};

  for (const filter of allowedFilters) {
    const value = searchParams.get(filter);
    if (value) {
      filters[filter] = value;
    }
  }

  return filters;
}



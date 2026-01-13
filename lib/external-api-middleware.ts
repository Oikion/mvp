import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, hasScope, logApiRequest, ApiScope } from "@/lib/api-auth";
import { rateLimit, getApiKeyRateLimitIdentifier } from "@/lib/rate-limit";

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
 * Result of external API authentication
 */
export interface ExternalApiAuthResult {
  success: boolean;
  context?: ExternalApiContext;
  error?: string;
  statusCode?: number;
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

  if (!rateLimitResult.success) {
    return {
      success: false,
      error: "Rate limit exceeded. Please try again later.",
      statusCode: 429,
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

    try {
      // Authenticate the request
      const authResult = await authenticateExternalApi(req);

      if (!authResult.success || !authResult.context) {
        statusCode = authResult.statusCode || 401;
        return createApiErrorResponse(
          authResult.error || "Authentication failed",
          statusCode
        );
      }

      apiKeyId = authResult.context.apiKeyId;

      // Check required scopes
      if (options.requiredScopes && options.requiredScopes.length > 0) {
        for (const scope of options.requiredScopes) {
          const scopeCheck = requireScope(authResult.context, scope);
          if (!scopeCheck.allowed) {
            statusCode = 403;
            return createApiErrorResponse(
              scopeCheck.error || "Insufficient permissions",
              statusCode
            );
          }
        }
      }

      // Call the actual handler
      const response = await handler(req, authResult.context);
      statusCode = response.status;
      return response;
    } catch (error) {
      console.error("[EXTERNAL_API_ERROR]", error);
      statusCode = 500;
      return createApiErrorResponse(
        error instanceof Error ? error.message : "Internal server error",
        statusCode
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
 * Parse pagination parameters from request
 */
export function parsePaginationParams(req: NextRequest): {
  cursor?: string;
  limit: number;
} {
  const { searchParams } = req.nextUrl;
  const cursor = searchParams.get("cursor") || undefined;
  const limitParam = searchParams.get("limit");
  
  let limit = 50;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, 100); // Max 100 items per page
    }
  }

  return { cursor, limit };
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

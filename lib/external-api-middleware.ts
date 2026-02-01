import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, hasScope, logApiRequest, ApiScope } from "@/lib/api-auth";
import { rateLimit, getApiKeyRateLimitIdentifier } from "@/lib/rate-limit";
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
 * 
 * Also supports internal tool API calls when combined with withInternalToolApi
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
      // Check if this is an internal tool API call with pre-set context
      const internalContext = getInternalApiContextFromHeader(req);
      
      if (internalContext) {
        // Internal tool call - skip API key auth, use internal context
        // Internal tools have all scopes, so skip scope check
        const response = await handler(req, internalContext);
        statusCode = response.status;
        return response;
      }

      // Authenticate the request via API key
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
      if (apiKeyId && apiKeyId !== "internal-tool") {
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
 * Internal helper to get context from header (used by withExternalApi)
 */
function getInternalApiContextFromHeader(req: NextRequest): ExternalApiContext | null {
  const contextHeader = req.headers.get("x-internal-api-context");
  if (!contextHeader) {
    return null;
  }
  
  try {
    return JSON.parse(contextHeader) as ExternalApiContext;
  } catch {
    return null;
  }
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

/**
 * Context for internal tool API calls
 */
export interface InternalToolContext {
  organizationId: string;
  userId?: string;
  source: string;
  testMode: boolean;
}

/**
 * Check if request is from internal AI tool executor
 */
function isInternalToolRequest(req: NextRequest): boolean {
  const source = req.headers.get("x-tool-context-source");
  const orgId = req.headers.get("x-tool-context-org");
  return !!source && !!orgId;
}

/**
 * Extract internal tool context from headers
 */
function extractInternalToolContext(req: NextRequest): InternalToolContext | null {
  const orgId = req.headers.get("x-tool-context-org");
  const source = req.headers.get("x-tool-context-source");
  
  if (!orgId || !source) {
    return null;
  }

  return {
    organizationId: orgId,
    userId: req.headers.get("x-tool-context-user") || undefined,
    source,
    testMode: req.headers.get("x-tool-context-test-mode") === "true",
  };
}

/**
 * Wrapper for API routes that support both external API keys and internal tool calls
 * 
 * This middleware allows routes to be called:
 * 1. Externally via API key authentication
 * 2. Internally via AI tool executor with X-Tool-Context-* headers
 * 
 * @example
 * ```typescript
 * export const GET = withInternalToolApi(
 *   withExternalApi(handler, { requiredScopes: [API_SCOPES.CALENDAR_READ] })
 * );
 * ```
 */
export function withInternalToolApi(
  externalHandler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Check if this is an internal tool request
    if (isInternalToolRequest(req)) {
      const toolContext = extractInternalToolContext(req);
      
      if (!toolContext) {
        return createApiErrorResponse(
          "Invalid internal tool context headers",
          400
        );
      }

      // For internal tool requests, create a synthetic external API context
      // This allows the handler to work with the same interface
      const syntheticContext: ExternalApiContext = {
        apiKeyId: "internal-tool",
        organizationId: toolContext.organizationId,
        apiKeyName: `AI Tool (${toolContext.source})`,
        scopes: ["*"], // Internal tools have all scopes
        createdById: toolContext.userId || "system",
      };

      // Inject the synthetic context into the request for the handler
      // We do this by modifying the request object's headers to include the context
      // Then call the original handler logic directly
      
      // Actually, we need to execute the inner handler manually with the context
      // Let's create a new approach - extract the handler and call it with context
      
      // For now, let's bypass the external auth by calling the handler indirectly
      // This requires a different approach - let's use a request extension pattern
      
      // Store context in a header that the handler can check
      const modifiedHeaders = new Headers(req.headers);
      modifiedHeaders.set("x-internal-api-context", JSON.stringify(syntheticContext));
      
      // Create a new request with modified headers
      const modifiedReq = new NextRequest(req.url, {
        method: req.method,
        headers: modifiedHeaders,
        body: req.body,
        // @ts-expect-error - duplex is required for streaming bodies in newer Node versions
        duplex: "half",
      });

      return externalHandler(modifiedReq);
    }

    // For external requests, use the standard API key authentication
    return externalHandler(req);
  };
}


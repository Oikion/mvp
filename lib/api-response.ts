/**
 * Internal API Response Utilities
 *
 * Standardized response helpers for internal API routes (non-v1).
 * For external v1 API routes, use the helpers in external-api-middleware.ts.
 *
 * @example
 * ```typescript
 * import { apiSuccess, apiError, apiCreated, apiNotFound } from "@/lib/api-response";
 *
 * export async function GET(req: Request) {
 *   const item = await findItem(id);
 *   if (!item) return apiNotFound("Item");
 *   return apiSuccess(item);
 * }
 *
 * export async function POST(req: Request) {
 *   const item = await createItem(data);
 *   return apiCreated(item);
 * }
 * ```
 */

import { NextResponse } from "next/server";

// =============================================================================
// Types
// =============================================================================

/**
 * Standard API error response shape.
 */
export interface ApiErrorResponseBody {
  error: string;
  details?: Record<string, unknown>;
  code?: string;
}

/**
 * Standard API success response shape.
 */
export interface ApiSuccessResponseBody<T> {
  data: T;
}

// =============================================================================
// Success Responses
// =============================================================================

/**
 * Create a success response (200 OK).
 *
 * @param data - Response data
 * @returns NextResponse with 200 status
 *
 * @example
 * ```typescript
 * return apiSuccess({ user: { id: "123", name: "John" } });
 * // Response: { "data": { "user": { "id": "123", "name": "John" } } }
 * ```
 */
export function apiSuccess<T>(data: T): NextResponse<ApiSuccessResponseBody<T>> {
  return NextResponse.json({ data }, { status: 200 });
}

/**
 * Create a created response (201 Created).
 * Use this for successful POST requests that create a new resource.
 *
 * @param data - Created resource data
 * @returns NextResponse with 201 status
 *
 * @example
 * ```typescript
 * const newUser = await prisma.user.create({ data: { name: "John" } });
 * return apiCreated({ user: newUser });
 * ```
 */
export function apiCreated<T>(data: T): NextResponse<ApiSuccessResponseBody<T>> {
  return NextResponse.json({ data }, { status: 201 });
}

/**
 * Create a no content response (204 No Content).
 * Use this for successful DELETE requests or updates with no response body.
 *
 * @returns NextResponse with 204 status and no body
 */
export function apiNoContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

// =============================================================================
// Error Responses
// =============================================================================

/**
 * Create an error response with custom status code.
 *
 * @param message - Error message
 * @param status - HTTP status code (default: 400)
 * @param details - Optional additional error details
 * @returns NextResponse with error
 *
 * @example
 * ```typescript
 * return apiError("Invalid input", 400, { field: "email", issue: "invalid format" });
 * ```
 */
export function apiError(
  message: string,
  status = 400,
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponseBody> {
  const body: ApiErrorResponseBody = { error: message };
  if (details) {
    body.details = details;
  }
  return NextResponse.json(body, { status });
}

/**
 * Create a bad request response (400).
 *
 * @param message - Error message
 * @param details - Optional validation error details
 * @returns NextResponse with 400 status
 */
export function apiBadRequest(
  message = "Bad request",
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponseBody> {
  return apiError(message, 400, details);
}

/**
 * Create an unauthorized response (401).
 * Use when the user is not authenticated.
 *
 * @param message - Error message
 * @returns NextResponse with 401 status
 */
export function apiUnauthorized(
  message = "Unauthorized"
): NextResponse<ApiErrorResponseBody> {
  return apiError(message, 401);
}

/**
 * Create a forbidden response (403).
 * Use when the user is authenticated but lacks permission.
 *
 * @param message - Error message
 * @returns NextResponse with 403 status
 */
export function apiForbidden(
  message = "Forbidden"
): NextResponse<ApiErrorResponseBody> {
  return apiError(message, 403);
}

/**
 * Create a not found response (404).
 *
 * @param resource - Name of the resource that wasn't found
 * @returns NextResponse with 404 status
 *
 * @example
 * ```typescript
 * const user = await prisma.user.findUnique({ where: { id } });
 * if (!user) return apiNotFound("User");
 * ```
 */
export function apiNotFound(
  resource = "Resource"
): NextResponse<ApiErrorResponseBody> {
  return apiError(`${resource} not found`, 404);
}

/**
 * Create a conflict response (409).
 * Use when there's a conflict with the current state (e.g., duplicate resource).
 *
 * @param message - Error message
 * @returns NextResponse with 409 status
 */
export function apiConflict(
  message = "Resource already exists"
): NextResponse<ApiErrorResponseBody> {
  return apiError(message, 409);
}

/**
 * Create a rate limited response (429).
 *
 * @param message - Error message
 * @returns NextResponse with 429 status
 */
export function apiRateLimited(
  message = "Rate limit exceeded"
): NextResponse<ApiErrorResponseBody> {
  return apiError(message, 429);
}

/**
 * Create an internal server error response (500).
 *
 * @param message - Error message (don't expose sensitive details)
 * @param error - Optional error object for logging
 * @returns NextResponse with 500 status
 */
export function apiInternalError(
  message = "Internal server error",
  error?: unknown
): NextResponse<ApiErrorResponseBody> {
  if (error) {
    console.error("[API_ERROR]", error);
  }
  return apiError(message, 500);
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate request body against a Zod schema.
 *
 * @param body - Request body to validate
 * @param schema - Zod schema to validate against
 * @returns Validation result with either data or error response
 *
 * @example
 * ```typescript
 * import { z } from "zod";
 *
 * const schema = z.object({ name: z.string().min(1) });
 *
 * export async function POST(req: Request) {
 *   const body = await req.json();
 *   const validation = validateBody(body, schema);
 *   if (!validation.success) return validation.error;
 *
 *   const { data } = validation;
 *   // data is typed as { name: string }
 * }
 * ```
 */
export function validateBody<T>(
  body: unknown,
  schema: { safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: { flatten: () => { fieldErrors: Record<string, string[]> } } } }
): { success: true; data: T } | { success: false; error: NextResponse<ApiErrorResponseBody> } {
  const result = schema.safeParse(body);

  if (!result.success) {
    return {
      success: false,
      error: apiBadRequest("Validation failed", {
        fieldErrors: result.error.flatten().fieldErrors,
      }),
    };
  }

  return { success: true, data: result.data };
}

// =============================================================================
// Response Wrappers
// =============================================================================

/**
 * Wrap an async handler with try-catch error handling.
 *
 * @param handler - Async handler function
 * @returns Wrapped handler that catches errors
 *
 * @example
 * ```typescript
 * export const GET = withErrorHandler(async (req) => {
 *   const data = await fetchData();
 *   return apiSuccess(data);
 * });
 * ```
 */
export function withErrorHandler(
  handler: (req: Request) => Promise<NextResponse>
): (req: Request) => Promise<NextResponse> {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (error) {
      console.error("[API_ERROR]", error);
      return apiInternalError();
    }
  };
}

// =============================================================================
// Prisma Error Handling
// =============================================================================

/**
 * Handle Prisma errors and return appropriate API responses.
 * 
 * @param error - The caught error
 * @param context - Optional context string for logging (e.g., "USER_CREATE")
 * @returns NextResponse with appropriate status code and message
 * 
 * @example
 * ```typescript
 * try {
 *   const user = await prisma.user.create({ data });
 *   return apiSuccess(user);
 * } catch (error) {
 *   return handlePrismaError(error, "USER_CREATE");
 * }
 * ```
 */
export function handlePrismaError(
  error: unknown,
  context?: string
): NextResponse<ApiErrorResponseBody> {
  const tag = context ? `[${context}]` : "[PRISMA_ERROR]";
  console.error(tag, error);
  
  // Check if it's a Prisma error with a code
  if (error && typeof error === "object" && "code" in error) {
    const prismaError = error as { code: string; message?: string };
    
    switch (prismaError.code) {
      // Connection errors
      case "P2024":
        return apiError("Database connection error. Please try again.", 503);
      
      // Unique constraint violation
      case "P2002":
        return apiConflict("A record with this value already exists");
      
      // Foreign key constraint failure
      case "P2003":
        return apiBadRequest("Invalid reference to related record");
      
      // Record not found (for update/delete)
      case "P2025":
        return apiNotFound("Record");
      
      // Required relation violation
      case "P2014":
        return apiBadRequest("Required related record is missing");
      
      // Value too long for column
      case "P2000":
        return apiBadRequest("Value too long for field");
      
      // Query timeout
      case "P2028":
        return apiError("Database query timed out. Please try again.", 504);
      
      default:
        // Log unknown Prisma error codes for debugging
        console.error(`${tag} Unknown Prisma error code: ${prismaError.code}`);
    }
  }
  
  // Check for authentication errors
  if (error instanceof Error) {
    if (error.message === "User not authenticated" || 
        error.message === "User not found in database") {
      return apiUnauthorized();
    }
    if (error.message === "User not associated with an organization") {
      return apiForbidden("No organization context");
    }
  }
  
  // Generic internal error
  return apiInternalError(
    error instanceof Error ? error.message : "An unexpected error occurred"
  );
}

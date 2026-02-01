/**
 * Standardized Server Action Response Utilities
 *
 * Provides consistent response types and helper functions for server actions.
 * All server actions should use these utilities for consistent error handling.
 *
 * @example
 * ```typescript
 * import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";
 *
 * export async function createItem(data: ItemData): Promise<ActionResponse<Item>> {
 *   try {
 *     const item = await prisma.item.create({ data });
 *     return actionSuccess(item);
 *   } catch (error) {
 *     return actionError("Failed to create item", error);
 *   }
 * }
 * ```
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Standard success response from a server action.
 */
export interface ActionSuccessResponse<T = void> {
  success: true;
  data?: T;
}

/**
 * Standard error response from a server action.
 */
export interface ActionErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Union type for server action responses.
 * Use this as the return type for all server actions.
 *
 * @example
 * ```typescript
 * async function myAction(): Promise<ActionResponse<MyData>> {
 *   // ...
 * }
 * ```
 */
export type ActionResponse<T = void> = ActionSuccessResponse<T> | ActionErrorResponse;

/**
 * Extended response with additional metadata.
 * Useful for actions that return pagination info, counts, etc.
 */
export interface ActionResponseWithMeta<T, M> {
  success: true;
  data: T;
  meta: M;
}

// =============================================================================
// Response Builders
// =============================================================================

/**
 * Create a success response.
 *
 * @param data - Optional data to include in the response
 * @returns Success response object
 *
 * @example
 * ```typescript
 * return actionSuccess(); // { success: true }
 * return actionSuccess(createdItem); // { success: true, data: createdItem }
 * ```
 */
export function actionSuccess<T = void>(data?: T): ActionSuccessResponse<T> {
  if (data === undefined) {
    return { success: true } as ActionSuccessResponse<T>;
  }
  return { success: true, data };
}

/**
 * Create an error response.
 *
 * @param error - Error message or Error object
 * @param errorOrCode - Optional error code or Error object for logging
 * @param details - Optional additional error details
 * @returns Error response object
 *
 * @example
 * ```typescript
 * return actionError("Item not found");
 * return actionError("Validation failed", "VALIDATION_ERROR");
 * return actionError("Failed to create", error);
 * return actionError("Validation failed", "VALIDATION_ERROR", { field: "email" });
 * ```
 */
export function actionError(
  error: string | Error,
  errorOrCode?: string | Error,
  details?: Record<string, unknown>
): ActionErrorResponse {
  // Handle Error object as first argument
  const message = error instanceof Error ? error.message : error;
  
  // Handle Error object as second argument (for logging)
  let code: string | undefined;
  if (typeof errorOrCode === "string") {
    code = errorOrCode;
  } else if (errorOrCode instanceof Error) {
    // Log the actual error but don't expose it to client
    console.error("[ACTION_ERROR]", errorOrCode);
  }
  
  const response: ActionErrorResponse = {
    success: false,
    error: message,
  };
  
  if (code) {
    response.code = code;
  }
  
  if (details) {
    response.details = details;
  }
  
  return response;
}

/**
 * Create a success response with metadata.
 *
 * @param data - Response data
 * @param meta - Metadata object
 * @returns Success response with metadata
 *
 * @example
 * ```typescript
 * return actionSuccessWithMeta(items, { total: 100, page: 1 });
 * ```
 */
export function actionSuccessWithMeta<T, M>(
  data: T,
  meta: M
): ActionResponseWithMeta<T, M> {
  return {
    success: true,
    data,
    meta,
  };
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a response is successful.
 *
 * @param response - Action response to check
 * @returns True if response is successful
 *
 * @example
 * ```typescript
 * const result = await createItem(data);
 * if (isActionSuccess(result)) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function isActionSuccess<T>(
  response: ActionResponse<T>
): response is ActionSuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard to check if a response is an error.
 *
 * @param response - Action response to check
 * @returns True if response is an error
 */
export function isActionError<T>(
  response: ActionResponse<T>
): response is ActionErrorResponse {
  return response.success === false;
}

// =============================================================================
// Error Code Constants
// =============================================================================

/**
 * Common error codes for consistent error handling.
 */
export const ActionErrorCodes = {
  /** User is not authenticated */
  UNAUTHENTICATED: "UNAUTHENTICATED",
  /** User lacks permission for this action */
  UNAUTHORIZED: "UNAUTHORIZED",
  /** Requested resource was not found */
  NOT_FOUND: "NOT_FOUND",
  /** Input validation failed */
  VALIDATION_ERROR: "VALIDATION_ERROR",
  /** Resource already exists (conflict) */
  CONFLICT: "CONFLICT",
  /** Rate limit exceeded */
  RATE_LIMITED: "RATE_LIMITED",
  /** External service error */
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
  /** Generic internal error */
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ActionErrorCode = typeof ActionErrorCodes[keyof typeof ActionErrorCodes];

// =============================================================================
// Permission Error Helper
// =============================================================================

/**
 * Create a permission denied error response.
 * Commonly used with requireAction guards.
 *
 * @param message - Optional custom message
 * @returns Error response with UNAUTHORIZED code
 *
 * @example
 * ```typescript
 * const guard = await requireAction("item:create");
 * if (guard) return actionPermissionDenied(guard.error);
 * ```
 */
export function actionPermissionDenied(
  message = "You do not have permission to perform this action"
): ActionErrorResponse {
  return actionError(message, ActionErrorCodes.UNAUTHORIZED);
}

/**
 * Create a not found error response.
 *
 * @param resource - Name of the resource that wasn't found
 * @returns Error response with NOT_FOUND code
 */
export function actionNotFound(resource = "Resource"): ActionErrorResponse {
  return actionError(`${resource} not found`, ActionErrorCodes.NOT_FOUND);
}

/**
 * Create a validation error response.
 *
 * @param message - Validation error message
 * @param fieldErrors - Optional field-level errors
 * @returns Error response with VALIDATION_ERROR code
 */
export function actionValidationError(
  message: string,
  fieldErrors?: Record<string, string[]>
): ActionErrorResponse {
  return actionError(
    message,
    ActionErrorCodes.VALIDATION_ERROR,
    fieldErrors ? { fieldErrors } : undefined
  );
}

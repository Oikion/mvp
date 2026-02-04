/**
 * Action Permission Guards
 * 
 * Provides guard functions for protecting server actions with action-level permissions.
 * These are designed to be used at the start of server actions.
 */

import { NextResponse } from "next/server";
import {
  ActionPermission,
  ActionContext,
  ActionCheckResult,
} from "./action-permissions";
import {
  canPerformAction,
  canPerformActionOnEntity,
  canPerformActionOnDeal,
  getActionPermissionContext,
} from "./action-service";

// =============================================================================
// GUARD RESULT TYPES
// =============================================================================

/**
 * Standard error response for server actions
 */
export interface ActionErrorResponse {
  success: false;
  error: string;
  code?: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_ERROR";
}

/**
 * Guard function result - either null (allowed) or an error response
 */
export type GuardResult = ActionErrorResponse | null;

// =============================================================================
// BASIC GUARDS
// =============================================================================

/**
 * Guard that requires the user to be authenticated
 */
export async function requireAuth(): Promise<GuardResult> {
  const context = await getActionPermissionContext();
  
  if (!context) {
    return {
      success: false,
      error: "Authentication required",
      code: "UNAUTHORIZED",
    };
  }
  
  return null;
}

/**
 * Guard that requires a specific action permission
 * 
 * Usage:
 * ```typescript
 * export async function createChannel(params: {...}) {
 *   const guard = await requireAction("messaging:create_channel");
 *   if (guard) return guard;
 *   // ... rest of the action
 * }
 * ```
 */
export async function requireAction(
  action: ActionPermission,
  customErrorMessage?: string
): Promise<GuardResult> {
  const result = await canPerformAction(action);
  
  if (!result.allowed) {
    return {
      success: false,
      error: customErrorMessage || result.reason || `Permission denied: ${action}`,
      code: "FORBIDDEN",
    };
  }
  
  // If ownership check is required but no context provided, 
  // we return null here and let the caller handle ownership verification
  return null;
}

/**
 * Guard that requires action permission with entity context
 * Use this when the action requires ownership verification
 * 
 * Usage:
 * ```typescript
 * export async function updateProperty(propertyId: string, data: {...}) {
 *   const property = await getProperty(propertyId);
 *   const guard = await requireActionOnEntity(
 *     "property:update",
 *     "property",
 *     propertyId,
 *     property.assigned_to
 *   );
 *   if (guard) return guard;
 *   // ... rest of the action
 * }
 * ```
 */
export async function requireActionOnEntity(
  action: ActionPermission,
  entityType: ActionContext["entityType"],
  entityId: string,
  ownerId: string | null | undefined,
  customErrorMessage?: string
): Promise<GuardResult> {
  const result = await canPerformActionOnEntity(action, entityType, entityId, ownerId);
  
  if (!result.allowed) {
    return {
      success: false,
      error: customErrorMessage || result.reason || `Permission denied: ${action}`,
      code: "FORBIDDEN",
    };
  }
  
  return null;
}

/**
 * Guard specifically for deal-related actions
 * Deals have "involved" semantics - users must be either the property or client agent
 * 
 * Usage:
 * ```typescript
 * export async function acceptDeal(dealId: string) {
 *   const deal = await getDeal(dealId);
 *   const guard = await requireDealAction(
 *     "deal:accept",
 *     dealId,
 *     deal.propertyAgentId,
 *     deal.clientAgentId
 *   );
 *   if (guard) return guard;
 *   // ... rest of the action
 * }
 * ```
 */
export async function requireDealAction(
  action: ActionPermission,
  dealId: string,
  propertyAgentId: string,
  clientAgentId: string,
  customErrorMessage?: string
): Promise<GuardResult> {
  const result = await canPerformActionOnDeal(action, dealId, propertyAgentId, clientAgentId);
  
  if (!result.allowed) {
    return {
      success: false,
      error: customErrorMessage || result.reason || `Permission denied: ${action}`,
      code: "FORBIDDEN",
    };
  }
  
  return null;
}

// =============================================================================
// MULTI-PERMISSION GUARDS
// =============================================================================

/**
 * Guard that requires ALL specified permissions
 * 
 * Usage:
 * ```typescript
 * const guard = await requireAllActions(["property:create", "property:import"]);
 * if (guard) return guard;
 * ```
 */
export async function requireAllActions(
  actions: ActionPermission[],
  customErrorMessage?: string
): Promise<GuardResult> {
  const results = await Promise.all(actions.map((a) => canPerformAction(a)));
  
  const deniedActions = results
    .map((r, i) => ({ result: r, action: actions[i] }))
    .filter(({ result }) => !result.allowed);
  
  if (deniedActions.length > 0) {
    return {
      success: false,
      error: customErrorMessage || 
        `Permission denied for: ${deniedActions.map((d) => d.action).join(", ")}`,
      code: "FORBIDDEN",
    };
  }
  
  return null;
}

/**
 * Guard that requires ANY of the specified permissions
 * 
 * Usage:
 * ```typescript
 * const guard = await requireAnyAction(["admin:manage_roles", "admin:invite_users"]);
 * if (guard) return guard;
 * ```
 */
export async function requireAnyAction(
  actions: ActionPermission[],
  customErrorMessage?: string
): Promise<GuardResult> {
  const results = await Promise.all(actions.map((a) => canPerformAction(a)));
  
  const hasAny = results.some((r) => r.allowed);
  
  if (!hasAny) {
    return {
      success: false,
      error: customErrorMessage || 
        `Permission denied. Required one of: ${actions.join(", ")}`,
      code: "FORBIDDEN",
    };
  }
  
  return null;
}

// =============================================================================
// HELPER GUARDS
// =============================================================================

/**
 * Guard that runs multiple guards in sequence
 * Returns the first error encountered, or null if all pass
 * 
 * Usage:
 * ```typescript
 * const guard = await runActionGuards(
 *   () => requireAuth(),
 *   () => requireAction("messaging:create_channel"),
 *   () => customValidation()
 * );
 * if (guard) return guard;
 * ```
 */
export async function runActionGuards(
  ...guards: Array<() => Promise<GuardResult>>
): Promise<GuardResult> {
  for (const guard of guards) {
    const result = await guard();
    if (result) {
      return result;
    }
  }
  return null;
}

/**
 * Helper to create a consistent "not found" error response
 */
export function notFoundError(entityType: string, entityId?: string): ActionErrorResponse {
  return {
    success: false,
    error: entityId 
      ? `${entityType} with ID "${entityId}" not found`
      : `${entityType} not found`,
    code: "NOT_FOUND",
  };
}

/**
 * Helper to create a consistent "validation" error response
 */
export function validationError(message: string): ActionErrorResponse {
  return {
    success: false,
    error: message,
    code: "VALIDATION_ERROR",
  };
}

/**
 * Convert a guard error result to a NextResponse for API routes
 * 
 * Usage:
 * ```typescript
 * const guard = await requireAction("admin:manage_webhooks");
 * if (guard) return handleGuardError(guard);
 * ```
 */
export function handleGuardError(guard: ActionErrorResponse): NextResponse {
  let status = 403;
  
  switch (guard.code) {
    case "UNAUTHORIZED":
      status = 401;
      break;
    case "NOT_FOUND":
      status = 404;
      break;
    case "VALIDATION_ERROR":
      status = 400;
      break;
  }
  
  return NextResponse.json({ error: guard.error }, { status });
}

// =============================================================================
// OWNERSHIP HELPERS
// =============================================================================

/**
 * Check if the current user owns an entity
 * Returns true if the user is the owner, false otherwise
 */
export async function isEntityOwner(ownerId: string | null | undefined): Promise<boolean> {
  const context = await getActionPermissionContext();
  if (!context) return false;
  return context.userId === ownerId;
}

/**
 * Check if the current user is involved in a deal
 */
export async function isDealParticipant(
  propertyAgentId: string,
  clientAgentId: string
): Promise<boolean> {
  const context = await getActionPermissionContext();
  if (!context) return false;
  return context.userId === propertyAgentId || context.userId === clientAgentId;
}

/**
 * Get the current user's ID from permission context
 * Useful for setting ownership when creating entities
 */
export async function getCurrentUserId(): Promise<string | null> {
  const context = await getActionPermissionContext();
  return context?.userId ?? null;
}

/**
 * Get the current organization ID from permission context
 */
export async function getCurrentOrganizationId(): Promise<string | null> {
  const context = await getActionPermissionContext();
  return context?.organizationId ?? null;
}

/**
 * Guard that requires the user to be in an organization
 * Returns the organizationId on success, or an error object on failure
 */
export async function requireOrg(): Promise<
  | { organizationId: string }
  | { error: string; status: number }
> {
  const context = await getActionPermissionContext();
  
  if (!context) {
    return {
      error: "Authentication required",
      status: 401,
    };
  }
  
  if (!context.organizationId) {
    return {
      error: "Organization context required",
      status: 403,
    };
  }
  
  return { organizationId: context.organizationId };
}

// =============================================================================
// TYPE GUARDS FOR ACTION RESPONSES
// =============================================================================

/**
 * Type guard to check if a response is an error response
 */
export function isActionError(response: unknown): response is ActionErrorResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    "success" in response &&
    (response as ActionErrorResponse).success === false &&
    "error" in response
  );
}

/**
 * Create a typed success response helper
 */
export function actionSuccess<T>(data: T): { success: true } & T {
  return { success: true, ...data };
}

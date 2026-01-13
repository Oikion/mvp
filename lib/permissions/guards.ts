import { NextResponse } from "next/server";
import { OrgRole } from "@prisma/client";
import {
  getUserPermissionContext,
  hasPermission,
  canAccessModule,
} from "./service";
import { PermissionKey, ModuleId } from "./types";

/**
 * Response for permission denied
 */
export function permissionDenied(message = "Permission denied"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Response for viewer trying to modify data
 */
export function viewerCannotModify(): NextResponse {
  return NextResponse.json(
    { error: "Viewers cannot modify data" },
    { status: 403 }
  );
}

/**
 * Guard: Require user to not be a viewer (can modify data)
 * Use this for all POST, PUT, DELETE endpoints
 */
export async function requireCanModify(): Promise<NextResponse | null> {
  const context = await getUserPermissionContext();
  
  if (!context) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (context.isViewer) {
    return viewerCannotModify();
  }

  return null; // Permission granted
}

/**
 * Guard: Require a specific permission
 */
export async function requirePermission(
  permission: PermissionKey,
  errorMessage?: string
): Promise<NextResponse | null> {
  const hasIt = await hasPermission(permission);
  
  if (!hasIt) {
    return permissionDenied(errorMessage || `Missing permission: ${permission}`);
  }

  return null;
}

/**
 * Guard: Require access to a specific module
 */
export async function requireModuleAccess(
  moduleId: ModuleId,
  errorMessage?: string
): Promise<NextResponse | null> {
  const canAccess = await canAccessModule(moduleId);
  
  if (!canAccess) {
    return permissionDenied(errorMessage || `No access to module: ${moduleId}`);
  }

  return null;
}

/**
 * Guard: Require user to be at least a specific role
 */
export async function requireMinRole(
  minRole: OrgRole
): Promise<NextResponse | null> {
  const context = await getUserPermissionContext();
  
  if (!context) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const roleHierarchy: Record<OrgRole, number> = {
    [OrgRole.OWNER]: 4,
    [OrgRole.LEAD]: 3,
    [OrgRole.MEMBER]: 2,
    [OrgRole.VIEWER]: 1,
  };

  if (roleHierarchy[context.role] < roleHierarchy[minRole]) {
    return permissionDenied(`Requires ${minRole} role or higher`);
  }

  return null;
}

/**
 * Guard: Require user to be an owner
 */
export async function requireOwner(): Promise<NextResponse | null> {
  return requireMinRole(OrgRole.OWNER);
}

/**
 * Guard: Require user to be at least a lead
 */
export async function requireAtLeastLead(): Promise<NextResponse | null> {
  return requireMinRole(OrgRole.LEAD);
}

/**
 * Guard: Require user to be at least a member
 */
export async function requireAtLeastMember(): Promise<NextResponse | null> {
  return requireMinRole(OrgRole.MEMBER);
}

/**
 * Guard: Check if user can reassign agents
 * Members cannot reassign, but can edit other fields
 */
export async function requireCanReassign(): Promise<NextResponse | null> {
  return requirePermission(
    "canReassignAgent",
    "You do not have permission to change the assigned agent"
  );
}

/**
 * Guard: Check if user can export data
 */
export async function requireCanExport(): Promise<NextResponse | null> {
  return requirePermission(
    "canExport",
    "You do not have permission to export data"
  );
}

/**
 * Guard: Check if user can manage roles
 */
export async function requireCanManageRoles(): Promise<NextResponse | null> {
  return requirePermission(
    "canManageRoles",
    "You do not have permission to manage roles"
  );
}

/**
 * Guard: Check if user can invite users
 */
export async function requireCanInvite(): Promise<NextResponse | null> {
  return requirePermission(
    "canInviteUsers",
    "You do not have permission to invite users"
  );
}

/**
 * Helper: Check if the request body contains assigned_to field change
 * and if the user has permission to change it
 * 
 * @param body - Request body
 * @param existingAssignedTo - Current assigned_to value
 * @returns NextResponse if permission denied, null if allowed
 */
export async function checkAssignedToChange(
  body: { assigned_to?: string },
  existingAssignedTo: string | null | undefined
): Promise<NextResponse | null> {
  // If assigned_to is not being changed, allow
  if (body.assigned_to === undefined || body.assigned_to === existingAssignedTo) {
    return null;
  }

  // Check if user can reassign
  return requireCanReassign();
}

/**
 * Wrapper to run multiple guards and return first failure
 */
export async function runGuards(
  ...guards: Array<() => Promise<NextResponse | null>>
): Promise<NextResponse | null> {
  for (const guard of guards) {
    const result = await guard();
    if (result) {
      return result;
    }
  }
  return null;
}

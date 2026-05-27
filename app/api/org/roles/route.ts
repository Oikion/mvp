import { NextResponse } from "next/server";
import { OrgRole } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireOwner } from "@/lib/permissions/guards";
import {
  getOrganizationRolePermissionsAll,
  getRoleModuleAccessAll,
  updateRolePermissions,
  updateRoleModuleAccess,
} from "@/lib/permissions/service";
import { PermissionConfig, ModuleId } from "@/lib/permissions/types";
import { ALL_MODULES } from "@/lib/permissions/defaults";
import { apiUnauthorized } from "@/lib/api-response";

/**
 * GET /api/org/roles
 * Get all role permissions and module access for the current organization
 */
export async function GET() {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) return apiUnauthorized();

    // Get all role permissions
    const permissions = await getOrganizationRolePermissionsAll(organizationId);

    // Get module access for each role
    const moduleAccess: Record<OrgRole, Record<ModuleId, boolean>> = {
      [OrgRole.OWNER]: {} as Record<ModuleId, boolean>,
      [OrgRole.LEAD]: {} as Record<ModuleId, boolean>,
      [OrgRole.MEMBER]: {} as Record<ModuleId, boolean>,
      [OrgRole.VIEWER]: {} as Record<ModuleId, boolean>,
    };

    const roles = Object.values(OrgRole);
    const accessResults = await Promise.all(
      roles.map(role => getRoleModuleAccessAll(organizationId, role))
    );
    roles.forEach((role, i) => {
      moduleAccess[role] = accessResults[i];
    });

    return NextResponse.json({
      permissions,
      moduleAccess,
      availableModules: ALL_MODULES,
    });
  } catch (error) {
    console.error("[GET_ROLES]", error);
    return NextResponse.json(
      { error: "Failed to get role permissions" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/org/roles
 * Update role permissions for the current organization
 * Only owners can do this
 */
export async function PUT(req: Request) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) return apiUnauthorized();

    // Permission check: Only owners can manage roles
    const permissionError = await requireOwner();
    if (permissionError) return permissionError;

    const body = await req.json();
    const { role, permissions, moduleAccess } = body;

    if (!role || !Object.values(OrgRole).includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Cannot modify owner permissions
    if (role === OrgRole.OWNER) {
      return NextResponse.json(
        { error: "Cannot modify owner permissions" },
        { status: 400 }
      );
    }

    // Update permissions if provided
    // Audit write is handled inside updateRolePermissions (service layer).
    if (permissions) {
      await updateRolePermissions(
        organizationId,
        role,
        permissions as Partial<PermissionConfig>,
        userId
      );
    }

    // Update module access if provided
    // Audit write is handled inside updateRoleModuleAccess (service layer).
    if (moduleAccess) {
      for (const [moduleId, hasAccess] of Object.entries(moduleAccess)) {
        await updateRoleModuleAccess(
          organizationId,
          role,
          moduleId as ModuleId,
          hasAccess as boolean,
          userId
        );
      }
    }

    // Revoke active sessions for all members with the affected role so
    // permission changes take effect immediately rather than at JWT expiry.
    try {
      const clerk = await clerkClient();
      const memberships = await clerk.organizations.getOrganizationMembershipList({
        organizationId,
      });
      const affectedUserIds = memberships.data
        .filter((m) => m.role === role)
        .map((m) => m.publicUserData?.userId)
        .filter((id): id is string => !!id);

      await Promise.allSettled(
        affectedUserIds.map(async (affectedUserId) => {
          const sessions = await clerk.sessions.getSessionList({
            userId: affectedUserId,
            status: "active",
          });
          return Promise.allSettled(
            sessions.data.map((s) => clerk.sessions.revokeSession(s.id))
          );
        })
      );
    } catch (sessionError) {
      // Non-fatal: sessions will expire naturally
      console.error("[ORG_ROLES_PUT] Failed to revoke sessions after role permission change:", sessionError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[UPDATE_ROLES]", error);
    return NextResponse.json(
      { error: "Failed to update role permissions" },
      { status: 500 }
    );
  }
}

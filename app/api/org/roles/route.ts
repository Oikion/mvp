import { NextResponse } from "next/server";
import { OrgRole } from "@prisma/client";
import { getCurrentOrganizationId } from "@/lib/permissions/action-guards";
import { requireOwner } from "@/lib/permissions/guards";
import {
  getOrganizationRolePermissionsAll,
  getRoleModuleAccessAll,
  updateRolePermissions,
  updateRoleModuleAccess,
} from "@/lib/permissions/service";
import { PermissionConfig, ModuleId } from "@/lib/permissions/types";
import { ALL_MODULES } from "@/lib/permissions/defaults";

/**
 * GET /api/org/roles
 * Get all role permissions and module access for the current organization
 */
export async function GET() {
  try {
    const organizationId = await getCurrentOrganizationId();

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 }
      );
    }

    // Get all role permissions
    const permissions = await getOrganizationRolePermissionsAll(organizationId);

    // Get module access for each role
    const moduleAccess: Record<OrgRole, Record<ModuleId, boolean>> = {
      [OrgRole.OWNER]: {} as Record<ModuleId, boolean>,
      [OrgRole.LEAD]: {} as Record<ModuleId, boolean>,
      [OrgRole.MEMBER]: {} as Record<ModuleId, boolean>,
      [OrgRole.VIEWER]: {} as Record<ModuleId, boolean>,
    };

    for (const role of Object.values(OrgRole)) {
      moduleAccess[role] = await getRoleModuleAccessAll(organizationId, role);
    }

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
    // Permission check: Only owners can manage roles
    const permissionError = await requireOwner();
    if (permissionError) return permissionError;

    const organizationId = await getCurrentOrganizationId();

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 }
      );
    }

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
    if (permissions) {
      await updateRolePermissions(organizationId, role, permissions as Partial<PermissionConfig>);
    }

    // Update module access if provided
    if (moduleAccess) {
      for (const [moduleId, hasAccess] of Object.entries(moduleAccess)) {
        await updateRoleModuleAccess(
          organizationId,
          role,
          moduleId as ModuleId,
          hasAccess as boolean
        );
      }
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

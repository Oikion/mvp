import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { OrgRole } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import {
  clerkRoleToOrgRole,
  PermissionConfig,
  ModuleId,
} from "@/lib/permissions/types";
import {
  DEFAULT_PERMISSIONS,
  ALL_MODULES,
  DEFAULT_VIEWER_MODULES,
} from "@/lib/permissions/defaults";

/**
 * GET /api/org/permissions
 * Returns the current user's permissions and module access for the current organization
 */
export async function GET() {
  try {
    const [authResult, currentUser] = await Promise.all([
      auth(),
      getCurrentUser().catch(() => null),
    ]);

    const { orgId, orgRole } = authResult;

    if (!orgId || !currentUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const role = clerkRoleToOrgRole(orgRole);

    // Get custom permissions for this role in this org
    const customPermissions = await prismadb.organizationRolePermission.findUnique({
      where: {
        organizationId_role: {
          organizationId: orgId,
          role,
        },
      },
    });

    // Merge with defaults
    const permissions: PermissionConfig = {
      ...DEFAULT_PERMISSIONS[role],
      ...(customPermissions?.permissions as Partial<PermissionConfig> || {}),
    };

    // Get module access
    let moduleAccess: ModuleId[];

    if (role === OrgRole.OWNER || role === OrgRole.LEAD) {
      moduleAccess = [...ALL_MODULES];
    } else if (role === OrgRole.MEMBER) {
      moduleAccess = ALL_MODULES.filter((m) => m !== "admin");
    } else {
      // Viewer - check role-level and user-level access
      const [roleAccess, userAccess] = await Promise.all([
        prismadb.roleModuleAccess.findMany({
          where: { organizationId: orgId, role },
        }),
        prismadb.userModuleAccess.findMany({
          where: { organizationId: orgId, userId: currentUser.id },
        }),
      ]);

      // Start with defaults if no role config
      const modules: Set<ModuleId> = roleAccess.length === 0
        ? new Set(DEFAULT_VIEWER_MODULES)
        : new Set(roleAccess.filter((r) => r.hasAccess).map((r) => r.moduleId as ModuleId));

      // Apply user overrides
      for (const access of userAccess) {
        if (access.hasAccess) {
          modules.add(access.moduleId as ModuleId);
        } else {
          modules.delete(access.moduleId as ModuleId);
        }
      }

      moduleAccess = Array.from(modules);
    }

    return NextResponse.json({
      role,
      permissions,
      moduleAccess,
      isOwner: role === OrgRole.OWNER,
      isLead: role === OrgRole.LEAD,
      isMember: role === OrgRole.MEMBER,
      isViewer: role === OrgRole.VIEWER,
    });
  } catch (error) {
    console.error("[GET_PERMISSIONS]", error);
    return NextResponse.json(
      { error: "Failed to get permissions" },
      { status: 500 }
    );
  }
}

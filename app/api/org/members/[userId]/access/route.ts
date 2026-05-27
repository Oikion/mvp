import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";
import { prismadb } from "@/lib/prisma";
import { requireOwner, requireAtLeastLead } from "@/lib/permissions/guards";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { updateUserModuleAccess } from "@/lib/permissions/service";
import { ModuleId, ALL_MODULES } from "@/lib/permissions";
import { apiUnauthorized } from "@/lib/api-response";

/**
 * GET /api/org/members/[userId]/access
 * Get module access for a specific user
 */
export async function GET(
  req: Request,
  props: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: callerId, orgId: organizationId } = await auth();
    if (!callerId || !organizationId) return apiUnauthorized();

    // Require LEAD or higher role to read other members' module access config
    const roleGuard = await requireAtLeastLead();
    if (roleGuard) return roleGuard;

    const { userId } = await props.params;

    // Verify the target user belongs to the caller's organization
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    const memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId,
    });
    const isMember = memberships.data.some(
      (m) => m.publicUserData?.userId === userId
    );
    if (!isMember) {
      return NextResponse.json(
        { error: "User is not a member of this organization" },
        { status: 403 }
      );
    }

    // Get user's module access overrides
    const userAccess = await prismadb.userModuleAccess.findMany({
      where: {
        organizationId,
        userId,
      },
    });

    // Build access map
    const accessMap: Record<ModuleId, boolean | null> = {} as Record<ModuleId, boolean | null>;
    for (const moduleId of ALL_MODULES) {
      const override = userAccess.find((a) => a.moduleId === moduleId);
      accessMap[moduleId] = override ? override.hasAccess : null; // null = use role default
    }

    return NextResponse.json({
      userId,
      moduleAccess: accessMap,
    });
  } catch (error) {
    console.error("[GET_USER_ACCESS]", error);
    return NextResponse.json(
      { error: "Failed to get user access" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/org/members/[userId]/access
 * Update module access for a specific user
 * Only owners can do this
 */
export async function PUT(
  req: Request,
  props: { params: Promise<{ userId: string }> }
) {
  try {
    // Permission check: Only owners can manage user access
    const permissionError = await requireOwner();
    if (permissionError) return permissionError;

    const { userId } = await props.params;
    const organizationId = await getCurrentOrgId();

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { moduleAccess } = body;

    if (!moduleAccess || typeof moduleAccess !== "object") {
      return NextResponse.json(
        { error: "Invalid module access data" },
        { status: 400 }
      );
    }

    // Update each module access
    for (const [moduleId, hasAccess] of Object.entries(moduleAccess)) {
      if (hasAccess === null) {
        // Remove override (use role default)
        await prismadb.userModuleAccess.deleteMany({
          where: {
            organizationId,
            userId,
            moduleId,
          },
        });
      } else {
        await updateUserModuleAccess(
          organizationId,
          userId,
          moduleId as ModuleId,
          hasAccess as boolean
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[UPDATE_USER_ACCESS]", error);
    return NextResponse.json(
      { error: "Failed to update user access" },
      { status: 500 }
    );
  }
}

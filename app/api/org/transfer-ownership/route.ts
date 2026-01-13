import { NextResponse } from "next/server";
import { createClerkClient } from "@clerk/backend";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/tenant";
import { requireOwner } from "@/lib/permissions/guards";

/**
 * POST /api/org/transfer-ownership
 * Transfer organization ownership to another member
 * Only the current owner can do this
 */
export async function POST(req: Request) {
  try {
    // Permission check: Only owners can transfer ownership
    const permissionError = await requireOwner();
    if (permissionError) return permissionError;

    const { userId: currentClerkUserId } = await auth();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
    const { newOwnerUserId } = body;

    if (!newOwnerUserId) {
      return NextResponse.json(
        { error: "New owner user ID is required" },
        { status: 400 }
      );
    }

    if (!currentClerkUserId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // Get the new owner's Clerk user ID from our database
    const newOwner = await prismadb.users.findUnique({
      where: { id: newOwnerUserId },
      select: { clerkUserId: true, email: true, name: true },
    });

    if (!newOwner?.clerkUserId) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Verify the new owner is a member of the organization
    const memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId,
    });

    const newOwnerMembership = memberships.data.find(
      (m) => m.publicUserData?.userId === newOwner.clerkUserId
    );

    if (!newOwnerMembership) {
      return NextResponse.json(
        { error: "User is not a member of this organization" },
        { status: 400 }
      );
    }

    // Get current owner's membership
    const currentOwnerMembership = memberships.data.find(
      (m) => m.publicUserData?.userId === currentClerkUserId
    );

    if (!currentOwnerMembership) {
      return NextResponse.json(
        { error: "Current owner membership not found" },
        { status: 400 }
      );
    }

    // Check that there's only one owner (the current user)
    const owners = memberships.data.filter((m) => 
      m.role === "org:owner" || m.role === "org:admin"
    );

    if (owners.length > 1) {
      // There are multiple owners/admins, just change roles
    }

    // Update the new owner's role to org:owner
    await clerk.organizations.updateOrganizationMembership({
      organizationId,
      userId: newOwner.clerkUserId,
      role: "org:owner",
    });

    // Demote current owner to org:lead (or org:member if they prefer)
    await clerk.organizations.updateOrganizationMembership({
      organizationId,
      userId: currentClerkUserId,
      role: "org:lead",
    });

    return NextResponse.json({
      success: true,
      message: `Ownership transferred to ${newOwner.name || newOwner.email}`,
      newOwnerId: newOwnerUserId,
    });
  } catch (error) {
    console.error("[TRANSFER_OWNERSHIP]", error);
    return NextResponse.json(
      { error: "Failed to transfer ownership" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/org/transfer-ownership
 * Check if ownership can be transferred (validation)
 */
export async function GET() {
  try {
    // Permission check: Only owners can view transfer options
    const permissionError = await requireOwner();
    if (permissionError) return permissionError;

    const { userId: currentClerkUserId } = await auth();
    const organizationId = await getCurrentOrgId();

    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // Get all organization members
    const memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId,
      limit: 100,
    });

    // Filter out the current owner and get eligible members
    const eligibleMembers = memberships.data
      .filter((m) => m.publicUserData?.userId !== currentClerkUserId)
      .map((m) => ({
        clerkUserId: m.publicUserData?.userId,
        name: `${m.publicUserData?.firstName || ""} ${m.publicUserData?.lastName || ""}`.trim(),
        email: m.publicUserData?.identifier,
        currentRole: m.role,
      }));

    // Get our database user IDs for these members
    const clerkUserIds = eligibleMembers
      .map((m) => m.clerkUserId)
      .filter((id): id is string => !!id);

    const dbUsers = await prismadb.users.findMany({
      where: {
        clerkUserId: { in: clerkUserIds },
      },
      select: {
        id: true,
        clerkUserId: true,
        name: true,
        email: true,
        avatar: true,
      },
    });

    const eligibleWithDbId = eligibleMembers.map((m) => {
      const dbUser = dbUsers.find((u) => u.clerkUserId === m.clerkUserId);
      return {
        ...m,
        userId: dbUser?.id,
        avatar: dbUser?.avatar,
        dbName: dbUser?.name,
      };
    }).filter((m) => m.userId); // Only include users that exist in our database

    return NextResponse.json({
      canTransfer: eligibleWithDbId.length > 0,
      eligibleMembers: eligibleWithDbId,
      memberCount: memberships.data.length,
    });
  } catch (error) {
    console.error("[GET_TRANSFER_OPTIONS]", error);
    return NextResponse.json(
      { error: "Failed to get transfer options" },
      { status: 500 }
    );
  }
}

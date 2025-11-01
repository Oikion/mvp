import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { createClerkClient } from "@clerk/backend";
import { auth } from "@clerk/nextjs/server";

export async function POST(
  req: Request,
  props: { params: Promise<{ userId: string }> }
) {
  const params = await props.params;

  try {
    const currentUser = await getCurrentUser();
    
    // Ensure user can only check their own account
    if (currentUser.id !== params.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthenticated" },
        { status: 401 }
      );
    }

    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    
    // Get all organizations the user is a member of
    let orgMemberships;
    try {
      orgMemberships = await clerk.users.getOrganizationMembershipList({
        userId: clerkUserId,
      });
    } catch (error: any) {
      // If user has no organizations or error fetching, return empty list
      if (error?.status === 404) {
        return NextResponse.json({
          hasOnlyAdminOrgs: false,
          orgsToDelete: [],
        });
      }
      throw error; // Re-throw if it's a different error
    }

    const orgsToDelete: Array<{ id: string; name: string }> = [];

    // Check each organization to see if user is the only admin
    for (const membership of orgMemberships.data) {
      const orgId = membership.organization.id;
      
      try {
        // Get all members of this organization
        let orgMembers;
        try {
          orgMembers = await clerk.organizations.getOrganizationMembershipList({
            organizationId: orgId,
          });
        } catch (memberError: any) {
          // If organization doesn't exist or can't get members, skip it
          if (memberError?.status === 404) {
            console.log(`Organization ${orgId} not found, skipping`);
            continue;
          }
          throw memberError; // Re-throw if it's a different error
        }

        // Count admins
        const adminMembers = orgMembers.data.filter(
          (member) => member.role === "org:admin"
        );

        // If user is the only admin, this org will be deleted
        // Check if current user is in the admin list and is the only admin
        const isCurrentUserAdmin = adminMembers.some(
          (member) => member.publicUserData?.userId === clerkUserId
        );

        if (isCurrentUserAdmin && adminMembers.length === 1) {
          try {
            const org = await clerk.organizations.getOrganization({ organizationId: orgId });
            orgsToDelete.push({
              id: orgId,
              name: org.name,
            });
          } catch (orgError: any) {
            // If organization doesn't exist (404), skip it
            if (orgError?.status === 404) {
              console.log(`Organization ${orgId} not found, skipping`);
            } else {
              // For other errors, still add org ID but without name
              orgsToDelete.push({
                id: orgId,
                name: `Organization ${orgId}`,
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error checking organization ${orgId}:`, error);
        // Continue checking other organizations even if one fails
      }
    }

    return NextResponse.json({
      hasOnlyAdminOrgs: orgsToDelete.length > 0,
      orgsToDelete,
    });
  } catch (error) {
    console.log("[CHECK_ORGS_BEFORE_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to check organizations" },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { createClerkClient } from "@clerk/backend";
import { auth } from "@clerk/nextjs/server";

export async function DELETE(
  req: Request,
  props: { params: Promise<{ userId: string }> }
) {
  const params = await props.params;

  try {
    const currentUser = await getCurrentUser();
    
    // Ensure user can only delete their own account
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
      // If user has no organizations or error fetching, continue with user deletion
      if (error?.status === 404) {
        orgMemberships = { data: [] };
      } else {
        // Log error but continue with deletion
        console.error("Error fetching user organizations:", error);
        orgMemberships = { data: [] };
      }
    }

    // Delete organizations where user is the only admin
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

        // If user is the only admin, delete the organization
        const isCurrentUserAdmin = adminMembers.some(
          (member) => member.publicUserData?.userId === clerkUserId
        );

        if (isCurrentUserAdmin && adminMembers.length === 1) {
          // Delete all data associated with this organization
          const orgIdString = orgId;

          // Delete clients associated with this organization
          await prismadb.clients.deleteMany({
            where: {
              organizationId: orgIdString,
            },
          });

          // Delete properties associated with this organization
          await prismadb.properties.deleteMany({
            where: {
              organizationId: orgIdString,
            },
          });

          // Delete OpenAI keys associated with this organization
          await prismadb.openAi_keys.deleteMany({
            where: {
              organization_id: orgIdString,
            },
          });

          // Delete the organization from Clerk
          try {
            await clerk.organizations.deleteOrganization(orgId);
          } catch (orgError: any) {
            // If organization already deleted or doesn't exist (404), that's fine
            if (orgError?.status === 404) {
              console.log(`Organization ${orgId} already deleted or doesn't exist`);
            } else {
              throw orgError; // Re-throw if it's a different error
            }
          }
        }
      } catch (error) {
        console.error(`Error processing organization ${orgId}:`, error);
        // Continue with other organizations even if one fails
      }
    }

    // Delete user's personal data

    // Delete all CRM tasks assigned to the user
    await prismadb.crm_Accounts_Tasks.deleteMany({
      where: {
        user: currentUser.id,
      },
    });

    // Delete all clients where user is assigned
    await prismadb.clients.deleteMany({
      where: {
        assigned_to: currentUser.id,
      },
    });

    // Delete all contacts where user is assigned
    await prismadb.client_Contacts.deleteMany({
      where: {
        assigned_to: currentUser.id,
      },
    });

    // Delete all properties where user is assigned
    await prismadb.properties.deleteMany({
      where: {
        assigned_to: currentUser.id,
      },
    });

    // Delete all documents created by the user
    await prismadb.documents.deleteMany({
      where: {
        created_by_user: currentUser.id,
      },
    });

    // Delete all OpenAI keys for the user
    await prismadb.openAi_keys.deleteMany({
      where: {
        user: currentUser.id,
      },
    });

    // Delete the user from Clerk FIRST (before database deletion to avoid auth issues)
    // This will also remove them from any remaining organizations
    try {
      await clerk.users.deleteUser(clerkUserId);
      console.log("[DELETE_ACCOUNT] User deleted from Clerk successfully");
    } catch (clerkError: any) {
      // If user already deleted in Clerk (404), that's fine
      if (clerkError?.status === 404) {
        console.log("[DELETE_ACCOUNT] User already deleted from Clerk");
      } else {
        // Log but continue - we'll still try to delete from database
        console.error("[DELETE_ACCOUNT] Error deleting user from Clerk:", clerkError);
        // Don't throw - we want to continue with database cleanup
      }
    }

    // Delete the user from the database (after Clerk deletion to avoid auth conflicts)
    await prismadb.users.delete({
      where: {
        id: currentUser.id,
      },
    });
    console.log("[DELETE_ACCOUNT] User deleted from database successfully");

    return NextResponse.json({
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.log("[DELETE_ACCOUNT]", error);
    return NextResponse.json(
      { error: "Failed to delete account", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}


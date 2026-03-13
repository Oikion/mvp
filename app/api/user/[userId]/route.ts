import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { deleteUserOwnedOrganizations } from "@/lib/clerk-sync";
import { requireOwner } from "@/lib/permissions/guards";

export async function GET(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;

  try {
    const currentUser = await getCurrentUser();

    // Self-access is always allowed; cross-user requires Owner role
    if (currentUser.id !== params.userId) {
      const denied = await requireOwner();
      if (denied) return denied;
    }

    const user = await prismadb.users.findMany({
      where: {
        id: params.userId,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    return new NextResponse("Initial error", { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;

  try {
    // Only org owners can delete users
    const denied = await requireOwner();
    if (denied) return denied;

    // First, get the user to retrieve their clerkUserId
    const userToDelete = await prismadb.users.findUnique({
      where: {
        id: params.userId,
      },
    });

    if (!userToDelete) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // If user has a Clerk ID, delete their owned organizations first
    if (userToDelete.clerkUserId) {
      try {
        await deleteUserOwnedOrganizations(userToDelete.clerkUserId);
      } catch (error) {
        // Continue with user deletion even if organization deletion fails
        // This ensures the user can still be deleted
      }
    }

    // Now delete the user
    const user = await prismadb.users.delete({
      where: {
        id: params.userId,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete user" }, { status: 500 });
  }
}

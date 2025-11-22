import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { deleteUserOwnedOrganizations } from "@/lib/clerk-sync";

export async function GET(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  
  try {
    const currentUser = await getCurrentUser();
    if (currentUser.id !== params.userId && !currentUser.is_admin) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const user = await prismadb.users.findMany({
      where: {
        id: params.userId,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.log("[USER_GET]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser.is_admin) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    
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
        const deletedOrgIds = await deleteUserOwnedOrganizations(userToDelete.clerkUserId);
        console.log(`[USER_DELETE] Deleted ${deletedOrgIds.length} organizations owned by user ${params.userId}`);
      } catch (error: any) {
        console.error(`[USER_DELETE] Error deleting organizations for user ${params.userId}:`, error);
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
    console.log("[USER_DELETE]", error);
    return NextResponse.json({ message: error }, { status: 500 });
  }
}

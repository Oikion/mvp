import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

/**
 * Update user profile (name, account_name)
 * NOTE: Username updates should use /api/user/[userId]/update-username
 * to properly sync with Clerk
 */
export async function PUT(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  
  try {
    const currentUser = await getCurrentUser();
    const { name, account_name } = await req.json();

    if (!params.userId) {
      return new NextResponse("No user ID provided", { status: 400 });
    }

    if (currentUser.id !== params.userId && !currentUser.is_admin) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Update profile fields (NOT username - that's managed via Clerk)
    const updatedUser = await prismadb.users.update({
      data: {
        name: name,
        // Username is NOT updated here - use /api/user/[userId]/update-username
        account_name: account_name,
      },
      where: {
        id: params.userId,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    return new NextResponse("Failed to update profile", { status: 500 });
  }
}

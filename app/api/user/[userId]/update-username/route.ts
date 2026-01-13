import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { createClerkClient } from "@clerk/backend";

/**
 * Update username via Clerk API
 * Clerk is the source of truth for usernames
 */
export async function PUT(
  req: Request,
  props: { params: Promise<{ userId: string }> }
) {
  const params = await props.params;

  try {
    const currentUser = await getCurrentUser();
    const { username } = await req.json();

    if (!params.userId) {
      return NextResponse.json(
        { error: "No user ID provided" },
        { status: 400 }
      );
    }

    // Only allow users to update their own username, or admins
    if (currentUser.id !== params.userId && !currentUser.is_admin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Validate username
    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    if (username.length < 2 || username.length > 50) {
      return NextResponse.json(
        { error: "Username must be between 2 and 50 characters" },
        { status: 400 }
      );
    }

    if (!/^\w+$/.test(username)) {
      return NextResponse.json(
        { error: "Username can only contain letters, numbers, and underscores" },
        { status: 400 }
      );
    }

    // Get the user to find their Clerk ID
    const user = await prismadb.users.findUnique({
      where: { id: params.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!user.clerkUserId) {
      return NextResponse.json(
        { error: "User is not linked to Clerk" },
        { status: 400 }
      );
    }

    // Update username in Clerk (source of truth)
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    try {
      await clerk.users.updateUser(user.clerkUserId, {
        username: username.toLowerCase(),
      });
    } catch (clerkError) {
      // Handle Clerk-specific errors
      const error = clerkError as { errors?: Array<{ message?: string; code?: string }> };
      const firstError = error?.errors?.[0];
      
      if (firstError?.code === "form_identifier_exists" || 
          firstError?.message?.toLowerCase().includes("taken") ||
          firstError?.message?.toLowerCase().includes("exists")) {
        return NextResponse.json(
          { error: "This username is already taken" },
          { status: 409 }
        );
      }

      console.error("Clerk username update error:", clerkError);
      return NextResponse.json(
        { error: "Failed to update username in authentication system" },
        { status: 500 }
      );
    }

    // Update local cache to match Clerk
    const updatedUser = await prismadb.users.update({
      where: { id: params.userId },
      data: { username: username.toLowerCase() },
    });

    // Also update AgentProfile slug if it exists
    await prismadb.agentProfile.updateMany({
      where: { userId: params.userId },
      data: { slug: username.toLowerCase() },
    });

    return NextResponse.json({
      success: true,
      username: updatedUser.username,
    });
  } catch (error) {
    console.error("Error updating username:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}









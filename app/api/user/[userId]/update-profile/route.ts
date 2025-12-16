import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { createClerkClient } from "@clerk/backend";

interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  username?: string;
}

/**
 * Update user profile via Clerk API
 * Updates firstName, lastName, and optionally username
 * Clerk is the source of truth for these fields
 */
export async function PUT(
  req: Request,
  props: { params: Promise<{ userId: string }> }
) {
  const params = await props.params;

  try {
    const currentUser = await getCurrentUser();
    const body: UpdateProfileRequest = await req.json();

    if (!params.userId) {
      return NextResponse.json(
        { error: "No user ID provided" },
        { status: 400 }
      );
    }

    // Only allow users to update their own profile, or admins
    if (currentUser.id !== params.userId && !currentUser.is_admin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Validate firstName
    if (body.firstName !== undefined) {
      if (typeof body.firstName !== "string" || body.firstName.trim().length < 1) {
        return NextResponse.json(
          { error: "First name must be at least 1 character" },
          { status: 400 }
        );
      }
      if (body.firstName.length > 50) {
        return NextResponse.json(
          { error: "First name must be at most 50 characters" },
          { status: 400 }
        );
      }
    }

    // Validate lastName
    if (body.lastName !== undefined) {
      if (typeof body.lastName !== "string" || body.lastName.trim().length < 1) {
        return NextResponse.json(
          { error: "Last name must be at least 1 character" },
          { status: 400 }
        );
      }
      if (body.lastName.length > 50) {
        return NextResponse.json(
          { error: "Last name must be at most 50 characters" },
          { status: 400 }
        );
      }
    }

    // Validate username if provided
    if (body.username !== undefined) {
      if (typeof body.username !== "string" || body.username.length < 2) {
        return NextResponse.json(
          { error: "Username must be at least 2 characters" },
          { status: 400 }
        );
      }
      if (body.username.length > 50) {
        return NextResponse.json(
          { error: "Username must be at most 50 characters" },
          { status: 400 }
        );
      }
      if (!/^\w+$/.test(body.username)) {
        return NextResponse.json(
          { error: "Username can only contain letters, numbers, and underscores" },
          { status: 400 }
        );
      }
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

    // Build Clerk update payload
    const clerkUpdateData: {
      firstName?: string;
      lastName?: string;
      username?: string;
    } = {};

    if (body.firstName) {
      clerkUpdateData.firstName = body.firstName.trim();
    }
    if (body.lastName) {
      clerkUpdateData.lastName = body.lastName.trim();
    }
    if (body.username) {
      clerkUpdateData.username = body.username.toLowerCase();
    }

    // Update in Clerk (source of truth)
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    try {
      await clerk.users.updateUser(user.clerkUserId, clerkUpdateData);
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

      console.error("Clerk profile update error:", clerkError);
      return NextResponse.json(
        { error: "Failed to update profile in authentication system" },
        { status: 500 }
      );
    }

    // Build local DB update payload
    const dbUpdateData: {
      firstName?: string;
      lastName?: string;
      name?: string;
      username?: string;
    } = {};

    if (body.firstName) {
      dbUpdateData.firstName = body.firstName.trim();
    }
    if (body.lastName) {
      dbUpdateData.lastName = body.lastName.trim();
    }
    if (body.firstName || body.lastName) {
      // Update full name from first + last
      const firstName = body.firstName?.trim() || user.firstName || "";
      const lastName = body.lastName?.trim() || user.lastName || "";
      dbUpdateData.name = `${firstName} ${lastName}`.trim();
    }
    if (body.username) {
      dbUpdateData.username = body.username.toLowerCase();
    }

    // Update local cache to match Clerk
    const updatedUser = await prismadb.users.update({
      where: { id: params.userId },
      data: dbUpdateData,
    });

    // Also update AgentProfile slug if username was changed
    if (body.username) {
      await prismadb.agentProfile.updateMany({
        where: { userId: params.userId },
        data: { slug: body.username.toLowerCase() },
      });
    }

    return NextResponse.json({
      success: true,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      name: updatedUser.name,
      username: updatedUser.username,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


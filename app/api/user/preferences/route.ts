import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { LayoutPreference } from "@prisma/client";

// Valid layout preference values
const VALID_LAYOUT_PREFERENCES = new Set<LayoutPreference>(["DEFAULT", "WIDE"]);

export async function GET() {
  try {
    const user = await getCurrentUser();

    const userData = await prismadb.users.findUnique({
      where: { id: user.id },
      select: {
        referralBoxDismissed: true,
        referralApplicationStatus: true,
        layoutPreference: true,
      },
    });

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      referralBoxDismissed: userData.referralBoxDismissed,
      referralApplicationStatus: userData.referralApplicationStatus,
      layoutPreference: userData.layoutPreference,
    });
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const { referralBoxDismissed, layoutPreference } = body;

    // Build the update data object dynamically
    const updateData: {
      referralBoxDismissed?: boolean;
      layoutPreference?: LayoutPreference;
    } = {};

    // Validate and add referralBoxDismissed if provided
    if (referralBoxDismissed !== undefined) {
      if (typeof referralBoxDismissed !== "boolean") {
        return NextResponse.json(
          { error: "Invalid referralBoxDismissed value" },
          { status: 400 }
        );
      }
      updateData.referralBoxDismissed = referralBoxDismissed;
    }

    // Validate and add layoutPreference if provided
    if (layoutPreference !== undefined) {
      if (!VALID_LAYOUT_PREFERENCES.has(layoutPreference)) {
        return NextResponse.json(
          { error: "Invalid layoutPreference value. Must be 'DEFAULT' or 'WIDE'" },
          { status: 400 }
        );
      }
      updateData.layoutPreference = layoutPreference;
    }

    // Ensure at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updatedUser = await prismadb.users.update({
      where: { id: user.id },
      data: updateData,
      select: {
        layoutPreference: true,
        referralBoxDismissed: true,
      },
    });

    return NextResponse.json({ 
      success: true,
      layoutPreference: updatedUser.layoutPreference,
      referralBoxDismissed: updatedUser.referralBoxDismissed,
    });
  } catch (error) {
    console.error("Error updating user preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}

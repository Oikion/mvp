import { NextResponse } from "next/server";
import { getUnreadCountsByPage } from "@/actions/notifications/get-notifications";

/**
 * GET /api/notifications/counts
 * Get unread notification counts grouped by page
 * Used for sidebar notification badges
 */
export async function GET() {
  try {
    const counts = await getUnreadCountsByPage();

    return NextResponse.json({ counts });
  } catch (error: unknown) {
    console.error("[NOTIFICATION_COUNTS_GET]", error);

    // Handle authentication errors properly
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (errorMessage === "User not authenticated" || errorMessage === "User not found in database") {
      return NextResponse.json(
        { error: "Unauthenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: errorMessage || "Failed to fetch notification counts" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { markNotificationRead } from "@/actions/notifications/mark-notification-read";

/**
 * PUT /api/notifications/[notificationId]
 * Mark a notification as read
 */
export async function PUT(
  req: Request,
  props: { params: Promise<{ notificationId: string }> }
) {
  try {
    const params = await props.params;
    const notification = await markNotificationRead(params.notificationId);

    return NextResponse.json({ notification });
  } catch (error: any) {
    console.error("[NOTIFICATION_PUT]", error);
    
    // Handle authentication errors properly
    if (error?.message === "User not authenticated" || error?.message === "User not found in database") {
      return NextResponse.json(
        { error: "Unauthenticated" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}


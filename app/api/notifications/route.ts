import { NextResponse } from "next/server";
import { getNotifications, getUnreadCount, getTotalNotificationsCount } from "@/actions/notifications/get-notifications";
import { createNotification } from "@/actions/notifications/create-notification";
import { markAllNotificationsRead } from "@/actions/notifications/mark-notification-read";

/**
 * GET /api/notifications
 * Get notifications for the current user
 * Supports pagination with limit and offset
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const type = searchParams.get("type");

    const notifications = await getNotifications({
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      unreadOnly,
      type: type || undefined,
    });

    const unreadCount = await getUnreadCount();
    const totalCount = await getTotalNotificationsCount({
      unreadOnly,
      type: type || undefined,
    });

    return NextResponse.json({
      notifications,
      unreadCount,
      totalCount,
      hasMore: offset && limit 
        ? parseInt(offset) + notifications.length < totalCount
        : notifications.length === (limit ? parseInt(limit) : 50),
    });
  } catch (error: unknown) {
    console.error("[NOTIFICATIONS_GET]", error);
    
    // Handle authentication errors properly
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (errorMessage === "User not authenticated" || errorMessage === "User not found in database") {
      return NextResponse.json(
        { error: "Unauthenticated" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage || "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Create a new notification (admin/internal use)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const notification = await createNotification(body);

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error: unknown) {
    console.error("[NOTIFICATIONS_POST]", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create notification";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications
 * Mark all notifications as read
 */
export async function PUT(req: Request) {
  try {
    const result = await markAllNotificationsRead();
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[NOTIFICATIONS_PUT]", error);
    
    // Handle authentication errors properly
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (errorMessage === "User not authenticated" || errorMessage === "User not found in database") {
      return NextResponse.json(
        { error: "Unauthenticated" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage || "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { markAsRead } from "@/actions/messaging";

/**
 * POST /api/messaging/read
 * 
 * Mark messages as read in a channel or conversation.
 * 
 * Body:
 * - channelId?: string - The channel ID to mark as read
 * - conversationId?: string - The conversation ID to mark as read
 * - messageIds?: string[] - Specific message IDs to mark as read (optional)
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { channelId, conversationId, messageIds } = body;

    if (!channelId && !conversationId) {
      return NextResponse.json(
        { error: "Either channelId or conversationId is required" },
        { status: 400 }
      );
    }

    const result = await markAsRead({
      channelId,
      conversationId,
      messageIds,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to mark as read" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Mark as read error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

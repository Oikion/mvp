import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { startDirectMessage } from "@/actions/messaging";

/**
 * POST /api/messaging/dm
 * 
 * Start a direct message conversation with another user.
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
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Target user ID is required" },
        { status: 400 }
      );
    }

    const result = await startDirectMessage(targetUserId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to start conversation" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      conversationId: result.conversationId,
    }, { status: 201 });
  } catch (error) {
    console.error("[API] Start DM error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserConversations } from "@/actions/messaging";

/**
 * GET /api/messaging/conversations
 * 
 * Returns all conversations for the current user (channels, DMs, entity-linked)
 */
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await getUserConversations();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to get conversations" },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversations: result.conversations });
  } catch (error) {
    console.error("[API] Get conversations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

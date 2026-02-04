import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { 
  muteConversation, 
  unmuteConversation, 
  deleteConversation,
  leaveConversation,
} from "@/actions/messaging";
import { prismadb } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ conversationId: string }>;
}

/**
 * PATCH /api/messaging/conversations/[conversationId]
 * 
 * Update conversation settings (mute/unmute)
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { conversationId } = await params;
    const body = await req.json();
    const { action, mutedUntil } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case "mute":
        result = await muteConversation(
          conversationId, 
          mutedUntil ? new Date(mutedUntil) : undefined
        );
        break;
      case "unmute":
        result = await unmuteConversation(conversationId);
        break;
      case "leave":
        result = await leaveConversation(conversationId);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Action failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Update conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/messaging/conversations/[conversationId]
 * 
 * Delete/leave a conversation
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { conversationId } = await params;

    const result = await deleteConversation(conversationId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to delete conversation" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Delete conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/messaging/conversations/[conversationId]
 * 
 * Get conversation details including mute status
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { conversationId } = await params;

    // Get user from clerk ID
    const user = await prismadb.users.findFirst({
      where: { clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get conversation with participant info
    const conversation = await prismadb.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          where: { userId: user.id, leftAt: null },
          select: {
            mutedUntil: true,
            lastReadAt: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const participantInfo = conversation.participants[0];
    const isMuted = participantInfo?.mutedUntil 
      ? new Date(participantInfo.mutedUntil) > new Date() 
      : false;

    return NextResponse.json({
      id: conversation.id,
      name: conversation.name,
      isGroup: conversation.isGroup,
      isMuted,
      mutedUntil: participantInfo?.mutedUntil,
      lastReadAt: participantInfo?.lastReadAt,
    });
  } catch (error) {
    console.error("[API] Get conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

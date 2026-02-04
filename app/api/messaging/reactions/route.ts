import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { publishToChannel, getChannelName, getConversationChannelName } from "@/lib/ably";

/**
 * POST /api/messaging/reactions
 * 
 * Add or toggle a reaction on a message.
 * If the user already has this reaction, it will be removed (toggle behavior).
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
    const { messageId, emoji } = body;

    if (!messageId || !emoji) {
      return NextResponse.json(
        { error: "Message ID and emoji are required" },
        { status: 400 }
      );
    }

    // Get user
    const user = await prismadb.users.findUnique({
      where: { clerkUserId: userId },
      select: { id: true, name: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get message to verify it exists and get channel/conversation info
    const message = await prismadb.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        channelId: true,
        conversationId: true,
        organizationId: true,
      },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Check if reaction already exists (for toggle behavior)
    const existingReaction = await prismadb.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: user.id,
          emoji,
        },
      },
    });

    let action: "added" | "removed";
    let updatedReactions;

    if (existingReaction) {
      // Remove existing reaction
      await prismadb.messageReaction.delete({
        where: { id: existingReaction.id },
      });
      action = "removed";
    } else {
      // Add new reaction
      await prismadb.messageReaction.create({
        data: {
          messageId,
          userId: user.id,
          emoji,
        },
      });
      action = "added";
    }

    // Get updated reactions for the message
    updatedReactions = await prismadb.messageReaction.findMany({
      where: { messageId },
      select: {
        emoji: true,
        userId: true,
      },
    });

    // Emit Ably event for real-time update
    try {
      const organizationId = message.organizationId || await getCurrentOrgId();
      const ablyChannelName = message.channelId
        ? getChannelName(organizationId, message.channelId)
        : getConversationChannelName(organizationId, message.conversationId!);
      
      await publishToChannel(ablyChannelName, "message:reaction", {
        messageId,
        emoji,
        userId: user.id,
        userName: user.name,
        action,
        reactions: updatedReactions,
      });
    } catch {
      // Ably not configured, skip real-time notification
    }

    return NextResponse.json({
      success: true,
      action,
      reactions: updatedReactions,
    });
  } catch (error) {
    console.error("[API] Reaction error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/messaging/reactions?messageId=xxx
 * 
 * Get reactions for a message.
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const messageId = url.searchParams.get("messageId");

    if (!messageId) {
      return NextResponse.json(
        { error: "Message ID is required" },
        { status: 400 }
      );
    }

    const reactions = await prismadb.messageReaction.findMany({
      where: { messageId },
      select: {
        emoji: true,
        userId: true,
      },
    });

    return NextResponse.json({
      reactions,
    });
  } catch (error) {
    console.error("[API] Get reactions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/messaging/reactions?messageId=xxx&emoji=xxx
 * 
 * Remove a specific reaction from a message.
 */
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const messageId = url.searchParams.get("messageId");
    const emoji = url.searchParams.get("emoji");

    if (!messageId || !emoji) {
      return NextResponse.json(
        { error: "Message ID and emoji are required" },
        { status: 400 }
      );
    }

    // Get user
    const user = await prismadb.users.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Delete the reaction
    await prismadb.messageReaction.deleteMany({
      where: {
        messageId,
        userId: user.id,
        emoji,
      },
    });

    // Get message for Ably notification
    const message = await prismadb.message.findUnique({
      where: { id: messageId },
      select: {
        channelId: true,
        conversationId: true,
        organizationId: true,
      },
    });

    if (message) {
      // Get updated reactions
      const updatedReactions = await prismadb.messageReaction.findMany({
        where: { messageId },
        select: {
          emoji: true,
          userId: true,
        },
      });

      // Emit Ably event
      try {
        const organizationId = message.organizationId || await getCurrentOrgId();
        const ablyChannelName = message.channelId
          ? getChannelName(organizationId, message.channelId)
          : getConversationChannelName(organizationId, message.conversationId!);
        
        await publishToChannel(ablyChannelName, "message:reaction", {
          messageId,
          emoji,
          userId: user.id,
          action: "removed",
          reactions: updatedReactions,
        });
      } catch {
        // Ably not configured, skip
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Delete reaction error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

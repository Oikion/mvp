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

    // Emoji must be a short string (1–10 chars covers all Unicode emoji sequences)
    if (typeof emoji !== "string" || emoji.length === 0 || emoji.length > 10) {
      return NextResponse.json({ error: "Invalid emoji value" }, { status: 400 });
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

    // SECURITY: Resolve the message only if it belongs to the caller's org OR
    // it lives in a conversation the caller participates in. The OR branch keeps
    // cross-org PERSONAL/SHARED DMs working (those messages carry the SENDER's
    // org, not the caller's) while still blocking foreign-org channel messages.
    // Channel/participant membership below is the authoritative access gate.
    const organizationId = await getCurrentOrgId();
    const message = await prismadb.message.findFirst({
      where: {
        id: messageId,
        OR: [
          { organizationId },
          { conversation: { participants: { some: { userId: user.id, leftAt: null } } } },
        ],
      },
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

    // SECURITY: Verify user has access to the channel or conversation
    if (message.channelId) {
      const membership = await prismadb.channelMember.findFirst({
        where: {
          channelId: message.channelId,
          userId: user.id,
          channel: { organizationId: message.organizationId },
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: "Channel not found or access denied" },
          { status: 403 }
        );
      }
    } else if (message.conversationId) {
      const participant = await prismadb.conversationParticipant.findFirst({
        where: {
          conversationId: message.conversationId,
          userId: user.id,
          leftAt: null,
        },
      });

      if (!participant) {
        return NextResponse.json(
          { error: "Conversation not found or access denied" },
          { status: 403 }
        );
      }
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
      // Use the message's own org for the channel name (cross-org DM messages
      // carry the sender's org); fall back to the caller's org.
      const ablyOrgId = message.organizationId || organizationId;
      const ablyChannelName = message.channelId
        ? getChannelName(ablyOrgId, message.channelId)
        : getConversationChannelName(ablyOrgId, message.conversationId!);

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

    // Get current user (needed for membership check)
    const currentUser = await prismadb.users.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // SECURITY: Resolve the message if it is in the caller's org OR in a
    // conversation the caller participates in (cross-org DM messages carry the
    // sender's org). Channel/participant membership below is the access gate.
    const organizationId = await getCurrentOrgId();
    const message = await prismadb.message.findFirst({
      where: {
        id: messageId,
        OR: [
          { organizationId },
          { conversation: { participants: { some: { userId: currentUser.id, leftAt: null } } } },
        ],
      },
      select: { id: true, channelId: true, conversationId: true },
    });

    if (!message) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // SECURITY: Verify user has access to the channel or conversation
    if (message.channelId) {
      const membership = await prismadb.channelMember.findFirst({
        where: {
          channelId: message.channelId,
          userId: currentUser.id,
          channel: { organizationId },
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: "Channel not found or access denied" },
          { status: 403 }
        );
      }
    } else if (message.conversationId) {
      const participant = await prismadb.conversationParticipant.findFirst({
        where: {
          conversationId: message.conversationId,
          userId: currentUser.id,
          leftAt: null,
        },
      });

      if (!participant) {
        return NextResponse.json(
          { error: "Conversation not found or access denied" },
          { status: 403 }
        );
      }
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

    if (typeof emoji !== "string" || emoji.length === 0 || emoji.length > 10) {
      return NextResponse.json({ error: "Invalid emoji value" }, { status: 400 });
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

    // SECURITY: Resolve the message if it is in the caller's org OR in a
    // conversation the caller participates in (cross-org DM messages carry the
    // sender's org). deleteMany below is self-scoped by userId, so the caller
    // can only ever remove their own reaction.
    const organizationId = await getCurrentOrgId();
    const messageCheck = await prismadb.message.findFirst({
      where: {
        id: messageId,
        OR: [
          { organizationId },
          { conversation: { participants: { some: { userId: user.id, leftAt: null } } } },
        ],
      },
      select: { id: true, channelId: true, conversationId: true, organizationId: true },
    });

    if (!messageCheck) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete the reaction
    await prismadb.messageReaction.deleteMany({
      where: {
        messageId,
        userId: user.id,
        emoji,
      },
    });

    // Emit Ably event using the already-fetched (access-checked) message — no
    // need for a second, unscoped lookup.
    {
      const updatedReactions = await prismadb.messageReaction.findMany({
        where: { messageId },
        select: {
          emoji: true,
          userId: true,
        },
      });

      try {
        // Cross-org DM messages carry the sender's org; fall back to caller's.
        const ablyOrgId = messageCheck.organizationId || organizationId;
        const ablyChannelName = messageCheck.channelId
          ? getChannelName(ablyOrgId, messageCheck.channelId)
          : getConversationChannelName(ablyOrgId, messageCheck.conversationId!);

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

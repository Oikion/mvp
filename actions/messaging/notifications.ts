"use server";

import { prismadb } from "@/lib/prisma";
import { createNotification, createNotificationsForUsers } from "@/actions/notifications/create-notification";
import { getCurrentOrgId } from "@/lib/get-current-user";

/**
 * Create a notification for a new message
 */
export async function notifyNewMessage(params: {
  recipientUserId: string;
  senderUserId: string;
  senderName: string;
  channelId?: string;
  conversationId?: string;
  channelName?: string;
  messagePreview: string;
}): Promise<boolean> {
  try {
    const organizationId = await getCurrentOrgId();

    // Don't notify the sender
    if (params.recipientUserId === params.senderUserId) {
      return true;
    }

    // Check user's notification preferences
    const settings = await prismadb.userNotificationSettings.findUnique({
      where: { userId: params.recipientUserId },
    });

    // If user has disabled social/messaging in-app notifications, skip
    if (settings && !settings.socialInAppEnabled) {
      return true;
    }

    const isChannel = !!params.channelId;
    const title = isChannel
      ? `New message in #${params.channelName || "channel"}`
      : `New message from ${params.senderName}`;

    const message = params.messagePreview.length > 100
      ? params.messagePreview.substring(0, 100) + "..."
      : params.messagePreview;

    await createNotification({
      userId: params.recipientUserId,
      type: isChannel ? "CHANNEL_MESSAGE" : "MESSAGE_RECEIVED",
      title,
      message,
      entityType: isChannel ? "CHANNEL" : "CONVERSATION",
      entityId: params.channelId || params.conversationId!,
      actorId: params.senderUserId,
      actorName: params.senderName,
      metadata: {
        channelId: params.channelId,
        conversationId: params.conversationId,
        channelName: params.channelName,
      },
    });

    return true;
  } catch (error) {
    console.error("[MESSAGING] Notify new message error:", error);
    return false;
  }
}

/**
 * Create notifications for a mention in a message
 */
export async function notifyMention(params: {
  mentionedUserIds: string[];
  senderUserId: string;
  senderName: string;
  channelId?: string;
  conversationId?: string;
  channelName?: string;
  messagePreview: string;
}): Promise<boolean> {
  try {
    // Filter out the sender
    const recipientIds = params.mentionedUserIds.filter(
      (id) => id !== params.senderUserId
    );

    if (recipientIds.length === 0) {
      return true;
    }

    const title = `${params.senderName} mentioned you`;
    const message = params.messagePreview.length > 100
      ? params.messagePreview.substring(0, 100) + "..."
      : params.messagePreview;

    await createNotificationsForUsers(recipientIds, {
      type: "MESSAGE_MENTION",
      title,
      message,
      entityType: params.channelId ? "CHANNEL" : "CONVERSATION",
      entityId: params.channelId || params.conversationId!,
      actorId: params.senderUserId,
      actorName: params.senderName,
      metadata: {
        channelId: params.channelId,
        conversationId: params.conversationId,
        channelName: params.channelName,
      },
    });

    return true;
  } catch (error) {
    console.error("[MESSAGING] Notify mention error:", error);
    return false;
  }
}

/**
 * Create notifications for channel invite
 */
export async function notifyChannelInvite(params: {
  invitedUserIds: string[];
  inviterUserId: string;
  inviterName: string;
  channelId: string;
  channelName: string;
}): Promise<boolean> {
  try {
    // Filter out the inviter
    const recipientIds = params.invitedUserIds.filter(
      (id) => id !== params.inviterUserId
    );

    if (recipientIds.length === 0) {
      return true;
    }

    const title = `Invited to #${params.channelName}`;
    const message = `${params.inviterName} invited you to join the channel`;

    await createNotificationsForUsers(recipientIds, {
      type: "CHANNEL_INVITE",
      title,
      message,
      entityType: "CHANNEL",
      entityId: params.channelId,
      actorId: params.inviterUserId,
      actorName: params.inviterName,
      metadata: {
        channelId: params.channelId,
        channelName: params.channelName,
      },
    });

    return true;
  } catch (error) {
    console.error("[MESSAGING] Notify channel invite error:", error);
    return false;
  }
}

/**
 * Get unread message count for a user
 */
export async function getUnreadMessageCount(userId: string): Promise<number> {
  try {
    const organizationId = await getCurrentOrgId();

    // Get channels user is a member of
    const memberships = await prismadb.channelMember.findMany({
      where: { userId },
      select: { channelId: true },
    });
    const channelIds = memberships.map(m => m.channelId);

    // Get conversations user is a participant of
    const participations = await prismadb.conversationParticipant.findMany({
      where: { userId, leftAt: null },
      select: { conversationId: true },
    });
    const conversationIds = participations.map(p => p.conversationId);

    // Count unread messages
    const count = await prismadb.message.count({
      where: {
        organizationId,
        isDeleted: false,
        senderId: { not: userId },
        readReceipts: {
          none: { userId },
        },
        OR: [
          { channelId: { in: channelIds } },
          { conversationId: { in: conversationIds } },
        ],
      },
    });

    return count;
  } catch (error) {
    console.error("[MESSAGING] Get unread count error:", error);
    return 0;
  }
}

/**
 * Mark messages as read in a channel or conversation
 */
export async function markAsRead(params: {
  userId: string;
  channelId?: string;
  conversationId?: string;
}): Promise<boolean> {
  try {
    // Get all unread messages
    const unreadMessages = await prismadb.message.findMany({
      where: {
        channelId: params.channelId,
        conversationId: params.conversationId,
        isDeleted: false,
        senderId: { not: params.userId },
        readReceipts: {
          none: { userId: params.userId },
        },
      },
      select: { id: true },
    });

    if (unreadMessages.length === 0) {
      return true;
    }

    // Create read receipts
    await prismadb.messageRead.createMany({
      data: unreadMessages.map(msg => ({
        messageId: msg.id,
        userId: params.userId,
      })),
      skipDuplicates: true,
    });

    // Update last read time for conversation participant
    if (params.conversationId) {
      await prismadb.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId: params.conversationId,
            userId: params.userId,
          },
        },
        data: { lastReadAt: new Date() },
      });
    }

    return true;
  } catch (error) {
    console.error("[MESSAGING] Mark as read error:", error);
    return false;
  }
}

/**
 * Send email notification for new message (for users with email notifications enabled)
 */
export async function sendMessageEmailNotification(params: {
  recipientUserId: string;
  senderName: string;
  channelName?: string;
  messagePreview: string;
  isChannel: boolean;
}): Promise<boolean> {
  try {
    // Check user's notification preferences
    const settings = await prismadb.userNotificationSettings.findUnique({
      where: { userId: params.recipientUserId },
    });

    // If user has disabled social/messaging email notifications, skip
    if (settings && !settings.socialEmailEnabled) {
      return true;
    }

    // Get recipient user
    const recipient = await prismadb.users.findUnique({
      where: { id: params.recipientUserId },
      select: { email: true, name: true },
    });

    if (!recipient?.email) {
      return false;
    }

    // TODO: Implement email sending using Resend
    // For now, just log that we would send an email
    console.log(`[MESSAGING] Would send email notification to ${recipient.email}`);

    return true;
  } catch (error) {
    console.error("[MESSAGING] Send email notification error:", error);
    return false;
  }
}

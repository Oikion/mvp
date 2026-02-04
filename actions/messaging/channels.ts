"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { generateFriendlyId } from "@/lib/friendly-id";
import { ChannelType, ChannelMemberRole } from "@prisma/client";
import { requireAction } from "@/lib/permissions";
import { isCurrentOrgPersonal } from "@/lib/personal-workspace-guard";

/**
 * Create a new organization channel
 */
export async function createChannel(params: {
  name: string;
  description?: string;
  channelType?: ChannelType;
  isDefault?: boolean;
}): Promise<{
  success: boolean;
  channel?: {
    id: string;
    name: string;
    slug: string;
  };
  error?: string;
}> {
  try {
    // Permission check: Only Leads and Owners can create channels
    const guard = await requireAction("messaging:create_channel");
    if (guard) return guard;

    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Generate slug from name
    const slug = params.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if channel already exists
    const existing = await prismadb.channel.findUnique({
      where: {
        organizationId_slug: {
          organizationId,
          slug,
        },
      },
    });

    if (existing) {
      return { success: false, error: "A channel with this name already exists" };
    }

    // Create channel in database
    const channelId = await generateFriendlyId(prismadb, "Channel");
    const channel = await prismadb.channel.create({
      data: {
        id: channelId,
        organizationId,
        name: params.name,
        slug,
        description: params.description,
        channelType: params.channelType || "PUBLIC",
        isDefault: params.isDefault || false,
        createdById: user.id,
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
      },
    });

    // Emit Ably event for real-time update
    try {
      const { publishToChannel, getOrgChannelName } = await import("@/lib/ably");
      await publishToChannel(
        getOrgChannelName(organizationId),
        "channel:created",
        {
          id: channel.id,
          name: channel.name,
          slug: channel.slug,
          description: channel.description,
          channelType: channel.channelType,
          isDefault: channel.isDefault,
        }
      );
    } catch {
      // Ably not configured, skip real-time notification
    }

    return {
      success: true,
      channel: {
        id: channel.id,
        name: channel.name,
        slug: channel.slug,
      },
    };
  } catch (error) {
    console.error("[MESSAGING] Create channel error:", error);
    return { success: false, error: "Failed to create channel" };
  }
}

/**
 * Get all channels for the current organization
 */
export async function getOrganizationChannels(): Promise<{
  success: boolean;
  channels?: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    channelType: ChannelType;
    isDefault: boolean;
    memberCount: number;
    unreadCount: number;
  }>;
  error?: string;
}> {
  try {
    // Permission check: Users need messaging:read permission
    const guard = await requireAction("messaging:read");
    if (guard) return guard;

    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const channels = await prismadb.channel.findMany({
      where: {
        organizationId,
        isArchived: false,
        OR: [
          { channelType: "PUBLIC" },
          { members: { some: { userId: user.id } } },
        ],
      },
      orderBy: [
        { isDefault: "desc" },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        channelType: true,
        isDefault: true,
        _count: {
          select: { members: true },
        },
      },
    });

    // Get unread counts for each channel
    const channelsWithUnread = await Promise.all(
      channels.map(async (channel) => {
        const unreadCount = await prismadb.message.count({
          where: {
            channelId: channel.id,
            isDeleted: false,
            senderId: { not: user.id },
            readReceipts: {
              none: { userId: user.id },
            },
          },
        });

        return {
          id: channel.id,
          name: channel.name,
          slug: channel.slug,
          description: channel.description,
          channelType: channel.channelType,
          isDefault: channel.isDefault,
          memberCount: channel._count.members,
          unreadCount,
        };
      })
    );

    return { success: true, channels: channelsWithUnread };
  } catch (error) {
    console.error("[MESSAGING] Get channels error:", error);
    return { success: false, error: "Failed to get channels" };
  }
}

/**
 * Update a channel
 */
export async function updateChannel(
  channelId: string,
  params: {
    name?: string;
    description?: string;
    channelType?: ChannelType;
  }
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Permission check: Only Leads and Owners can update channels
    const guard = await requireAction("messaging:update_channel");
    if (guard) return guard;

    const organizationId = await getCurrentOrgId();

    // Get the channel
    const channel = await prismadb.channel.findFirst({
      where: {
        id: channelId,
        organizationId,
      },
    });

    if (!channel) {
      return { success: false, error: "Channel not found" };
    }

    // Update channel
    const updated = await prismadb.channel.update({
      where: { id: channelId },
      data: {
        name: params.name,
        description: params.description,
        channelType: params.channelType,
      },
    });

    // Emit Ably event for real-time update
    try {
      const { publishToChannel, getOrgChannelName } = await import("@/lib/ably");
      await publishToChannel(
        getOrgChannelName(organizationId),
        "channel:updated",
        {
          id: updated.id,
          name: updated.name,
          slug: updated.slug,
          description: updated.description,
          channelType: updated.channelType,
        }
      );
    } catch {
      // Ably not configured, skip real-time notification
    }

    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Update channel error:", error);
    return { success: false, error: "Failed to update channel" };
  }
}

/**
 * Archive a channel (soft delete)
 */
export async function archiveChannel(channelId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Permission check: Only Leads and Owners can archive channels
    const guard = await requireAction("messaging:archive_channel");
    if (guard) return guard;

    const organizationId = await getCurrentOrgId();

    // Get the channel
    const channel = await prismadb.channel.findFirst({
      where: {
        id: channelId,
        organizationId,
      },
    });

    if (!channel) {
      return { success: false, error: "Channel not found" };
    }

    if (channel.isDefault) {
      return { success: false, error: "Cannot archive default channel" };
    }

    // Archive channel
    await prismadb.channel.update({
      where: { id: channelId },
      data: { isArchived: true },
    });

    // Emit Ably event for real-time update
    try {
      const { publishToChannel, getOrgChannelName } = await import("@/lib/ably");
      await publishToChannel(
        getOrgChannelName(organizationId),
        "channel:archived",
        { id: channelId }
      );
    } catch {
      // Ably not configured, skip real-time notification
    }

    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Archive channel error:", error);
    return { success: false, error: "Failed to archive channel" };
  }
}

/**
 * Create default channels for a new organization
 */
export async function createDefaultChannels(organizationId: string, creatorUserId: string): Promise<{
  success: boolean;
  channels?: string[];
  error?: string;
}> {
  try {
    const createdChannels: string[] = [];

    // Default channels to create
    const defaultChannels = [
      {
        name: "General",
        slug: "general",
        description: "General discussion for the team",
        channelType: "PUBLIC" as ChannelType,
        isDefault: true,
      },
      {
        name: "Announcements",
        slug: "announcements",
        description: "Important announcements (admin only)",
        channelType: "ANNOUNCEMENT" as ChannelType,
        isDefault: true,
      },
    ];

    for (const channelDef of defaultChannels) {
      // Check if already exists
      const existing = await prismadb.channel.findUnique({
        where: {
          organizationId_slug: {
            organizationId,
            slug: channelDef.slug,
          },
        },
      });

      if (existing) {
        createdChannels.push(existing.id);
        continue;
      }

      // Create channel
      const channelId = await generateFriendlyId(prismadb, "Channel");
      await prismadb.channel.create({
        data: {
          id: channelId,
          organizationId,
          name: channelDef.name,
          slug: channelDef.slug,
          description: channelDef.description,
          channelType: channelDef.channelType,
          isDefault: channelDef.isDefault,
          createdById: creatorUserId,
          members: {
            create: {
              userId: creatorUserId,
              role: "OWNER",
            },
          },
        },
      });

      createdChannels.push(channelId);
    }

    return { success: true, channels: createdChannels };
  } catch (error) {
    console.error("[MESSAGING] Create default channels error:", error);
    return { success: false, error: "Failed to create default channels" };
  }
}

/**
 * Add members to a channel
 */
export async function addChannelMembers(
  channelId: string,
  userIds: string[],
  role: ChannelMemberRole = "MEMBER"
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Permission check: Only Leads and Owners can manage channel members
    const guard = await requireAction("messaging:manage_members");
    if (guard) return guard;

    const organizationId = await getCurrentOrgId();

    // Get the channel
    const channel = await prismadb.channel.findFirst({
      where: {
        id: channelId,
        organizationId,
      },
    });

    if (!channel) {
      return { success: false, error: "Channel not found" };
    }

    // Add members
    await prismadb.channelMember.createMany({
      data: userIds.map((userId) => ({
        channelId,
        userId,
        role,
      })),
      skipDuplicates: true,
    });

    // Emit Ably event for real-time update
    try {
      const { publishToChannel, getUserChannelName } = await import("@/lib/ably");
      for (const userId of userIds) {
        await publishToChannel(
          getUserChannelName(userId),
          "channel:joined",
          {
            id: channel.id,
            name: channel.name,
            slug: channel.slug,
          }
        );
      }
    } catch {
      // Ably not configured, skip real-time notification
    }

    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Add channel members error:", error);
    return { success: false, error: "Failed to add members" };
  }
}

/**
 * Remove a member from a channel
 */
export async function removeChannelMember(
  channelId: string,
  userId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Permission check: Only Leads and Owners can manage channel members
    const guard = await requireAction("messaging:manage_members");
    if (guard) return guard;

    const organizationId = await getCurrentOrgId();

    // Get the channel
    const channel = await prismadb.channel.findFirst({
      where: {
        id: channelId,
        organizationId,
      },
    });

    if (!channel) {
      return { success: false, error: "Channel not found" };
    }

    // Remove member
    await prismadb.channelMember.delete({
      where: {
        channelId_userId: { channelId, userId },
      },
    });

    // Emit Ably event for real-time update
    try {
      const { publishToChannel, getUserChannelName } = await import("@/lib/ably");
      await publishToChannel(
        getUserChannelName(userId),
        "channel:left",
        { id: channelId }
      );
    } catch {
      // Ably not configured, skip real-time notification
    }

    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Remove channel member error:", error);
    return { success: false, error: "Failed to remove member" };
  }
}

/**
 * Join a public channel
 */
export async function joinChannel(channelId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Permission check: Users need messaging:send_message to join channels
    const guard = await requireAction("messaging:send_message");
    if (guard) return guard;

    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Get the channel
    const channel = await prismadb.channel.findFirst({
      where: {
        id: channelId,
        organizationId,
        channelType: "PUBLIC",
        isArchived: false,
      },
    });

    if (!channel) {
      return { success: false, error: "Channel not found or is not public" };
    }

    // Add member
    await prismadb.channelMember.upsert({
      where: {
        channelId_userId: { channelId, userId: user.id },
      },
      create: {
        channelId,
        userId: user.id,
        role: "MEMBER",
      },
      update: {},
    });

    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Join channel error:", error);
    return { success: false, error: "Failed to join channel" };
  }
}

/**
 * Leave a channel
 */
export async function leaveChannel(channelId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Permission check: Users need messaging:send_message to leave channels (same as join)
    const guard = await requireAction("messaging:send_message");
    if (guard) return guard;

    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Get the channel
    const channel = await prismadb.channel.findFirst({
      where: {
        id: channelId,
        organizationId,
      },
      include: {
        members: {
          where: { userId: user.id },
        },
      },
    });

    if (!channel) {
      return { success: false, error: "Channel not found" };
    }

    // In personal mode, channel owner cannot leave (they own the channel)
    // In agency mode, owners can leave since the organization owns the channel
    if (channel.members[0]?.role === "OWNER") {
      const isPersonal = await isCurrentOrgPersonal();
      if (isPersonal) {
        return { success: false, error: "Channel owner cannot leave in personal mode" };
      }
    }

    // Remove member
    await prismadb.channelMember.delete({
      where: {
        channelId_userId: { channelId, userId: user.id },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Leave channel error:", error);
    return { success: false, error: "Failed to leave channel" };
  }
}

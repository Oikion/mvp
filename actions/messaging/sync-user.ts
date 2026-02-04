"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { createAblyTokenRequest, isAblyConfigured, publishToChannel, getPresenceChannelName } from "@/lib/ably";
import type { TokenRequest } from "ably";

/**
 * Get messaging credentials for the current user
 * Returns an Ably token request for client authentication
 */
export async function getMessagingCredentials(): Promise<{
  success: boolean;
  credentials?: {
    userId: string;
    organizationId: string;
    tokenRequest: TokenRequest;
  };
  error?: string;
  errorCode?: string;
}> {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Check if Ably is configured
    if (!isAblyConfigured()) {
      return {
        success: false,
        error: "Messaging service not configured",
        errorCode: "NOT_CONFIGURED",
      };
    }

    // Generate Ably token request
    const tokenRequest = await createAblyTokenRequest(user.id, organizationId);
    
    if (!tokenRequest) {
      return {
        success: false,
        error: "Failed to create authentication token",
        errorCode: "TOKEN_ERROR",
      };
    }

    // Update user presence
    await prismadb.userPresence.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        status: "ONLINE",
        lastSeenAt: new Date(),
      },
      update: {
        status: "ONLINE",
        lastSeenAt: new Date(),
      },
    });

    return {
      success: true,
      credentials: {
        userId: user.id,
        organizationId,
        tokenRequest,
      },
    };
  } catch (error) {
    console.error("[MESSAGING] Get credentials error:", error);
    return { success: false, error: "Failed to get messaging credentials" };
  }
}

/**
 * Sync user to messaging system
 * Called when a user joins an organization
 */
export async function syncUserToMessaging(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Ensure user presence record exists
    await prismadb.userPresence.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        status: "OFFLINE",
      },
      update: {},
    });

    // Join all default channels in the organization
    const defaultChannels = await prismadb.channel.findMany({
      where: {
        organizationId,
        isDefault: true,
        isArchived: false,
      },
    });

    for (const channel of defaultChannels) {
      await prismadb.channelMember.upsert({
        where: {
          channelId_userId: { channelId: channel.id, userId: user.id },
        },
        create: {
          channelId: channel.id,
          userId: user.id,
          role: "MEMBER",
        },
        update: {},
      });
    }

    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Sync user error:", error);
    return { success: false, error: "Failed to sync user" };
  }
}

/**
 * Disable messaging for a user
 * Called when a user leaves an organization
 */
export async function disableUserMessaging(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Update presence to offline
    await prismadb.userPresence.update({
      where: { userId },
      data: {
        status: "OFFLINE",
        lastSeenAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Disable user error:", error);
    return { success: false, error: "Failed to disable messaging" };
  }
}

/**
 * Enable messaging for a user
 */
export async function enableUserMessaging(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();

    await prismadb.userPresence.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        status: "ONLINE",
      },
      update: {
        status: "ONLINE",
        lastSeenAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Enable user error:", error);
    return { success: false, error: "Failed to enable messaging" };
  }
}

/**
 * Sync all organization members to messaging
 * Called when setting up messaging for an organization
 */
export async function syncOrganizationMembers(organizationId: string): Promise<{
  success: boolean;
  syncedCount?: number;
  error?: string;
}> {
  try {
    // Get all default channels
    const defaultChannels = await prismadb.channel.findMany({
      where: {
        organizationId,
        isDefault: true,
        isArchived: false,
      },
    });

    // This would need to get organization members from Clerk
    // For now, we'll just ensure the channels exist
    // Members get added when they first access messaging

    return { success: true, syncedCount: 0 };
  } catch (error) {
    console.error("[MESSAGING] Sync organization error:", error);
    return { success: false, error: "Failed to sync organization" };
  }
}

/**
 * Update user presence status
 */
export async function updateUserPresence(
  status: "ONLINE" | "AWAY" | "BUSY" | "OFFLINE",
  statusMessage?: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    await prismadb.userPresence.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        status,
        statusMessage,
      },
      update: {
        status,
        statusMessage,
        lastSeenAt: new Date(),
      },
    });

    // Broadcast presence update via Ably
    await publishToChannel(
      getPresenceChannelName(organizationId),
      "presence",
      {
        userId: user.id,
        status,
        statusMessage,
      }
    );

    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Update presence error:", error);
    return { success: false, error: "Failed to update presence" };
  }
}

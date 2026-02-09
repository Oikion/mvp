"use server";

import { createClerkClient } from "@clerk/backend";
import { auth } from "@clerk/nextjs/server";
import { ReservedNameType } from "@prisma/client";

import { isReservedName } from "@/lib/reserved-names";
import type { UsernameAvailabilityResult } from "@/types/onboarding";

/**
 * Check username availability using Clerk API
 * Clerk is the source of truth for usernames
 * 
 * @param username - The username to check
 * @param excludeCurrentUser - If true, the current user's username is considered "available" (for editing own username)
 */
export async function checkUsernameAvailability(
  username: string,
  excludeCurrentUser: boolean = false
): Promise<UsernameAvailabilityResult> {
  try {
    if (!username || username.trim().length < 2) {
      return {
        available: false,
        error: "Username must be at least 2 characters",
      };
    }

    if (username.length > 50) {
      return {
        available: false,
        error: "Username must be at most 50 characters",
      };
    }

    // Validate format: alphanumeric and underscores only
    if (!/^\w+$/.test(username)) {
      return {
        available: false,
        error: "Username can only contain letters, numbers, and underscores",
      };
    }

    const reserved = await isReservedName({
      type: ReservedNameType.USERNAME,
      value: username,
    });

    if (reserved) {
      return {
        available: false,
        error: "RESERVED",
      };
    }

    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // Use Clerk's API to check username availability
    // Search for users with the exact username (case-insensitive handled by Clerk)
    const users = await clerk.users.getUserList({
      username: [username.toLowerCase()],
    });

    // If no users found with this username, it's available
    if (users.data.length === 0) {
      return { available: true };
    }

    // If we should exclude the current user, check if the found user is the current user
    if (excludeCurrentUser) {
      const { userId: currentUserId } = await auth();
      
      // If the only user with this username is the current user, it's available (they're keeping their own username)
      const isOwnUsername = users.data.length === 1 && users.data[0].id === currentUserId;
      
      return {
        available: isOwnUsername,
      };
    }

    return {
      available: false,
    };
  } catch (error) {
    console.error("Failed to check username availability:", error);
    return {
      available: false,
      error: "Failed to check username availability",
    };
  }
}

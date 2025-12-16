"use server";

import { createClerkClient } from "@clerk/backend";
import type { UsernameAvailabilityResult } from "@/types/onboarding";

/**
 * Check username availability using Clerk API
 * Clerk is the source of truth for usernames
 */
export async function checkUsernameAvailability(
  username: string
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

    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // Use Clerk's API to check username availability
    // Search for users with the exact username (case-insensitive handled by Clerk)
    const users = await clerk.users.getUserList({
      username: [username.toLowerCase()],
    });

    return {
      available: users.data.length === 0,
    };
  } catch (error) {
    console.error("Failed to check username availability:", error);
    return {
      available: false,
      error: "Failed to check username availability",
    };
  }
}

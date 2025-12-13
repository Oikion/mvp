"use server";

import { prismadb } from "@/lib/prisma";
import type { UsernameAvailabilityResult } from "@/types/onboarding";

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
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return {
        available: false,
        error: "Username can only contain letters, numbers, and underscores",
      };
    }

    // Check if username exists (case-insensitive)
    const existingUser = await prismadb.users.findFirst({
      where: {
        username: {
          equals: username,
          mode: "insensitive",
        },
      },
    });

    return {
      available: !existingUser,
    };
  } catch {
    return {
      available: false,
      error: "Failed to check username availability",
    };
  }
}


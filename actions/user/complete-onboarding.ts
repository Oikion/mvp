"use server";

import { getCurrentUser } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type {
  SupportedLanguage,
  OnboardingNotificationSettings,
  OnboardingCompletionResult,
  OnboardingPrivacyPreferences,
} from "@/types/onboarding";

export interface CompleteOnboardingParams {
  username: string;
  name: string;
  language: SupportedLanguage;
  notificationSettings?: OnboardingNotificationSettings;
  privacyPreferences?: OnboardingPrivacyPreferences;
}

export interface ValidateOnboardingParams {
  username: string;
  name: string;
  language: SupportedLanguage;
}

/**
 * Validates onboarding data WITHOUT saving to database.
 * Call this BEFORE creating organization to fail fast.
 */
export async function validateOnboardingData(
  params: ValidateOnboardingParams
): Promise<OnboardingCompletionResult> {
  try {
    const user = await getCurrentUser();

    // Validate username
    if (!params.username || params.username.trim().length < 2) {
      return {
        success: false,
        error: "Username must be at least 2 characters",
      };
    }

    if (params.username.length > 50) {
      return {
        success: false,
        error: "Username must be at most 50 characters",
      };
    }

    // Validate format
    if (!/^[a-zA-Z0-9_]+$/.test(params.username)) {
      return {
        success: false,
        error: "Username can only contain letters, numbers, and underscores",
      };
    }

    // Check if username is already taken by another user
    const existingUser = await prismadb.users.findFirst({
      where: {
        username: {
          equals: params.username,
          mode: "insensitive",
        },
        id: {
          not: user.id,
        },
      },
    });

    if (existingUser) {
      return {
        success: false,
        error: "Username is already taken",
      };
    }

    // Validate name
    if (!params.name || params.name.trim().length < 2) {
      return {
        success: false,
        error: "Name must be at least 2 characters",
      };
    }

    if (params.name.length > 100) {
      return {
        success: false,
        error: "Name must be at most 100 characters",
      };
    }

    // Validate language
    const validLanguages = ["en", "el", "cz", "de", "uk"];
    if (!validLanguages.includes(params.language)) {
      return {
        success: false,
        error: "Invalid language selection",
      };
    }

    // All validations passed
    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to validate onboarding data";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function completeOnboarding(
  params: CompleteOnboardingParams
): Promise<OnboardingCompletionResult> {
  try {
    const user = await getCurrentUser();

    // Validate username
    if (!params.username || params.username.trim().length < 2) {
      return {
        success: false,
        error: "Username must be at least 2 characters",
      };
    }

    if (params.username.length > 50) {
      return {
        success: false,
        error: "Username must be at most 50 characters",
      };
    }

    // Validate format
    if (!/^[a-zA-Z0-9_]+$/.test(params.username)) {
      return {
        success: false,
        error: "Username can only contain letters, numbers, and underscores",
      };
    }

    // Check if username is already taken by another user
    const existingUser = await prismadb.users.findFirst({
      where: {
        username: {
          equals: params.username,
          mode: "insensitive",
        },
        id: {
          not: user.id,
        },
      },
    });

    if (existingUser) {
      return {
        success: false,
        error: "Username is already taken",
      };
    }

    // Validate name
    if (!params.name || params.name.trim().length < 2) {
      return {
        success: false,
        error: "Name must be at least 2 characters",
      };
    }

    if (params.name.length > 100) {
      return {
        success: false,
        error: "Name must be at most 100 characters",
      };
    }

    // Validate language
    const validLanguages = ["en", "el", "cz", "de", "uk"];
    if (!validLanguages.includes(params.language)) {
      return {
        success: false,
        error: "Invalid language selection",
      };
    }

    // Update user with privacy preferences
    await prismadb.users.update({
      where: {
        id: user.id,
      },
      data: {
        username: params.username.trim(),
        name: params.name.trim(),
        userLanguage: params.language,
        onboardingCompleted: true,
        // Privacy preferences
        analyticsConsent: params.privacyPreferences?.analyticsConsent ?? true,
      },
    });

    // Create or update agent profile with visibility setting
    const profileVisibility = params.privacyPreferences?.profileVisibility ?? "PERSONAL";
    await prismadb.agentProfile.upsert({
      where: {
        userId: user.id,
      },
      update: {
        visibility: profileVisibility,
      },
      create: {
        userId: user.id,
        slug: params.username.trim().toLowerCase(),
        visibility: profileVisibility,
      },
    });

    // Create or update notification settings
    const defaultNotificationSettings = {
      socialEmailEnabled: true,
      socialInAppEnabled: true,
      crmEmailEnabled: true,
      crmInAppEnabled: true,
      calendarEmailEnabled: true,
      calendarInAppEnabled: true,
      tasksEmailEnabled: true,
      tasksInAppEnabled: true,
      dealsEmailEnabled: true,
      dealsInAppEnabled: true,
      documentsEmailEnabled: true,
      documentsInAppEnabled: true,
      systemEmailEnabled: true,
      systemInAppEnabled: true,
    };

    const notificationSettings = {
      ...defaultNotificationSettings,
      ...params.notificationSettings,
    };

    await prismadb.userNotificationSettings.upsert({
      where: {
        userId: user.id,
      },
      update: notificationSettings,
      create: {
        userId: user.id,
        ...notificationSettings,
      },
    });

    // Revalidate paths
    revalidatePath("/");
    revalidatePath("/onboard");

    return {
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to complete onboarding";
    return {
      success: false,
      error: errorMessage,
    };
  }
}


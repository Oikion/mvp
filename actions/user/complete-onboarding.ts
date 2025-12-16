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
  // Username - passed for legacy users who need to set it during onboarding
  username?: string;
  firstName: string;
  lastName: string;
  language: SupportedLanguage;
  notificationSettings?: OnboardingNotificationSettings;
  privacyPreferences?: OnboardingPrivacyPreferences;
}

export interface ValidateOnboardingParams {
  username: string;
  firstName: string;
  lastName: string;
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
    // Validate username exists
    if (!params.username || params.username.trim().length < 2) {
      return {
        success: false,
        error: "Username is required and must be at least 2 characters.",
      };
    }

    // Validate firstName
    if (!params.firstName || params.firstName.trim().length < 1) {
      return {
        success: false,
        error: "First name is required",
      };
    }

    if (params.firstName.length > 50) {
      return {
        success: false,
        error: "First name must be at most 50 characters",
      };
    }

    // Validate lastName
    if (!params.lastName || params.lastName.trim().length < 1) {
      return {
        success: false,
        error: "Last name is required",
      };
    }

    if (params.lastName.length > 50) {
      return {
        success: false,
        error: "Last name must be at most 50 characters",
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

    // Determine the username to use
    // If params.username is provided (legacy user setting it during onboarding), use that
    // Otherwise, use the existing user.username from DB
    const finalUsername = params.username?.trim().toLowerCase() || user.username;
    
    // Validate we have a username
    if (!finalUsername || finalUsername.length < 2) {
      return {
        success: false,
        error: "Username is required and must be at least 2 characters.",
      };
    }

    // Validate firstName
    if (!params.firstName || params.firstName.trim().length < 1) {
      return {
        success: false,
        error: "First name is required",
      };
    }

    // Validate lastName
    if (!params.lastName || params.lastName.trim().length < 1) {
      return {
        success: false,
        error: "Last name is required",
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

    // Construct full name from first and last name
    const fullName = `${params.firstName.trim()} ${params.lastName.trim()}`;

    // Update user - include username if it was set during onboarding
    await prismadb.users.update({
      where: {
        id: user.id,
      },
      data: {
        username: finalUsername,
        firstName: params.firstName.trim(),
        lastName: params.lastName.trim(),
        name: fullName,
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
        slug: finalUsername,
      },
      create: {
        userId: user.id,
        slug: finalUsername,
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

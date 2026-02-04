import { NextRequest, NextResponse } from "next/server";
import { completeOnboarding } from "@/actions/user/complete-onboarding";
import type {
  SupportedLanguage,
  OnboardingNotificationSettings,
  OnboardingPrivacyPreferences,
  OnboardingCompletionResult,
} from "@/types/onboarding";

interface CompleteOnboardingRequestBody {
  // Username is no longer passed - it's managed by Clerk
  name: string;
  firstName?: string;
  lastName?: string;
  language: SupportedLanguage;
  notificationSettings?: OnboardingNotificationSettings;
  privacyPreferences?: OnboardingPrivacyPreferences;
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<OnboardingCompletionResult | { error: string }>> {
  try {
    const body = (await req.json()) as CompleteOnboardingRequestBody;

    const { name, firstName, lastName, language, notificationSettings, privacyPreferences } = body;

    // Support both name (legacy) and firstName/lastName
    let resolvedFirstName = firstName;
    let resolvedLastName = lastName;
    
    if (!firstName && !lastName && name) {
      // Split name into firstName and lastName
      const nameParts = name.trim().split(/\s+/);
      resolvedFirstName = nameParts[0] || "";
      resolvedLastName = nameParts.slice(1).join(" ") || "";
    }

    if ((!resolvedFirstName && !resolvedLastName) || !language) {
      return NextResponse.json<{ error: string }>(
        { error: "Name and language are required" },
        { status: 400 }
      );
    }

    const result = await completeOnboarding({
      firstName: resolvedFirstName || "",
      lastName: resolvedLastName || "",
      language,
      notificationSettings,
      privacyPreferences,
    });

    if (!result.success) {
      return NextResponse.json<{ error: string }>(
        { error: result.error || "Failed to complete onboarding" },
        { status: 400 }
      );
    }

    return NextResponse.json<OnboardingCompletionResult>({ success: true });
  } catch {
    return NextResponse.json<{ error: string }>(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}

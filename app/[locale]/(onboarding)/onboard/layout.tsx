// app/[locale]/(onboarding)/onboard/layout.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getCurrentUserSafe, getCurrentUser } from "@/lib/get-current-user";
import { syncClerkUser } from "@/lib/clerk-sync";
import { getOnboardingStatus } from "@/types/onboarding";

export default async function OnboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { userId, orgId } = await auth();
  const { locale } = await params;

  if (!userId) {
    return redirect(`/${locale}/sign-in`);
  }

  // Get or sync user from database
  let user = await getCurrentUserSafe();
  
  if (!user) {
    try {
      await syncClerkUser(userId);
      user = await getCurrentUser();
    } catch {
      return redirect(`/${locale}/sign-in`);
    }
  }
  
  if (!user || !user.clerkUserId) {
    return redirect(`/${locale}/sign-in`);
  }

  if (user.userStatus === "INACTIVE") {
    return redirect(`/${locale}/inactive`);
  }

  // If user has completed onboarding AND has an organization, redirect to dashboard
  // Both conditions must be true to prevent redirect loop when org isn't set yet
  const onboardingCompleted = getOnboardingStatus(user);
  if (onboardingCompleted && orgId) {
    return redirect(`/${locale}`);
  }

  // Render onboarding content
  return <>{children}</>;
}


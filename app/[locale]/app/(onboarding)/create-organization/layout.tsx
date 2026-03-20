// app/[locale]/(routes)/create-organization/layout.tsx
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getCurrentUserSafe, getCurrentUser } from "@/lib/get-current-user"
import { syncClerkUser } from "@/lib/clerk-sync"
import { getOnboardingStatus } from "@/types/onboarding"

export default async function CreateOrganizationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { userId, orgId } = await auth();

  if (!userId) {
    const { locale } = await params;
    return redirect(`/${locale}/app/sign-in`);
  }

  const { locale } = await params;

  // If user already has an organization, redirect to main app
  if (orgId) {
    return redirect(`/${locale}/app`);
  }

  // Get or sync user from database
  let user = await getCurrentUserSafe();
  
  if (!user) {
    try {
      await syncClerkUser(userId);
      user = await getCurrentUser();
    } catch (error) {
      console.error("Error syncing user:", error);
      return redirect(`/${locale}/app/sign-in`);
    }
  }

  if (user?.userStatus === "INACTIVE") {
    return redirect(`/${locale}/app/inactive`);
  }

  // If user hasn't completed onboarding, redirect to onboarding flow
  // This ensures users go through the full onboarding experience
  const onboardingCompleted = getOnboardingStatus(user);
  if (!onboardingCompleted) {
    return redirect(`/${locale}/app/onboard`);
  }

  // Render without sidebar - simple layout for organization creation
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}


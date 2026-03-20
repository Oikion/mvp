// app/[locale]/app/(onboarding)/create-organization/layout.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getCurrentUserSafe, getCurrentUser } from "@/lib/get-current-user";
import { syncClerkUser } from "@/lib/clerk-sync";
import { getOnboardingStatus } from "@/types/onboarding";

export default async function CreateOrganizationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { userId } = await auth();
  const { locale } = await params;

  if (!userId) {
    return redirect(`/${locale}/app/sign-in`);
  }

  // Get or sync user from database
  let user = await getCurrentUserSafe();

  if (!user) {
    try {
      await syncClerkUser(userId);
      user = await getCurrentUser();
    } catch {
      return redirect(`/${locale}/app/sign-in`);
    }
  }

  if (!user || !user.clerkUserId) {
    return redirect(`/${locale}/app/sign-in`);
  }

  if (user.userStatus === "INACTIVE") {
    return redirect(`/${locale}/app/inactive`);
  }

  // Check if onboarding is completed
  const onboardingCompleted = getOnboardingStatus(user);
  if (!onboardingCompleted) {
    return redirect(`/${locale}/app/onboard`);
  }

  // Render create organization content
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}

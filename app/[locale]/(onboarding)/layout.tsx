// app/[locale]/(onboarding)/layout.tsx
// Simple layout for onboarding pages - no sidebar, no onboarding checks
// This layout is separate from (routes) to prevent infinite redirect loops

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function OnboardingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    const { locale } = await params;
    return redirect(`/${locale}/sign-in`);
  }

  // Simple layout - just render children
  // The onboard page handles its own logic
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}

// app/[locale]/(routes)/layout.tsx
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { AppSidebar } from "./components/AppSidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { DynamicBreadcrumb } from "./components/DynamicBreadcrumb"
import getAllCommits from "@/actions/github/get-repo-commits"
import { getModules } from "@/actions/get-modules"
import { getDictionary } from "@/dictionaries"
import Footer from "./components/Footer"
import { getCurrentUserSafe, getCurrentUser } from "@/lib/get-current-user"
import { syncClerkUser } from "@/lib/clerk-sync"
import { FloatingQuickAddButtons } from "@/components/FloatingQuickAddButtons"
import { GlobalSearch } from "@/components/GlobalSearch"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { getOnboardingStatus } from "@/types/onboarding"
import { isPlatformAdmin } from "@/lib/platform-admin"

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { userId, orgId } = await auth();

  if (!userId) {
    const { locale } = await params;
    return redirect(`/${locale}/sign-in`);
  }

  const { locale } = await params;
  
  // IMPORTANT: Skip onboarding check for onboard route to prevent infinite redirect loop
  // The onboard route has its own layout that handles onboarding logic
  // We check this by seeing if children is the onboard page (it will have its own layout wrapper)

  // Get or sync user from database
  let user = await getCurrentUserSafe();
  
  if (!user) {
    // Sync user if not found in database
    try {
      await syncClerkUser(userId);
      user = await getCurrentUser();
    } catch (error: any) {
      // If Clerk user doesn't exist, sign out and redirect to sign-in
      // This handles cases where Clerk user was deleted but session still exists
      const errorMessage = error?.message || "";
      const errorCode = error?.code || "";
      const errorStatus = error?.status;
      
      // Check various ways the error might indicate user not found
      if (
        errorMessage.includes("Clerk user not found") ||
        errorMessage.includes("not found") ||
        errorCode === "not_found" ||
        errorStatus === 404 ||
        error?.errors?.[0]?.code === "not_found"
      ) {
        const { locale } = await params;
        // Redirect to sign-in - this will clear the session
        return redirect(`/${locale}/sign-in`);
      }
      
      // Log other errors for debugging
      console.error("Error syncing user:", error);
      
      // For other errors, also redirect to sign-in to be safe
      const { locale } = await params;
      return redirect(`/${locale}/sign-in`);
    }
  }
  
  // Additional safety check: if user was found but has no clerkUserId, 
  // it might have been deleted, redirect to sign-in
  if (user && !user.clerkUserId) {
    const { locale } = await params;
    return redirect(`/${locale}/sign-in`);
  }

  // PENDING status check removed - users are automatically active
  // if (user?.userStatus === "PENDING") {
  //   return redirect(`/${locale}/pending`);
  // }

  if (user?.userStatus === "INACTIVE") {
    return redirect(`/${locale}/inactive`);
  }

  // Check if user has completed onboarding - redirect if not
  const onboardingCompleted = getOnboardingStatus(user);
  
  // Only redirect to onboarding if:
  // 1. Onboarding is NOT completed, OR
  // 2. No organization exists AND onboarding is not completed
  // 
  // If onboarding IS completed but orgId is missing, DON'T redirect back to onboard
  // This prevents infinite loops when Clerk session hasn't updated with new orgId yet
  if (!onboardingCompleted && !orgId) {
    return redirect(`/${locale}/onboard`);
  }
  
  // If user hasn't completed onboarding but somehow has an org, send to onboarding
  if (!onboardingCompleted) {
    return redirect(`/${locale}/onboard`);
  }

  // At this point: onboardingCompleted = true
  // If orgId is missing, we wait for Clerk session to update (don't redirect to avoid loop)
  // The page may show incomplete data briefly, but this is better than an infinite loop

  const build = await getAllCommits();
  const modules = await getModules();
  const dict = await getDictionary(locale);
  
  // Check if user is a platform admin (for sidebar nav)
  const userIsPlatformAdmin = await isPlatformAdmin();

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <SidebarProvider defaultOpen={true}>
        <AppSidebar 
          modules={modules} 
          dict={dict} 
          build={build}
          user={{
            name: user.name as string,
            email: user.email as string,
            avatar: user.avatar as string,
          }}
          isPlatformAdmin={userIsPlatformAdmin}
        />
        <SidebarInset className="flex flex-col h-screen overflow-hidden bg-surface-2">
        <header className="flex h-16 shrink-0 items-center gap-2 justify-between">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <DynamicBreadcrumb />
          </div>
          <div className="flex items-center gap-2 px-4">
            <NotificationBell />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-hidden min-h-0">
          {children}
        </div>
        <Footer />
        <FloatingQuickAddButtons />
        <GlobalSearch />
      </SidebarInset>
    </SidebarProvider>
    </div>
  );
}
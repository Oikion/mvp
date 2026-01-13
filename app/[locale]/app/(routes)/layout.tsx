// app/[locale]/(routes)/layout.tsx
import { redirect } from "next/navigation"
import { AppSidebar } from "./components/AppSidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { DynamicBreadcrumb } from "./components/DynamicBreadcrumb"
import Footer from "./components/Footer"
import { syncClerkUser } from "@/lib/clerk-sync"
import { FloatingQuickAddButtons } from "@/components/FloatingQuickAddButtons"
import { GlobalSearch } from "@/components/GlobalSearch"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { getOnboardingStatus } from "@/types/onboarding"
import { AppProviders } from "@/components/providers/AppProviders"
// Use cached versions for request deduplication (performance optimization)
import {
  getAuth,
  getCachedUserSafe,
  getCachedUser,
  getCachedModules,
  getCachedDictionary,
  getCachedIsPlatformAdmin,
} from "@/lib/cached"
import { getUserPermissionContext } from "@/lib/permissions/service"

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { userId, orgId } = await getAuth();
  const { locale } = await params;
  
  // #region agent log - server side logging
  const fs = await import('fs');
  const logPath = '/Users/stapo/Desktop/Oikion/MVP/.cursor/debug.log';
  const logData = JSON.stringify({location:'routes/layout.tsx:entry',message:'AppLayout loaded',data:{userId:userId||null,orgId:orgId||null,locale},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'}) + '\n';
  try { fs.appendFileSync(logPath, logData); } catch {}
  // #endregion

  if (!userId) {
    return redirect(`/${locale}/app/sign-in`);
  }
  
  // IMPORTANT: Skip onboarding check for onboard route to prevent infinite redirect loop
  // The onboard route has its own layout that handles onboarding logic
  // We check this by seeing if children is the onboard page (it will have its own layout wrapper)

  // Get or sync user from database (using cached version for request deduplication)
  let user = await getCachedUserSafe();
  
  if (!user) {
    // Sync user if not found in database
    try {
      await syncClerkUser(userId);
      user = await getCachedUser();
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
        return redirect(`/${locale}/app/sign-in`);
      }
      
      // Log other errors for debugging
      console.error("Error syncing user:", error);
      
      // For other errors, also redirect to sign-in to be safe
      const { locale } = await params;
      return redirect(`/${locale}/app/sign-in`);
    }
  }
  
  // Additional safety check: if user was found but has no clerkUserId, 
  // it might have been deleted, redirect to sign-in
  if (user && !user.clerkUserId) {
    const { locale } = await params;
    return redirect(`/${locale}/app/sign-in`);
  }

  // PENDING status check removed - users are automatically active
  // if (user?.userStatus === "PENDING") {
  //   return redirect(`/${locale}/pending`);
  // }

  if (user?.userStatus === "INACTIVE") {
    return redirect(`/${locale}/app/inactive`);
  }

  // Check if user has a username (required for app access)
  // Legacy users or users created before "Require username" was enabled in Clerk
  // must set a username during onboarding
  if (!user?.username) {
    // #region agent log
    const logNoUsername = JSON.stringify({location:'routes/layout.tsx:noUsername',message:'Redirecting to onboard - no username',data:{userId,hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'}) + '\n';
    try { fs.appendFileSync(logPath, logNoUsername); } catch {}
    // #endregion
    return redirect(`/${locale}/app/onboard`);
  }

  // Check if user has completed onboarding - redirect if not
  const onboardingCompleted = getOnboardingStatus(user);
  
  // #region agent log
  const logOnboardingStatus = JSON.stringify({location:'routes/layout.tsx:onboardingCheck',message:'Checking onboarding status',data:{onboardingCompleted,hasOrgId:!!orgId,username:user.username},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'}) + '\n';
  try { fs.appendFileSync(logPath, logOnboardingStatus); } catch {}
  // #endregion
  
  // Only redirect to onboarding if:
  // 1. Onboarding is NOT completed, OR
  // 2. No organization exists AND onboarding is not completed
  // 
  // If onboarding IS completed but orgId is missing, DON'T redirect back to onboard
  // This prevents infinite loops when Clerk session hasn't updated with new orgId yet
  if (!onboardingCompleted && !orgId) {
    // #region agent log
    const logRedirectNoOrg = JSON.stringify({location:'routes/layout.tsx:redirectNoOrg',message:'Redirecting to onboard - no org and not completed',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'}) + '\n';
    try { fs.appendFileSync(logPath, logRedirectNoOrg); } catch {}
    // #endregion
    return redirect(`/${locale}/app/onboard`);
  }
  
  // If user hasn't completed onboarding but somehow has an org, send to onboarding
  if (!onboardingCompleted) {
    // #region agent log
    const logRedirectNotCompleted = JSON.stringify({location:'routes/layout.tsx:redirectNotCompleted',message:'Redirecting to onboard - not completed',data:{hasOrgId:!!orgId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'}) + '\n';
    try { fs.appendFileSync(logPath, logRedirectNotCompleted); } catch {}
    // #endregion
    return redirect(`/${locale}/app/onboard`);
  }

  // At this point: onboardingCompleted = true
  // If orgId is missing, we wait for Clerk session to update (don't redirect to avoid loop)
  // The page may show incomplete data briefly, but this is better than an infinite loop
  
  // Migration: Ensure user has a personal workspace (for existing users)
  // This runs silently in the background and doesn't block rendering
  if (onboardingCompleted && userId) {
    try {
      const { ensurePersonalWorkspace } = await import("@/actions/organization/ensure-personal-workspace");
      await ensurePersonalWorkspace();
      // Don't await or block - this is a background migration
    } catch (error) {
      // Silently fail - migration will retry on next page load
      console.error("Failed to ensure personal workspace:", error);
    }
  }
  
  // #region agent log
  const logProceed = JSON.stringify({location:'routes/layout.tsx:proceed',message:'User passed all checks, proceeding to render dashboard',data:{onboardingCompleted,hasOrgId:!!orgId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'}) + '\n';
  try { fs.appendFileSync(logPath, logProceed); } catch {}
  // #endregion

  // Use cached versions for request deduplication
  // These may be called again in child pages, but will return cached results
  const modules = await getCachedModules();
  const dict = await getCachedDictionary(locale);
  
  // Check if user is a platform admin (for sidebar nav)
  const userIsPlatformAdmin = await getCachedIsPlatformAdmin();
  
  // Get user's permission context for module access filtering
  const permissionContext = await getUserPermissionContext();

  // Check if user has a referral code (is an approved referrer)
  const { prismadb } = await import("@/lib/prisma");
  const referralCode = await prismadb.referralCode.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  return (
    <AppProviders>
      <div className="flex h-screen w-full overflow-hidden">
        <SidebarProvider defaultOpen={true}>
          <AppSidebar 
            modules={modules} 
            dict={dict} 
            user={{
              name: user.name as string,
              email: user.email as string,
              avatar: user.avatar as string,
            }}
            isPlatformAdmin={userIsPlatformAdmin}
            referralBoxDismissed={user.referralBoxDismissed ?? false}
            hasReferralCode={!!referralCode}
            referralApplicationStatus={user.referralApplicationStatus as "PENDING" | "APPROVED" | "DENIED" | null}
            accessibleModules={permissionContext?.moduleAccess}
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
    </AppProviders>
  );
}
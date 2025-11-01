// app/[locale]/(routes)/organization/layout.tsx
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getCurrentUserSafe, getCurrentUser } from "@/lib/get-current-user"
import { syncClerkUser } from "@/lib/clerk-sync"

export default async function OrganizationLayout({
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

  // Require organization for organization profile page
  if (!orgId) {
    return redirect(`/${locale}/create-organization`);
  }

  // Get or sync user from database
  let user = await getCurrentUserSafe();
  
  if (!user) {
    try {
      await syncClerkUser(userId);
      user = await getCurrentUser();
    } catch (error) {
      console.error("Error syncing user:", error);
      return redirect(`/${locale}/sign-in`);
    }
  }

  if (user?.userStatus === "PENDING") {
    return redirect(`/${locale}/pending`);
  }

  if (user?.userStatus === "INACTIVE") {
    return redirect(`/${locale}/inactive`);
  }

  // Render without sidebar - simple layout for organization profile
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}


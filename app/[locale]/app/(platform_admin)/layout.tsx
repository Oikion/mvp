// app/[locale]/(platform-admin)/layout.tsx
// Layout for platform admin pages
// Primary protection is in middleware (middleware.ts)
// This layout provides the sidebar shell for all platform admin pages

import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getPlatformAdminUser } from "@/lib/platform-admin";
import { PlatformAdminSidebar } from "./platform-admin/components/PlatformAdminSidebar";
import { logAdminAccess } from "@/actions/platform-admin/log-admin-access";

export default async function PlatformAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { userId } = await auth();
  const { locale } = await params;

  // Basic authentication check (middleware handles admin verification)
  if (!userId) {
    return redirect(`/${locale}/app/sign-in`);
  }

  // Get admin user info for sidebar
  const adminUserRaw = await getPlatformAdminUser();

  // Map to PlatformAdminSidebar expected format
  const adminUser = adminUserRaw
    ? {
        id: adminUserRaw.id,
        clerkUserId: adminUserRaw.clerkId,
        email: adminUserRaw.email,
        firstName: adminUserRaw.firstName,
        lastName: adminUserRaw.lastName,
        avatar: adminUserRaw.imageUrl,
      }
    : null;

  // Get messages for client components
  const messages = await getMessages();

  // Log admin access (session-based - once per 30 minutes)
  if (adminUserRaw) {
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || undefined;
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ipAddress = forwardedFor?.split(",")[0].trim() || realIp || undefined;

    // Fire and forget - don't block rendering
    logAdminAccess({
      adminUserId: adminUserRaw.id,
      adminEmail: adminUserRaw.email,
      adminName: adminUserRaw.firstName && adminUserRaw.lastName
        ? `${adminUserRaw.firstName} ${adminUserRaw.lastName}`
        : adminUserRaw.firstName || adminUserRaw.lastName || null,
      ipAddress,
      userAgent,
    }).catch((error) => {
      console.error("[ADMIN_ACCESS_LOG_ERROR]", error);
    });
  }

  return (
    <NextIntlClientProvider messages={messages}>
      <SidebarProvider>
        <PlatformAdminSidebar adminUser={adminUser} locale={locale} />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex-1" />
          </header>
          <main className="flex-1">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </NextIntlClientProvider>
  );
}

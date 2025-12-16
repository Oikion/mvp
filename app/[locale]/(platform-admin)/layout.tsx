// app/[locale]/(platform-admin)/layout.tsx
// Layout for platform admin pages
// Primary protection is in middleware (proxy.ts)
// This layout provides the basic shell for all platform admin pages

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

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
    return redirect(`/${locale}/sign-in`);
  }

  // Get messages for client components (like PlatformAdminHeader)
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </NextIntlClientProvider>
  );
}



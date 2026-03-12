// Minimal layout for consent-required page — no sidebar, no user sync.
// Prevents redirect to sign-in when the (routes) layout fails to sync user.

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function ConsentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    const { locale } = await params;
    return redirect(`/${locale}/app/sign-in`);
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}

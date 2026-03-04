// app/[locale]/app/(routes)/network/layout.tsx
// Hard gate: redirects to dashboard if the org does not have "network" feature enabled.
import { redirect } from "next/navigation";
import { canAccessModule } from "@/lib/permissions/service";

export default async function NetworkLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const hasAccess = await canAccessModule("network");
  if (!hasAccess) {
    redirect(`/${locale}/app/dashboard`);
  }

  return <>{children}</>;
}

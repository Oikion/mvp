import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prismadb } from "@/lib/prisma";
import Container from "@/app/[locale]/app/(routes)/components/ui/Container";
import { GoogleCalendarCard } from "./components/GoogleCalendarCard";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ connected?: string; error?: string }>;
};

export default async function IntegrationsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { connected, error } = await searchParams;

  const { userId, orgId: organizationId } = await auth();
  if (!userId || !organizationId) redirect(`/${locale}/app/sign-in`);

  // Look up the internal Users record to find any Google connection
  const user = await prismadb.users.findFirst({
    where: { clerkUserId: userId },
    select: {
      id: true,
      GoogleCalendarConnection: {
        select: {
          googleEmail: true,
          status: true,
          lastSyncedAt: true,
        },
      },
    },
  });

  const googleConn = user?.GoogleCalendarConnection ?? null;

  return (
    <Container
      title="Integrations"
      description="Connect external services to your Oikion account"
    >
      {connected === "google" && (
        <div className="mb-4 rounded-md border border-emerald-500/40 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          Google Calendar connected successfully.
        </div>
      )}
      {error === "google_auth_failed" && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Google Calendar connection failed. Please try again.
        </div>
      )}

      <div className="space-y-4">
        <GoogleCalendarCard
          connected={!!googleConn}
          googleEmail={googleConn?.googleEmail}
          status={googleConn?.status ?? undefined}
          lastSyncedAt={googleConn?.lastSyncedAt?.toISOString() ?? null}
        />
      </div>
    </Container>
  );
}

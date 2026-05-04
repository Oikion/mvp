import { auth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";
import { getTranslations } from "next-intl/server";
import { Building2 } from "lucide-react";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { orgId } = await auth();

  let isPersonalWorkspace = false;

  if (orgId) {
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY ?? "",
    });
    const organization = await clerk.organizations.getOrganization({
      organizationId: orgId,
    });
    const metadata = organization?.publicMetadata as Record<string, unknown> | undefined;
    isPersonalWorkspace = (metadata?.type as string) === "personal";
  }

  if (!isPersonalWorkspace) {
    return <>{children}</>;
  }

  const t = await getTranslations("workspace");

  return (
    <div className="relative">
      {/* Blurred content behind the overlay */}
      <div className="pointer-events-none select-none blur-sm opacity-40" aria-hidden="true">
        {children}
      </div>

      {/* Overlay message */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="max-w-md w-full mx-4 rounded-xl border border-border bg-background/95 backdrop-blur-sm shadow-lg p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-muted p-3">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">{t("settingsNotAvailable")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("settingsNotAvailableDescription")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

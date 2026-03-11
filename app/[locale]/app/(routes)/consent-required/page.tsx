import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prismadb } from "@/lib/prisma";
import { getOriginalConsentMode } from "@/lib/data-ownership";
import { ConsentRequiredClient } from "./ConsentRequiredClient";

export default async function ConsentRequiredPage() {
  const { orgId, userId } = await auth();

  if (!orgId || !userId) {
    redirect("/sign-in");
  }

  const settings = await prismadb.organizationSettings.findUnique({
    where: { organizationId: orgId },
    select: {
      dataOwnershipMode: true,
      policyVersion: true,
      dataOwnershipSetAt: true,
    },
  });

  // No policy or already consented → redirect to app
  if (!settings?.dataOwnershipSetAt) {
    redirect("/app");
  }

  const consent = await prismadb.orgMemberConsent.findUnique({
    where: {
      organizationId_userId_policyVersion: {
        organizationId: orgId,
        userId,
        policyVersion: settings.policyVersion,
      },
    },
  });

  if (consent) {
    redirect("/app");
  }

  // Get original consent mode for "leave instead" consequence text
  const originalMode = await getOriginalConsentMode(orgId, userId);

  // Get org name for display
  const orgSettings = await prismadb.organizationSettings.findUnique({
    where: { organizationId: orgId },
    select: { organizationId: true },
  });

  return (
    <ConsentRequiredClient
      mode={settings.dataOwnershipMode}
      orgName={orgId}
      originalMode={originalMode}
    />
  );
}

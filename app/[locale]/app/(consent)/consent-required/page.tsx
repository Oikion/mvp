import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { prismadb } from "@/lib/prisma";
import { getOriginalConsentMode } from "@/lib/data-ownership";
import { ConsentRequiredClient } from "./ConsentRequiredClient";

export default async function ConsentRequiredPage() {
  const { orgId, userId } = await auth();
  const locale = await getLocale();

  if (!orgId || !userId) {
    redirect(`/${locale}/app/sign-in`);
  }

  const settings = await prismadb.organizationSettings.findUnique({
    where: { organizationId: orgId },
    select: {
      dataOwnershipMode: true,
      policyVersion: true,
      dataOwnershipSetAt: true,
    },
  });

  // No policy set → consent not required; route through bypass to set cookie
  if (!settings?.dataOwnershipSetAt) {
    redirect("/api/consent-bypass?v=0");
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
    // Consent exists → route through bypass to set cookie so middleware stops redirecting
    redirect(`/api/consent-bypass?v=${settings.policyVersion}`);
  }

  // Get original consent mode for "leave instead" consequence text
  const originalMode = await getOriginalConsentMode(orgId, userId);

  // Fetch human-readable org name
  let orgName = orgId;
  try {
    const clerk = await clerkClient();
    const org = await clerk.organizations.getOrganization({ organizationId: orgId });
    orgName = org.name;
  } catch {
    // Fall back to orgId
  }

  return (
    <ConsentRequiredClient
      mode={settings.dataOwnershipMode}
      orgName={orgName}
      originalMode={originalMode}
      policyVersion={settings.policyVersion}
    />
  );
}

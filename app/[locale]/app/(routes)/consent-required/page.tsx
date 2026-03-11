import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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

  // No policy set → set cookie and redirect to app (consent not required)
  if (!settings?.dataOwnershipSetAt) {
    const cookieStore = await cookies();
    cookieStore.set("consent_v", "0", { maxAge: 86400, path: "/" });
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
    // Consent exists → set cookie and redirect back
    const cookieStore = await cookies();
    cookieStore.set("consent_v", String(settings.policyVersion), {
      maxAge: 86400,
      path: "/",
    });
    redirect("/app");
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

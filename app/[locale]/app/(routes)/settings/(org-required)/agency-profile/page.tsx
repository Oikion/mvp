import { auth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getAgencyProfile } from "@/actions/organization/agency-profile";
import { getDictionary } from "@/dictionaries";
import Container from "../../../components/ui/Container";
import { AgencyWorkspaceOnlyMessage } from "./components/AgencyWorkspaceOnlyMessage";
import { AgencyProfileClient } from "./components/AgencyProfileClient";

export default async function AgencyProfileSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/app");
  }

  const clerk = createClerkClient({
        secretKey: process.env.CLERK_SECRET_KEY ?? '',
  });
  const organization = await clerk.organizations.getOrganization({
    organizationId: orgId,
  });
  const metadata = organization?.publicMetadata as Record<string, unknown> | undefined;
  const orgType = metadata?.type as string | undefined;
  const isAgencyWorkspace = orgType === "agency";

  if (!isAgencyWorkspace) {
    const tProfile = await getTranslations("profile");
    const t = (k: string) => tProfile(`agencyProfile.${k}` as Parameters<typeof tProfile>[0]);
    return (
      <Container
        title={t("title")}
        description={t("description")}
      >
        <AgencyWorkspaceOnlyMessage message={t("agencyOnly")} />
      </Container>
    );
  }

  const [profileResult, dict] = await Promise.all([
    getAgencyProfile(),
    getDictionary(locale),
  ]);

  const profile = profileResult.success && profileResult.data ? profileResult.data : null;

  const tProfile2 = await getTranslations("profile");
  const t = (k: string) => tProfile2(`agencyProfile.${k}` as Parameters<typeof tProfile2>[0]);
  return (
    <Container
      title={t("title")}
      description={t("description")}
    >
      <AgencyProfileClient
        profile={profile}
        clerkOrgName={organization.name}
        clerkOrgSlug={organization.slug ?? ""}
        dict={dict as unknown as Parameters<typeof AgencyProfileClient>[0]["dict"]}
        locale={locale}
      />
    </Container>
  );
}

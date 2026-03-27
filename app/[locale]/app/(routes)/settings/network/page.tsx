import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import Container from "../../components/ui/Container";
import { getNetworkSettings, getNetworkPartners } from "@/actions/network/manage-network-settings";
import { NetworkSettingsClient } from "./components/NetworkSettingsClient";

export default async function NetworkSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { orgId } = await auth();

  if (!orgId) redirect("/app");

  const [settings, partners, t] = await Promise.all([
    getNetworkSettings(),
    getNetworkPartners(),
    getTranslations("networkSettings"),
  ]);

  return (
    <Container title={t("pageTitle")} description={t("pageDescription")}>
      <NetworkSettingsClient
        initialSettings={settings}
        initialPartners={partners}
        locale={locale}
      />
    </Container>
  );
}

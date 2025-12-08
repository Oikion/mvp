import React, { Suspense } from "react";
import Container from "../../components/ui/Container";
import SuspenseLoading from "@/components/loadings/suspense";
import { getProperties } from "@/actions/mls/get-properties";
import { getSharedProperties } from "@/actions/mls/get-shared-properties";
import PropertiesPageView from "../components/PropertiesPageView";
import { getDictionary } from "@/dictionaries";

// Disable caching to ensure fresh shared data
export const dynamic = "force-dynamic";

export default async function PropertiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [agencyProperties, sharedProperties, dict] = await Promise.all([
    getProperties(),
    getSharedProperties(),
    getDictionary(locale),
  ]);
  return (
    <Container title={dict.navigation.ModuleMenu.mls.title} description={dict.mls.MlsPropertiesPage.description}>
      <Suspense fallback={<SuspenseLoading />}>
        <PropertiesPageView
          agencyProperties={agencyProperties}
          sharedProperties={sharedProperties}
        />
      </Suspense>
    </Container>
  );
}



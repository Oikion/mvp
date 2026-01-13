import React, { Suspense } from "react";
import Container from "../../components/ui/Container";
import SuspenseLoading from "@/components/loadings/suspense";
import { getProperties } from "@/actions/mls/get-properties";
import { getSharedProperties } from "@/actions/mls/get-shared-properties";
import PropertiesPageView from "../components/PropertiesPageView";
import { getCachedDictionary } from "@/lib/cached";

// force-dynamic is required because:
// 1. getSharedProperties() fetches real-time data from other organizations
// 2. Property status/availability can change frequently
// 3. Users expect to see current data when managing listings
export const dynamic = "force-dynamic";

export default async function PropertiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [agencyProperties, sharedProperties, dict] = await Promise.all([
    getProperties(),
    getSharedProperties(),
    getCachedDictionary(locale),
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



import React, { Suspense } from "react";
import Container from "../../components/ui/Container";
import SuspenseLoading from "@/components/loadings/suspense";
import { getProperties } from "@/actions/mls/get-properties";
import PropertiesView from "../components/PropertiesView";
import { getDictionary } from "@/dictionaries";

export default async function PropertiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [properties, dict] = await Promise.all([
    getProperties(),
    getDictionary(locale),
  ]);
  return (
    <Container title={dict.ModuleMenu.mls.title} description={dict.MlsPropertiesPage.description}>
      <Suspense fallback={<SuspenseLoading />}> 
        <PropertiesView data={properties} />
      </Suspense>
    </Container>
  );
}



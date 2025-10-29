import React, { Suspense } from "react";
import Container from "../../components/ui/Container";
import SuspenseLoading from "@/components/loadings/suspense";
import { getProperties } from "@/actions/mls/get-properties";
import PropertiesView from "../components/PropertiesView";

export default async function PropertiesPage() {
  const properties = await getProperties();
  return (
    <Container title="Properties" description="Manage MLS properties">
      <Suspense fallback={<SuspenseLoading />}> 
        <PropertiesView data={properties} />
      </Suspense>
    </Container>
  );
}



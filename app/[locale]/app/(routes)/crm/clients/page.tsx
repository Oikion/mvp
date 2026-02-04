import React, { Suspense } from "react";

import ClientsPageView from "../components/ClientsPageView";
import Container from "../../components/ui/Container";
import SuspenseLoading from "@/components/loadings/suspense";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getClients } from "@/actions/crm/get-clients";
import { getSharedClients } from "@/actions/crm/get-shared-clients";
import { getCachedDictionary } from "@/lib/cached";

// force-dynamic is required because:
// 1. getSharedClients() fetches real-time data from other organizations
// 2. Client status and CRM data changes frequently
// 3. Users expect to see current data when managing clients
export const dynamic = "force-dynamic";

const ClientsPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  // Parallelize queries for better performance
  const { locale } = await params;
  const [crmData, agencyClients, sharedClients, dict] = await Promise.all([
    getAllCrmData(),
    getClients(),
    getSharedClients(),
    getCachedDictionary(locale),
  ]);

  return (
    <Container
      title={dict.navigation.ModuleMenu.crm.accounts}
      description={dict.crm.CrmClientsPage.description}
    >
      <Suspense fallback={<SuspenseLoading />}>
        <ClientsPageView
          agencyClients={agencyClients}
          sharedClients={sharedClients}
          crmData={crmData}
        />
      </Suspense>
    </Container>
  );
};

export default ClientsPage;



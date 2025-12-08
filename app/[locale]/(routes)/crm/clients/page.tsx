import React, { Suspense } from "react";

import ClientsPageView from "../components/ClientsPageView";
import Container from "../../components/ui/Container";
import SuspenseLoading from "@/components/loadings/suspense";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getClients } from "@/actions/crm/get-clients";
import { getSharedClients } from "@/actions/crm/get-shared-clients";
import { getDictionary } from "@/dictionaries";

// Disable caching to ensure fresh shared data
export const dynamic = "force-dynamic";

const ClientsPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  // Parallelize queries for better performance
  const { locale } = await params;
  const [crmData, agencyClients, sharedClients, dict] = await Promise.all([
    getAllCrmData(),
    getClients(),
    getSharedClients(),
    getDictionary(locale),
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



import React, { Suspense } from "react";

import ClientsPageView from "./components/ClientsPageView";
import Container from "../components/ui/Container";
import SuspenseLoading from "@/components/loadings/suspense";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getContacts } from "@/actions/crm/get-contacts";
import { getCachedDictionary } from "@/lib/cached";

export const dynamic = "force-dynamic";

const ClientsPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params;
  const [crmData, agencyContacts, dict] = await Promise.all([
    getAllCrmData(),
    getContacts(),
    getCachedDictionary(locale),
  ]);

  return (
    <Container
      title={dict.navigation.ModuleMenu.crm.accounts}
      description={dict.crm.CrmClientsPage.description}
    >
      <Suspense fallback={<SuspenseLoading />}>
        <ClientsPageView
          agencyClients={agencyContacts}
          sharedClients={[]}
          crmData={crmData}
        />
      </Suspense>
    </Container>
  );
};

export default ClientsPage;

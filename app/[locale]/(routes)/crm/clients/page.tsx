import React, { Suspense } from "react";

import AccountsView from "../components/AccountsView";
import Container from "../../components/ui/Container";
import SuspenseLoading from "@/components/loadings/suspense";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getClients } from "@/actions/crm/get-clients";
import { getDictionary } from "@/dictionaries";

const ClientsPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  // Parallelize queries for better performance
  const { locale } = await params;
  const [crmData, clients, dict] = await Promise.all([
    getAllCrmData(),
    getClients(),
    getDictionary(locale),
  ]);

  return (
    <Container
      title={dict.navigation.ModuleMenu.crm.accounts}
      description={dict.crm.CrmClientsPage.description}
    >
      <Suspense fallback={<SuspenseLoading />}>
        <AccountsView crmData={crmData} data={clients} />
      </Suspense>
    </Container>
  );
};

export default ClientsPage;



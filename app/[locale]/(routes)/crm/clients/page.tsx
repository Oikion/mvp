import React, { Suspense } from "react";

import AccountsView from "../components/AccountsView";
import Container from "../../components/ui/Container";
import SuspenseLoading from "@/components/loadings/suspense";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getClients } from "@/actions/crm/get-clients";

const ClientsPage = async () => {
  // Parallelize queries for better performance
  const [crmData, clients] = await Promise.all([
    getAllCrmData(),
    getClients(),
  ]);

  return (
    <Container
      title="Clients"
      description={"Manage your real estate clients"}
    >
      <Suspense fallback={<SuspenseLoading />}>
        <AccountsView crmData={crmData} data={clients} />
      </Suspense>
    </Container>
  );
};

export default ClientsPage;



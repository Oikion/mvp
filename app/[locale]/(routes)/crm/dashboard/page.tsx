import React from "react";
import Container from "../../components/ui/Container";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getClients } from "@/actions/crm/get-clients";

const CrmDashboardPage = async () => {
  const crmData = await getAllCrmData();
  const clients = await getClients();

  return (
    <Container
      title="CRM Dashboard"
      description="In development. After this compoment is finished, there will be a optimistic update of the data."
    >
      <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-md border p-4">
          <div className="text-sm text-muted-foreground">Lead</div>
          <div className="text-2xl font-semibold">
            {clients.filter((c: any) => c.client_status === "LEAD").length}
          </div>
        </div>
        <div className="rounded-md border p-4">
          <div className="text-sm text-muted-foreground">Active</div>
          <div className="text-2xl font-semibold">
            {clients.filter((c: any) => c.client_status === "ACTIVE").length}
          </div>
        </div>
        <div className="rounded-md border p-4">
          <div className="text-sm text-muted-foreground">Converted</div>
          <div className="text-2xl font-semibold">
            {clients.filter((c: any) => c.client_status === "CONVERTED").length}
          </div>
        </div>
        <div className="rounded-md border p-4">
          <div className="text-sm text-muted-foreground">Lost</div>
          <div className="text-2xl font-semibold">
            {clients.filter((c: any) => c.client_status === "LOST").length}
          </div>
        </div>
      </div>

      {/*     <CRMKanbanServer
        salesStages={salesStages}
        opportunities={opportunities}
      /> */}
    </Container>
  );
};

export default CrmDashboardPage;

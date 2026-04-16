import React from "react";

import { getClients } from "@/actions/crm/get-clients";
import { getAllCrmData } from "@/actions/crm/get-crm-data";

import AccountsView from "./AccountsView";

const MainPageView = async () => {
  const crmData = await getAllCrmData();
  const clients = await getClients();
  return <AccountsView crmData={crmData} data={clients} />;
};

export default MainPageView;

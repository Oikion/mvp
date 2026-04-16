import React from "react";

import { getContacts } from "@/actions/crm/get-contacts";
import { getAllCrmData } from "@/actions/crm/get-crm-data";

import AccountsView from "./AccountsView";

const MainPageView = async () => {
  const crmData = await getAllCrmData();
  const contacts = await getContacts();
  return <AccountsView crmData={crmData} data={contacts} />;
};

export default MainPageView;

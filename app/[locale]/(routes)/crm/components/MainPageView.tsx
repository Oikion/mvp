import React from "react";

import { getAccounts } from "@/actions/crm/get-accounts";
import { getContacts } from "@/actions/crm/get-contacts";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
// Sales-specific imports removed in Real Estate CRM

import AccountsView from "./AccountsView";
import ContactsView from "./ContactsView";
// Sales-specific views removed in Real Estate CRM

const MainPageView = async () => {
  const crmData = await getAllCrmData();
  const accounts = await getAccounts();
  const contacts = await getContacts();
  return (
    <>
      <AccountsView crmData={crmData} data={accounts} />
      <ContactsView crmData={crmData} data={contacts} />
    </>
  );
};

export default MainPageView;

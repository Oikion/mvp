"use server";

import { getOrganizationUsers } from "@/actions/organization/get-organization-users";
import { getClients } from "@/actions/crm/get-clients";
import { getContacts } from "@/actions/crm/get-contacts";

export const getAllCrmData = async () => {
  // Parallelize database queries for better performance
  const [users, accounts, contacts] = await Promise.all([
    getOrganizationUsers({
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        userStatus: true,
      },
      onlyActive: true,
    }),
    getClients(),
    getContacts(),
  ]);

  // Legacy keys kept for UI compatibility; to be removed in follow-up refactor
  // Legacy keys — always empty; kept for UI key compatibility until Task 17 cleanup
  const opportunities: never[] = [];
  const leads: never[] = [];
  const contracts: never[] = [];
  const saleTypes: never[] = [];
  const saleStages: never[] = [];
  const campaigns: never[] = [];
  const industries: never[] = [];

  const data = {
    users,
    accounts,
    opportunities,
    leads,
    contacts,
    contracts,
    saleTypes,
    saleStages,
    campaigns,
    industries,
  };

  return data;
};

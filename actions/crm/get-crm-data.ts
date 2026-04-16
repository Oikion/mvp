"use server";

import { getOrganizationUsers } from "@/actions/organization/get-organization-users";
import { getContacts } from "@/actions/crm/get-contacts";

export const getAllCrmData = async () => {
  // Parallelize database queries for better performance
  const [users, contacts] = await Promise.all([
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
    getContacts(),
  ]);

  // Legacy keys — always empty; kept for UI key compatibility
  const accounts: never[] = [];
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

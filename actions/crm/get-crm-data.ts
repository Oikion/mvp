import { getOrganizationUsers } from "@/actions/organization/get-organization-users";
import { getClients } from "@/actions/crm/get-clients";
import { getClientContacts } from "@/actions/crm/get-client-contacts";

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
    getClientContacts(),
  ]);

  // Legacy keys kept for UI compatibility; to be removed in follow-up refactor
  const opportunities: any[] = [];
  const leads: any[] = [];
  const contracts: any[] = [];
  const saleTypes: any[] = [];
  const saleStages: any[] = [];
  const campaigns: any[] = [];
  const industries: any[] = [];

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

import { prismadb } from "@/lib/prisma";

export const getAllCrmData = async () => {
  // Parallelize database queries for better performance
  const [users, accounts, contacts] = await Promise.all([
    prismadb.users.findMany({
    where: {
      userStatus: "ACTIVE",
    },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
      },
    }),
    prismadb.clients.findMany({
      select: {
        id: true,
        client_name: true,
        primary_email: true,
        client_status: true,
      },
    }),
    prismadb.client_Contacts.findMany({
      select: {
        id: true,
        contact_first_name: true,
        contact_last_name: true,
        email: true,
      },
    }),
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

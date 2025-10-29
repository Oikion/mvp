import { prismadb } from "@/lib/prisma";

export const getAllCrmData = async () => {
  const users = await prismadb.users.findMany({
    where: {
      userStatus: "ACTIVE",
    },
  });
  const accounts = await prismadb.clients.findMany({});
  const contacts = await prismadb.client_Contacts.findMany({});

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

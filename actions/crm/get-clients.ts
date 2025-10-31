import { prismadb } from "@/lib/prisma";

export const getClients = async () => {
  const data = await prismadb.clients.findMany({
    select: {
      id: true,
      client_name: true,
      primary_email: true,
      client_status: true,
      createdAt: true,
      assigned_to: true,
      assigned_to_user: {
        select: {
          name: true,
        },
      },
      contacts: {
        select: {
          contact_first_name: true,
          contact_last_name: true,
        },
        take: 10, // Limit contacts per client to reduce data transfer
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 500, // Add reasonable limit to prevent over-fetching
  });
  // Map to legacy fields expected by existing UI until refactor completes
  return data.map((c: any) => ({
    ...c,
    name: c.client_name,
    email: c.primary_email,
    status: c.client_status === "ACTIVE" ? "Active" : "IN_PROGRESS",
    contacts: (c.contacts || []).map((p: any) => ({
      ...p,
      first_name: p.contact_first_name,
      last_name: p.contact_last_name,
    })),
  }));
};



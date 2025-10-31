import { prismadb } from "@/lib/prisma";

export const getClientContacts = async () => {
  const data = await prismadb.client_Contacts.findMany({
    include: {
      assigned_to_user: {
        select: {
          name: true,
        },
      },
      crate_by_user: {
        select: {
          name: true,
        },
      },
      assigned_client: true,
    },
  });
  // Map to legacy fields expected by existing UI until refactor completes
  return data.map((p: any) => ({
    ...p,
    first_name: p.contact_first_name,
    last_name: p.contact_last_name,
    assigned_accounts: p.assigned_client,
  }));
};



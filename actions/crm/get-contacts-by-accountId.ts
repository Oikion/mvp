import { prismadb } from "@/lib/prisma";

export const getContactsByAccountId = async (accountId: string) => {
  const data = await prismadb.client_Contacts.findMany({
    where: {
      clientsIDs: accountId,
    },
    include: {
      Users_Client_Contacts_assigned_toToUsers: {
        select: {
          name: true,
        },
      },
      Users_Client_Contacts_created_byToUsers: {
        select: {
          name: true,
        },
      },
      Clients: true,
    },
  });
  
  // Map to expected field names for backward compatibility
  return data.map((contact) => ({
    ...contact,
    assigned_to_user: contact.Users_Client_Contacts_assigned_toToUsers,
    crate_by_user: contact.Users_Client_Contacts_created_byToUsers,
    assigned_client: contact.Clients,
  }));
};

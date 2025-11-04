import { prismadb } from "@/lib/prisma";

export const getSearch = async (search: string) => {
  //TODO: This action is now offtopic, because it is not used in the frontend.

  //Search in modul CRM (Clients)
  const resultsCrmClients = await prismadb.clients.findMany({
    where: {
      OR: [
        { description: { contains: search, mode: "insensitive" } },
        { client_name: { contains: search, mode: "insensitive" } },
        { primary_email: { contains: search, mode: "insensitive" } },
        // add more fields as needed
      ],
    },
  });

  //Search in modul CRM (Client Contacts)
  const resultsCrmContacts = await prismadb.client_Contacts.findMany({
    where: {
      OR: [
        { contact_last_name: { contains: search, mode: "insensitive" } },
        { contact_first_name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        // add more fields as needed
      ],
    },
  });

  //Search in local user database
  const resultsUser = await prismadb.users.findMany({
    where: {
      OR: [
        { email: { contains: search, mode: "insensitive" } },
        { account_name: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        // add more fields as needed
      ],
    },
  });

  const data = {
    message: "Fulltext search response",
    results: {
      clients: resultsCrmClients,
      contacts: resultsCrmContacts,
      users: resultsUser,
    },
  };

  return data;
};

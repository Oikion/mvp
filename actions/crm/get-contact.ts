import { prismadb } from "@/lib/prisma";

export const getContact = async (contactId: string) => {
  const data = await prismadb.client_Contacts.findFirst({
    where: {
      id: contactId,
    },
    include: {
      Clients: true,
    },
  });
  
  if (!data) return null;
  
  // Map to expected interface shape
  return {
    ...data,
    assigned_client: data.Clients,
  };
};

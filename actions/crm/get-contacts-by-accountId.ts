import { prismadb } from "@/lib/prisma";

export const getContactsByAccountId = async (accountId: string) => {
  // In v2.0, contacts are the primary entity. This function returns
  // the contact matching accountId for backward compatibility.
  const data = await prismadb.contact.findMany({
    where: {
      id: accountId,
    },
    include: {
      assignedAgent: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Map to expected field names for backward compatibility
  return data.map((contact) => ({
    ...contact,
    assigned_to_user: contact.assignedAgent,
    crate_by_user: null,
    assigned_client: null,
  }));
};

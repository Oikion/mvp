import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

export const getAccountsByContactId = async (contactId: string) => {
  const organizationId = await getCurrentOrgIdSafe();

  // Return empty array if no organization context (e.g., session not synced yet)
  if (!organizationId) {
    return [];
  }
  // In v2.0 the old "clients with contacts" pattern is gone.
  // A contact IS the entity. Return the contact itself as a single-item array
  // for backward compatibility with callers that expected a list of "accounts".
  const data = await prismadb.contact.findMany({
    where: {
      organizationId,
      id: contactId,
    },
    include: {
      assignedAgent: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Map to expected field names for backward compatibility
  return data.map((contact) => ({
    ...contact,
    assigned_to_user: contact.assignedAgent,
    contacts: [],
  }));
};

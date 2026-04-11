import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

export const getAccount = async (accountId: string) => {
  const organizationId = await getCurrentOrgIdSafe();

  // Return null if no organization context (e.g., session not synced yet)
  if (!organizationId) {
    return null;
  }
  const data = await prismadb.contact.findFirst({
    where: {
      id: accountId,
      organizationId,
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

  if (!data) return null;

  // Map to expected field names for backward compatibility
  return {
    ...data,
    contacts: [],
    assigned_to_user: data.assignedAgent,
  };
};

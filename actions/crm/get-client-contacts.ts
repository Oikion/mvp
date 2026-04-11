import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

export const getClientContacts = async () => {
  const organizationId = await getCurrentOrgIdSafe();

  // Return empty array if no organization context (e.g., session not synced yet)
  if (!organizationId) {
    return [];
  }
  const data = await prismadb.contact.findMany({
    where: {
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
  // Map to legacy fields expected by existing UI until refactor completes
  return data.map((p) => ({
    ...p,
    first_name: p.firstName,
    last_name: p.lastName,
    assigned_accounts: [],
    assigned_to_user: p.assignedAgent,
    created_by_user: null,
  }));
};



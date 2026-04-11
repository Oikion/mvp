import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptContactForOrg } from "@/lib/model-encryption";

export const getClient = async (clientId: string) => {
  // Check permission to read clients
  const guard = await requireAction("client:read");
  if (guard) return null;

  const organizationId = await getCurrentOrgIdSafe();

  // Return null if no organization context (e.g., session not synced yet)
  if (!organizationId) {
    return null;
  }
  const data = await prismadb.contact.findFirst({
    where: {
      organizationId,
      friendlyId: clientId,
    },
    include: {
      assignedAgent: { select: { firstName: true, lastName: true, id: true } },
    },
  });

  if (!data) {
    return null;
  }

  const decryptedData = await decryptContactForOrg(data, organizationId);

  // Map to expected field names for backward compatibility
  const mappedData = {
    ...decryptedData,
    assigned_to_user: decryptedData.assignedAgent,
    contacts: [],
  };

  // Serialize to plain objects - converts Decimal to number, Date to string
  return JSON.parse(JSON.stringify(mappedData));
};



import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptPropertyForOrg } from "@/lib/model-encryption";

export const getProperty = async (propertyId: string) => {
  // Check permission to read properties
  const guard = await requireAction("property:read");
  if (guard) return null;

  const organizationId = await getCurrentOrgIdSafe();
  
  // Return null if no organization context (e.g., session not synced yet)
  if (!organizationId) {
    return null;
  }
  const data = await prismadb.properties.findFirst({
    where: {
      organizationId,
      friendlyId: propertyId,
    },
    include: {
      Users_Properties_assigned_toToUsers: { select: { name: true, id: true } },
      Property_Contacts: true,
    },
  });
  
  if (!data) return null;

  const decryptedData = await decryptPropertyForOrg(data, organizationId);

  // Map to expected field names for backward compatibility
  const mappedData = {
    ...decryptedData,
    assigned_to_user: decryptedData.Users_Properties_assigned_toToUsers,
    contacts: decryptedData.Property_Contacts,
  };

  // Serialize to plain objects - converts Decimal to number, Date to string
  return JSON.parse(JSON.stringify(mappedData));
};



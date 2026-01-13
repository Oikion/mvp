import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

export const getProperty = async (propertyId: string) => {
  const organizationId = await getCurrentOrgIdSafe();
  
  // Return null if no organization context (e.g., session not synced yet)
  if (!organizationId) {
    return null;
  }
  const data = await prismadb.properties.findFirst({
    where: { 
      id: propertyId,
      organizationId,
    },
    include: {
      Users_Properties_assigned_toToUsers: { select: { name: true, id: true } },
      Property_Contacts: true,
    },
  });
  
  if (!data) return null;
  
  // Map to expected field names for backward compatibility
  const mappedData = {
    ...data,
    assigned_to_user: data.Users_Properties_assigned_toToUsers,
    contacts: data.Property_Contacts,
  };
  
  // Serialize to plain objects - converts Decimal to number, Date to string
  return JSON.parse(JSON.stringify(mappedData));
};



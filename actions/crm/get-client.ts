import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";

// Helper function to serialize Prisma objects (convert Decimal to number, Date to ISO string)
const serializePrismaObject = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  // Handle Prisma Decimal objects
  if (obj && typeof obj === 'object' && 'toNumber' in obj && typeof obj.toNumber === 'function') {
    return obj.toNumber();
  }
  // Handle Date objects
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(serializePrismaObject);
  }
  // Handle objects
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializePrismaObject(value);
    }
    return serialized;
  }
  return obj;
};

export const getClient = async (clientId: string) => {
  const organizationId = await getCurrentOrgId();
  const data = await prismadb.clients.findFirst({
    where: { 
      id: clientId,
      organizationId,
    },
    include: {
      assigned_to_user: { select: { name: true, id: true } },
      contacts: true,
    },
  });
  
  if (!data) {
    return null;
  }
  
  // Serialize Decimal and Date fields before returning
  return serializePrismaObject(data);
};



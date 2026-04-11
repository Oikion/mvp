import { prismadb } from "@/lib/prisma";

export const getContact = async (contactId: string) => {
  const data = await prismadb.contact.findFirst({
    where: {
      id: contactId,
    },
    include: {
      assignedAgent: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!data) return null;

  // Map to expected interface shape
  return {
    ...data,
    assigned_client: null,
  };
};

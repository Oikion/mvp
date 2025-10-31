import { prismadb } from "@/lib/prisma";
import { getCacheStrategy } from "@/lib/prisma-cache";

export const getDocumentsByContactId = async (contactId: string) => {
  const data = await prismadb.documents.findMany({
    where: {
      contactsIDs: {
        has: contactId,
      },
    },
    include: {
      created_by: {
        select: {
          name: true,
        },
      },
      assigned_to_user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      date_created: "desc",
    },
    ...getCacheStrategy(30, ["documents:list", `contact:${contactId}`]),
  });
  return data;
};

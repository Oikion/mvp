import { prismadb } from "@/lib/prisma";
import { getCacheStrategy } from "@/lib/prisma-cache";

export const getDocumentsByOpportunityId = async (opportunityId: string) => {
  const data = await prismadb.documents.findMany({
    where: {
      contactsIDs: {
        has: opportunityId,
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
    ...getCacheStrategy(30, ["documents:list", `opportunity:${opportunityId}`]),
  });
  return data;
};

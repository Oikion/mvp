import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";

export const getProperties = async () => {
  const organizationId = await getCurrentOrgId();
  const client: any = prismadb as any;
  const delegate = client?.properties;
  if (!delegate) {
    return [] as any[];
  }
  const data = await delegate.findMany({
    where: { organizationId },
    include: {
      assigned_to_user: { select: { name: true } },
      linkedDocuments: {
        where: {
          document_file_mimeType: {
            startsWith: "image/",
          },
        },
        select: {
          document_file_url: true,
        },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return data;
};



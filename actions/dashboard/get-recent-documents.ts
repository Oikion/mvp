import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

export interface RecentDocument {
  id: string;
  name: string;
  description: string | null;
  mimeType: string;
  url: string;
  size: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  createdBy: {
    id: string;
    name: string | null;
    avatar: string | null;
  } | null;
  linkedClients: Array<{ id: string; name: string }>;
  linkedProperties: Array<{ id: string; name: string }>;
}

export const getRecentDocuments = async (limit: number = 5): Promise<RecentDocument[]> => {
  const organizationId = await getCurrentOrgIdSafe();
  
  // Return empty array if no organization context
  if (!organizationId) {
    return [];
  }

  const documents = await prismadb.documents.findMany({
    where: {
      organizationId,
    },
    select: {
      id: true,
      document_name: true,
      description: true,
      document_file_mimeType: true,
      document_file_url: true,
      size: true,
      createdAt: true,
      updatedAt: true,
      Users_Documents_created_by_userToUsers: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
      Clients: {
        select: {
          id: true,
          client_name: true,
        },
      },
      Properties: {
        select: {
          id: true,
          property_name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  return documents.map((doc) => ({
    id: doc.id,
    name: doc.document_name,
    description: doc.description,
    mimeType: doc.document_file_mimeType,
    url: doc.document_file_url,
    size: doc.size,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    createdBy: doc.Users_Documents_created_by_userToUsers
      ? {
          id: doc.Users_Documents_created_by_userToUsers.id,
          name: doc.Users_Documents_created_by_userToUsers.name,
          avatar: doc.Users_Documents_created_by_userToUsers.avatar,
        }
      : null,
    linkedClients: doc.Clients.map((c) => ({ id: c.id, name: c.client_name })),
    linkedProperties: doc.Properties.map((p) => ({ id: p.id, name: p.property_name })),
  }));
};

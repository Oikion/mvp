import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { decryptDocumentForOrg, decryptClientForOrg } from "@/lib/model-encryption";

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

  // Decrypt document fields and linked entity names
  return Promise.all(
    documents.map(async (doc) => {
      const decDoc = await decryptDocumentForOrg(doc, organizationId);
      // Decrypt linked client names (client_name is encrypted)
      const linkedClients = await Promise.all(
        doc.Clients.map(async (c) => {
          const dc = await decryptClientForOrg(c, organizationId);
          return { id: dc.id, name: dc.client_name };
        })
      );
      return {
        id: decDoc.id,
        name: decDoc.document_name,
        description: decDoc.description,
        mimeType: decDoc.document_file_mimeType,
        url: decDoc.document_file_url,
        size: decDoc.size,
        createdAt: decDoc.createdAt,
        updatedAt: decDoc.updatedAt,
        createdBy: decDoc.Users_Documents_created_by_userToUsers
          ? {
              id: decDoc.Users_Documents_created_by_userToUsers.id,
              name: decDoc.Users_Documents_created_by_userToUsers.name,
              avatar: decDoc.Users_Documents_created_by_userToUsers.avatar,
            }
          : null,
        linkedClients,
        linkedProperties: doc.Properties.map((p) => ({ id: p.id, name: p.property_name })),
      };
    })
  );
};

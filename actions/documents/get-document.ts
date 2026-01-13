import { prismadb } from "@/lib/prisma";

export async function getDocument(documentId: string, organizationId: string) {
  const document = await prismadb.documents.findFirst({
    where: {
      id: documentId,
      organizationId,
    },
    include: {
      Clients: {
        select: {
          id: true,
          client_name: true,
          primary_email: true,
        },
      },
      Properties: {
        select: {
          id: true,
          property_name: true,
          address_street: true,
          address_city: true,
        },
      },
      CalComEvent: {
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          location: true,
        },
      },
      crm_Accounts_Tasks_DocumentsToCrmAccountsTasks: {
        select: {
          id: true,
          title: true,
          priority: true,
          dueDateAt: true,
        },
      },
      Users_Documents_created_by_userToUsers: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      Users_Documents_assigned_userToUsers: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      DocumentView: {
        orderBy: {
          viewedAt: "desc",
        },
        take: 10,
        include: {
          Users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!document) return null;

  // Map to expected field names for backward compatibility
  return {
    ...document,
    accounts: document.Clients,
    linkedProperties: document.Properties,
    linkedCalComEvents: document.CalComEvent,
    linkedTasks: document.crm_Accounts_Tasks_DocumentsToCrmAccountsTasks,
    created_by: document.Users_Documents_created_by_userToUsers,
    assigned_to_user: document.Users_Documents_assigned_userToUsers,
    views: document.DocumentView.map((v) => ({
      ...v,
      viewerUser: v.Users,
    })),
  };
}

export async function getDocumentByShareLink(shareableLink: string) {
  const document = await prismadb.documents.findFirst({
    where: {
      shareableLink,
    },
    include: {
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
      CalComEvent: {
        select: {
          id: true,
          title: true,
          startTime: true,
        },
      },
      crm_Accounts_Tasks_DocumentsToCrmAccountsTasks: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!document) return null;

  // Map to expected field names for backward compatibility
  return {
    ...document,
    accounts: document.Clients,
    linkedProperties: document.Properties,
    linkedCalComEvents: document.CalComEvent,
    linkedTasks: document.crm_Accounts_Tasks_DocumentsToCrmAccountsTasks,
  };
}


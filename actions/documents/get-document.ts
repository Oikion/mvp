import { prismadb } from "@/lib/prisma";
import { decryptDocumentForOrg, decryptContactForOrg, decryptCalendarEventForOrg, decryptRequestForOrg } from "@/lib/model-encryption";

export async function getDocument(documentId: string, organizationId: string) {
  // Support lookup by friendlyId (e.g. "doc-000011") or raw id
  const isFriendlyId = documentId.startsWith("doc-");
  const document = await prismadb.documents.findFirst({
    where: {
      ...(isFriendlyId ? { friendlyId: documentId } : { id: documentId }),
      organizationId,
    },
    include: {
      Contacts: {
        select: {
          id: true,
          displayName: true,
          email: true,
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
      CalendarEvent: {
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
      Requests: {
        select: {
          id: true,
          friendlyId: true,
          title: true,
          requestType: true,
          status: true,
          urgency: true,
          budgetMin: true,
          budgetMax: true,
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

  const decryptedDoc = await decryptDocumentForOrg(document, organizationId);

  // Map to expected field names for backward compatibility
  return {
    ...decryptedDoc,
    accounts: await Promise.all(document.Contacts.map((c) => decryptContactForOrg(c, organizationId))),
    linkedProperties: document.Properties,
    linkedCalendarEvents: await Promise.all(document.CalendarEvent.map((e) => decryptCalendarEventForOrg(e, organizationId))),
    linkedTasks: document.crm_Accounts_Tasks_DocumentsToCrmAccountsTasks,
    linkedRequests: await Promise.all(document.Requests.map((r) => decryptRequestForOrg(r, organizationId))),
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
      Contacts: {
        select: {
          id: true,
          displayName: true,
        },
      },
      Properties: {
        select: {
          id: true,
          property_name: true,
        },
      },
      CalendarEvent: {
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

  const orgId = document.organizationId;
  const decryptedDoc = await decryptDocumentForOrg(document, orgId);

  // Map to expected field names for backward compatibility
  return {
    ...decryptedDoc,
    accounts: await Promise.all(document.Contacts.map((c) => decryptContactForOrg(c, orgId))),
    linkedProperties: document.Properties,
    linkedCalendarEvents: await Promise.all(document.CalendarEvent.map((e) => decryptCalendarEventForOrg(e, orgId))),
    linkedTasks: document.crm_Accounts_Tasks_DocumentsToCrmAccountsTasks,
  };
}


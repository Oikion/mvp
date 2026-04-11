import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { decryptDocumentForOrg, decryptClientForOrg, decryptCalendarEventForOrg } from "@/lib/model-encryption";

export interface DocumentFilters {
  clientId?: string;
  propertyId?: string;
  eventId?: string;
  taskId?: string;
  search?: string;
}

export async function getDocuments(filters?: DocumentFilters) {
  // Check permission to read documents
  const guard = await requireAction("document:read");
  if (guard) return [];

  const organizationId = await getCurrentOrgIdSafe();
  
  // Return empty array if no organization context (e.g., session not synced yet)
  if (!organizationId) {
    return [];
  }

  // Build organization filter - Documents have organizationId directly
  const orgFilter = {
    organizationId,
  };

  // Build additional filters
  const additionalFilters: any = {};

  if (filters?.clientId) {
    additionalFilters.accountsIDs = {
      has: filters.clientId,
    };
  }

  if (filters?.propertyId) {
    additionalFilters.linkedPropertiesIds = {
      has: filters.propertyId,
    };
  }

  if (filters?.eventId) {
    additionalFilters.linkedCalendarEventsIds = {
      has: filters.eventId,
    };
  }

  if (filters?.taskId) {
    additionalFilters.linkedTasksIds = {
      has: filters.taskId,
    };
  }

  // Build search filter if provided
  // NOTE: document_name and description are encrypted — DB-level text search on these
  // fields is not possible. Search is intentionally omitted for encrypted fields.
  let searchFilter: any = null;
  if (filters?.search) {
    searchFilter = {
      OR: [
        { document_name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ],
    };
  }

  // Combine all filters using AND
  const whereConditions: any[] = [orgFilter];
  
  if (Object.keys(additionalFilters).length > 0) {
    whereConditions.push(additionalFilters);
  }
  
  if (searchFilter) {
    whereConditions.push(searchFilter);
  }

  const where: any = whereConditions.length === 1 
    ? whereConditions[0] 
    : { AND: whereConditions };

  const documents = await prismadb.documents.findMany({
    where,
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
      Users_Documents_created_by_userToUsers: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      Users_Documents_assigned_userToUsers: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const results = [];
  for (const doc of documents) {
    try {
      const decrypted = await decryptDocumentForOrg(doc, organizationId);
      results.push({
        ...decrypted,
        Clients: await Promise.all(doc.Clients.map((c) => decryptClientForOrg(c, organizationId))),
        CalendarEvent: await Promise.all(doc.CalendarEvent.map((e) => decryptCalendarEventForOrg(e, organizationId))),
      });
    } catch (err) {
      console.error(`[GET_DOCUMENTS] Failed to decrypt document ${doc.id}:`, err);
    }
  }
  return results;
}


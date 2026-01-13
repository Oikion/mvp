import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

export interface DocumentFilters {
  clientId?: string;
  propertyId?: string;
  eventId?: string;
  taskId?: string;
  search?: string;
}

export async function getDocuments(filters?: DocumentFilters) {
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
    additionalFilters.linkedCalComEventsIds = {
      has: filters.eventId,
    };
  }

  if (filters?.taskId) {
    additionalFilters.linkedTasksIds = {
      has: filters.taskId,
    };
  }

  // Build search filter if provided
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

  return documents;
}


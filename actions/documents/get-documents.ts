import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";

export interface DocumentFilters {
  clientId?: string;
  propertyId?: string;
  eventId?: string;
  taskId?: string;
  search?: string;
}

export async function getDocuments(filters?: DocumentFilters) {
  const organizationId = await getCurrentOrgId();
  
  if (!organizationId) {
    throw new Error("Organization ID is required");
  }

  // Build organization filter
  const orgFilter = {
    OR: [
      {
        accounts: {
          some: {
            organizationId,
          },
        },
      },
      {
        linkedProperties: {
          some: {
            organizationId,
          },
        },
      },
      {
        linkedCalComEvents: {
          some: {
            organizationId,
          },
        },
      },
    ],
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
      accounts: {
        select: {
          id: true,
          client_name: true,
        },
      },
      linkedProperties: {
        select: {
          id: true,
          property_name: true,
        },
      },
      linkedCalComEvents: {
        select: {
          id: true,
          title: true,
          startTime: true,
        },
      },
      linkedTasks: {
        select: {
          id: true,
          title: true,
        },
      },
      created_by: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assigned_to_user: {
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


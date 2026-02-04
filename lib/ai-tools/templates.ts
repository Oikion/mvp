/**
 * AI Tool Templates
 * 
 * Pre-defined templates for common tool patterns to make creating new tools easier.
 */

export interface ToolTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  defaultValues: {
    displayName: string;
    description: string;
    category: string;
    endpointType: "INTERNAL_ACTION" | "API_ROUTE" | "EXTERNAL_URL";
    httpMethod: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    parameters: Record<string, unknown>;
    requiredScopes: string[];
  };
}

export const TOOL_TEMPLATES: ToolTemplate[] = [
  // ============================================
  // LIST / QUERY TEMPLATES
  // ============================================
  {
    id: "list-paginated",
    name: "List with Pagination",
    description: "Retrieve a paginated list of records with optional filtering",
    category: "Query",
    icon: "list",
    defaultValues: {
      displayName: "List [Entity]",
      description: "Retrieve a paginated list of [entity] records with optional filtering by status, search term, or date range.",
      category: "crm",
      endpointType: "API_ROUTE",
      httpMethod: "GET",
      parameters: {
        type: "object",
        properties: {
          search: {
            type: "string",
            description: "Search term to filter results by name or identifier",
          },
          status: {
            type: "string",
            enum: ["ACTIVE", "INACTIVE", "PENDING"],
            description: "Filter by status",
          },
          limit: {
            type: "number",
            default: 20,
            minimum: 1,
            maximum: 100,
            description: "Number of results to return (max 100)",
          },
          cursor: {
            type: "string",
            description: "Pagination cursor for fetching next page",
          },
          sortBy: {
            type: "string",
            enum: ["createdAt", "updatedAt", "name"],
            default: "createdAt",
            description: "Field to sort results by",
          },
          sortOrder: {
            type: "string",
            enum: ["asc", "desc"],
            default: "desc",
            description: "Sort order",
          },
        },
        required: [],
      },
      requiredScopes: [],
    },
  },
  {
    id: "list-simple",
    name: "Simple List",
    description: "Retrieve a simple list without pagination",
    category: "Query",
    icon: "list-ordered",
    defaultValues: {
      displayName: "Get All [Entity]",
      description: "Retrieve all [entity] records. Use for small datasets or dropdowns.",
      category: "crm",
      endpointType: "API_ROUTE",
      httpMethod: "GET",
      parameters: {
        type: "object",
        properties: {
          includeInactive: {
            type: "boolean",
            default: false,
            description: "Include inactive records in the results",
          },
        },
        required: [],
      },
      requiredScopes: [],
    },
  },
  {
    id: "get-by-id",
    name: "Get by ID",
    description: "Retrieve a single record by its ID",
    category: "Query",
    icon: "search",
    defaultValues: {
      displayName: "Get [Entity] by ID",
      description: "Retrieve a single [entity] record by its unique identifier. Returns full details including related data.",
      category: "crm",
      endpointType: "API_ROUTE",
      httpMethod: "GET",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "The unique identifier of the record to retrieve",
          },
          includeRelated: {
            type: "boolean",
            default: true,
            description: "Include related records in the response",
          },
        },
        required: ["id"],
      },
      requiredScopes: [],
    },
  },
  {
    id: "search-advanced",
    name: "Advanced Search",
    description: "Search with multiple filter criteria",
    category: "Query",
    icon: "filter",
    defaultValues: {
      displayName: "Search [Entity]",
      description: "Perform an advanced search with multiple filter criteria and sorting options.",
      category: "crm",
      endpointType: "API_ROUTE",
      httpMethod: "GET",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Full-text search query",
          },
          filters: {
            type: "object",
            description: "Filter criteria as key-value pairs",
            properties: {
              status: { type: "string" },
              type: { type: "string" },
              dateFrom: { type: "string", format: "date" },
              dateTo: { type: "string", format: "date" },
            },
          },
          limit: {
            type: "number",
            default: 20,
            maximum: 100,
          },
          offset: {
            type: "number",
            default: 0,
          },
        },
        required: [],
      },
      requiredScopes: [],
    },
  },

  // ============================================
  // CREATE TEMPLATES
  // ============================================
  {
    id: "create-entity",
    name: "Create Entity",
    description: "Create a new record with required and optional fields",
    category: "Create",
    icon: "plus",
    defaultValues: {
      displayName: "Create [Entity]",
      description: "Create a new [entity] record with the provided details. Returns the created record.",
      category: "crm",
      endpointType: "API_ROUTE",
      httpMethod: "POST",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the record (required)",
            minLength: 1,
            maxLength: 255,
          },
          description: {
            type: "string",
            description: "Optional description",
            maxLength: 2000,
          },
          status: {
            type: "string",
            enum: ["ACTIVE", "INACTIVE", "DRAFT"],
            default: "ACTIVE",
            description: "Initial status",
          },
          metadata: {
            type: "object",
            description: "Additional metadata as key-value pairs",
          },
        },
        required: ["name"],
      },
      requiredScopes: [],
    },
  },
  {
    id: "create-with-relations",
    name: "Create with Relations",
    description: "Create a record and link it to related entities",
    category: "Create",
    icon: "git-branch",
    defaultValues: {
      displayName: "Create [Entity] with Relations",
      description: "Create a new [entity] and optionally link it to related records.",
      category: "crm",
      endpointType: "API_ROUTE",
      httpMethod: "POST",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the record",
          },
          parentId: {
            type: "string",
            description: "ID of the parent record to link to",
          },
          relatedIds: {
            type: "array",
            items: { type: "string" },
            description: "IDs of related records to link",
          },
          assignedToUserId: {
            type: "string",
            description: "ID of the user to assign this record to",
          },
        },
        required: ["name"],
      },
      requiredScopes: [],
    },
  },

  // ============================================
  // UPDATE TEMPLATES
  // ============================================
  {
    id: "update-entity",
    name: "Update Entity",
    description: "Update an existing record by ID",
    category: "Update",
    icon: "pencil",
    defaultValues: {
      displayName: "Update [Entity]",
      description: "Update an existing [entity] record. Only provided fields will be updated.",
      category: "crm",
      endpointType: "API_ROUTE",
      httpMethod: "PATCH",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "ID of the record to update (required)",
          },
          name: {
            type: "string",
            description: "Updated name",
          },
          description: {
            type: "string",
            description: "Updated description",
          },
          status: {
            type: "string",
            enum: ["ACTIVE", "INACTIVE", "ARCHIVED"],
            description: "Updated status",
          },
        },
        required: ["id"],
      },
      requiredScopes: [],
    },
  },
  {
    id: "update-status",
    name: "Update Status",
    description: "Change the status of a record",
    category: "Update",
    icon: "toggle-right",
    defaultValues: {
      displayName: "Update [Entity] Status",
      description: "Change the status of a [entity] record.",
      category: "crm",
      endpointType: "API_ROUTE",
      httpMethod: "PATCH",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "ID of the record to update",
          },
          status: {
            type: "string",
            enum: ["ACTIVE", "INACTIVE", "PENDING", "COMPLETED", "CANCELLED"],
            description: "New status value",
          },
          reason: {
            type: "string",
            description: "Optional reason for the status change",
          },
        },
        required: ["id", "status"],
      },
      requiredScopes: [],
    },
  },
  {
    id: "bulk-update",
    name: "Bulk Update",
    description: "Update multiple records at once",
    category: "Update",
    icon: "layers",
    defaultValues: {
      displayName: "Bulk Update [Entity]",
      description: "Update multiple [entity] records with the same values.",
      category: "crm",
      endpointType: "API_ROUTE",
      httpMethod: "PATCH",
      parameters: {
        type: "object",
        properties: {
          ids: {
            type: "array",
            items: { type: "string" },
            description: "IDs of records to update",
            minItems: 1,
            maxItems: 100,
          },
          updates: {
            type: "object",
            description: "Fields to update on all records",
            properties: {
              status: { type: "string" },
              assignedToUserId: { type: "string" },
            },
          },
        },
        required: ["ids", "updates"],
      },
      requiredScopes: [],
    },
  },

  // ============================================
  // DELETE TEMPLATES
  // ============================================
  {
    id: "delete-entity",
    name: "Delete Entity",
    description: "Delete a single record by ID",
    category: "Delete",
    icon: "trash",
    defaultValues: {
      displayName: "Delete [Entity]",
      description: "Permanently delete a [entity] record by its ID.",
      category: "crm",
      endpointType: "API_ROUTE",
      httpMethod: "DELETE",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "ID of the record to delete",
          },
          force: {
            type: "boolean",
            default: false,
            description: "Force delete even if there are related records",
          },
        },
        required: ["id"],
      },
      requiredScopes: [],
    },
  },
  {
    id: "soft-delete",
    name: "Soft Delete (Archive)",
    description: "Mark a record as deleted without removing it",
    category: "Delete",
    icon: "archive",
    defaultValues: {
      displayName: "Archive [Entity]",
      description: "Archive a [entity] record. The record can be restored later.",
      category: "crm",
      endpointType: "API_ROUTE",
      httpMethod: "PATCH",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "ID of the record to archive",
          },
          reason: {
            type: "string",
            description: "Reason for archiving",
          },
        },
        required: ["id"],
      },
      requiredScopes: [],
    },
  },

  // ============================================
  // ACTION TEMPLATES
  // ============================================
  {
    id: "send-notification",
    name: "Send Notification",
    description: "Send a notification to a user or group",
    category: "Action",
    icon: "bell",
    defaultValues: {
      displayName: "Send Notification",
      description: "Send a notification to specified recipients.",
      category: "notifications",
      endpointType: "API_ROUTE",
      httpMethod: "POST",
      parameters: {
        type: "object",
        properties: {
          recipientIds: {
            type: "array",
            items: { type: "string" },
            description: "User IDs to notify",
          },
          title: {
            type: "string",
            description: "Notification title",
          },
          message: {
            type: "string",
            description: "Notification message content",
          },
          type: {
            type: "string",
            enum: ["info", "success", "warning", "error"],
            default: "info",
            description: "Notification type",
          },
          sendEmail: {
            type: "boolean",
            default: false,
            description: "Also send as email",
          },
        },
        required: ["recipientIds", "title", "message"],
      },
      requiredScopes: [],
    },
  },
  {
    id: "export-data",
    name: "Export Data",
    description: "Export data to a file format",
    category: "Action",
    icon: "download",
    defaultValues: {
      displayName: "Export [Entity] Data",
      description: "Export [entity] data to the specified format.",
      category: "documents",
      endpointType: "API_ROUTE",
      httpMethod: "POST",
      parameters: {
        type: "object",
        properties: {
          format: {
            type: "string",
            enum: ["csv", "xlsx", "pdf", "json"],
            default: "xlsx",
            description: "Export file format",
          },
          filters: {
            type: "object",
            description: "Filters to apply before export",
          },
          fields: {
            type: "array",
            items: { type: "string" },
            description: "Specific fields to include in export",
          },
          includeRelated: {
            type: "boolean",
            default: false,
            description: "Include related data in export",
          },
        },
        required: ["format"],
      },
      requiredScopes: [],
    },
  },
  {
    id: "assign-to-user",
    name: "Assign to User",
    description: "Assign a record to a team member",
    category: "Action",
    icon: "user-plus",
    defaultValues: {
      displayName: "Assign [Entity]",
      description: "Assign a [entity] to a team member.",
      category: "crm",
      endpointType: "API_ROUTE",
      httpMethod: "POST",
      parameters: {
        type: "object",
        properties: {
          entityId: {
            type: "string",
            description: "ID of the record to assign",
          },
          userId: {
            type: "string",
            description: "ID of the user to assign to",
          },
          notifyUser: {
            type: "boolean",
            default: true,
            description: "Send notification to the assigned user",
          },
          note: {
            type: "string",
            description: "Note to include with the assignment",
          },
        },
        required: ["entityId", "userId"],
      },
      requiredScopes: [],
    },
  },
  {
    id: "schedule-event",
    name: "Schedule Event",
    description: "Create a scheduled event or appointment",
    category: "Action",
    icon: "calendar",
    defaultValues: {
      displayName: "Schedule Event",
      description: "Create a new calendar event or appointment.",
      category: "calendar",
      endpointType: "API_ROUTE",
      httpMethod: "POST",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Event title",
          },
          description: {
            type: "string",
            description: "Event description",
          },
          startTime: {
            type: "string",
            format: "date-time",
            description: "Event start time (ISO 8601)",
          },
          endTime: {
            type: "string",
            format: "date-time",
            description: "Event end time (ISO 8601)",
          },
          location: {
            type: "string",
            description: "Event location",
          },
          attendeeIds: {
            type: "array",
            items: { type: "string" },
            description: "User IDs to invite",
          },
          reminderMinutes: {
            type: "number",
            default: 30,
            description: "Reminder time before event in minutes",
          },
        },
        required: ["title", "startTime", "endTime"],
      },
      requiredScopes: ["calendar:write"],
    },
  },

  // ============================================
  // REAL ESTATE SPECIFIC TEMPLATES
  // ============================================
  {
    id: "property-search",
    name: "Property Search",
    description: "Search properties with real estate specific filters",
    category: "Real Estate",
    icon: "home",
    defaultValues: {
      displayName: "Search Properties",
      description: "Search for properties with specific criteria including location, price, type, and features.",
      category: "mls",
      endpointType: "API_ROUTE",
      httpMethod: "GET",
      parameters: {
        type: "object",
        properties: {
          transactionType: {
            type: "string",
            enum: ["SALE", "RENTAL", "SHORT_TERM"],
            description: "Type of transaction",
          },
          propertyType: {
            type: "string",
            enum: ["APARTMENT", "HOUSE", "MAISONETTE", "COMMERCIAL", "WAREHOUSE", "PARKING", "PLOT", "FARM"],
            description: "Type of property",
          },
          municipality: {
            type: "string",
            description: "City or municipality",
          },
          area: {
            type: "string",
            description: "Neighborhood or area",
          },
          priceMin: {
            type: "number",
            description: "Minimum price in EUR",
          },
          priceMax: {
            type: "number",
            description: "Maximum price in EUR",
          },
          bedroomsMin: {
            type: "number",
            description: "Minimum number of bedrooms",
          },
          sizeMin: {
            type: "number",
            description: "Minimum size in square meters",
          },
          sizeMax: {
            type: "number",
            description: "Maximum size in square meters",
          },
          features: {
            type: "array",
            items: { type: "string" },
            description: "Required features (e.g., parking, elevator, garden)",
          },
          limit: {
            type: "number",
            default: 20,
            maximum: 100,
          },
        },
        required: [],
      },
      requiredScopes: ["mls:read"],
    },
  },
  {
    id: "client-matching",
    name: "Client Matching",
    description: "Find clients matching property criteria",
    category: "Real Estate",
    icon: "users",
    defaultValues: {
      displayName: "Find Matching Clients",
      description: "Find clients whose preferences match a property's characteristics.",
      category: "crm",
      endpointType: "API_ROUTE",
      httpMethod: "POST",
      parameters: {
        type: "object",
        properties: {
          propertyId: {
            type: "string",
            description: "ID of the property to match clients for",
          },
          matchThreshold: {
            type: "number",
            default: 70,
            minimum: 0,
            maximum: 100,
            description: "Minimum match percentage (0-100)",
          },
          includeContacted: {
            type: "boolean",
            default: false,
            description: "Include clients already contacted about this property",
          },
          clientStatus: {
            type: "array",
            items: { 
              type: "string",
              enum: ["LEAD", "ACTIVE", "CONVERTED"]
            },
            description: "Filter by client status",
          },
        },
        required: ["propertyId"],
      },
      requiredScopes: ["crm:read", "mls:read"],
    },
  },
  {
    id: "schedule-viewing",
    name: "Schedule Property Viewing",
    description: "Schedule a property viewing appointment",
    category: "Real Estate",
    icon: "eye",
    defaultValues: {
      displayName: "Schedule Property Viewing",
      description: "Schedule a viewing appointment for a property with a client.",
      category: "calendar",
      endpointType: "API_ROUTE",
      httpMethod: "POST",
      parameters: {
        type: "object",
        properties: {
          propertyId: {
            type: "string",
            description: "ID of the property to view",
          },
          clientId: {
            type: "string",
            description: "ID of the client requesting the viewing",
          },
          dateTime: {
            type: "string",
            format: "date-time",
            description: "Proposed viewing date and time",
          },
          duration: {
            type: "number",
            default: 30,
            description: "Viewing duration in minutes",
          },
          notes: {
            type: "string",
            description: "Additional notes for the viewing",
          },
          notifyOwner: {
            type: "boolean",
            default: true,
            description: "Notify the property owner about the viewing",
          },
        },
        required: ["propertyId", "clientId", "dateTime"],
      },
      requiredScopes: ["calendar:write", "mls:read", "crm:read"],
    },
  },
];

/**
 * Get all template categories
 */
export function getTemplateCategories(): string[] {
  const categories = new Set(TOOL_TEMPLATES.map((t) => t.category));
  return Array.from(categories).sort((a, b) => a.localeCompare(b));
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): ToolTemplate[] {
  return TOOL_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): ToolTemplate | undefined {
  return TOOL_TEMPLATES.find((t) => t.id === id);
}

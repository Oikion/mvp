/**
 * Seed AI Tools
 *
 * This script manages AI tools in the database with schema validation.
 *
 * Usage:
 *   pnpm exec tsx scripts/seed-ai-tools.ts           # Seed new tools (default)
 *   pnpm exec tsx scripts/seed-ai-tools.ts --fix     # Validate and fix existing tools
 *   pnpm exec tsx scripts/seed-ai-tools.ts --validate # Validate tool definitions only
 *
 * The script validates all tool schemas against JSON Schema requirements and
 * sanitizes them for OpenAI/Anthropic provider compatibility:
 * - Ensures type: "object" at root level
 * - Adds additionalProperties: false for OpenAI strict mode
 * - Removes default values from enum properties (can cause issues)
 */

import { config } from "dotenv";
// Load environment variables from .env.local
config({ path: ".env.local" });

import { PrismaClient, Prisma } from "@prisma/client";
import { getDeprecatedToolUpdates } from "../lib/ai-tools/deprecations";

const prisma = new PrismaClient();

// System admin ID placeholder - will be updated when run
const SYSTEM_CREATOR_ID = "system";

interface ToolDefinition {
  name: string;
  displayName: string;
  description: string;
  category: string;
  parameters: Record<string, unknown>;
  endpointType: "INTERNAL_ACTION" | "API_ROUTE" | "EXTERNAL_URL";
  endpointPath: string;
  httpMethod: string;
  requiredScopes: string[];
}

const systemTools: ToolDefinition[] = [
  // CRM Tools
  {
    name: "list_clients",
    displayName: "List Clients",
    description: "Retrieve a list of CRM clients with optional filtering by status, type, or search term. Returns paginated results with client details including name, email, phone, and status.",
    category: "crm",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["LEAD", "ACTIVE", "INACTIVE", "CONVERTED", "LOST"],
          description: "Filter by client status",
        },
        type: {
          type: "string",
          enum: ["BUYER", "SELLER", "RENTER", "INVESTOR", "REFERRAL_PARTNER"],
          description: "Filter by client type",
        },
        search: {
          type: "string",
          description: "Search by name, email, or phone",
        },
        limit: {
          type: "number",
          default: 20,
          description: "Number of results to return (max 100)",
        },
        cursor: {
          type: "string",
          description: "Pagination cursor for next page",
        },
      },
      required: [],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/v1/crm/clients",
    httpMethod: "GET",
    requiredScopes: ["crm:read"],
  },
  {
    name: "create_client",
    displayName: "Create Client",
    description: "Create a new CRM client record with contact information, status, and preferences. Returns the created client details.",
    category: "crm",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Client's full name (required)",
        },
        email: {
          type: "string",
          description: "Primary email address",
        },
        phone: {
          type: "string",
          description: "Primary phone number",
        },
        status: {
          type: "string",
          enum: ["LEAD", "ACTIVE", "INACTIVE"],
          default: "LEAD",
          description: "Initial client status",
        },
        type: {
          type: "string",
          enum: ["BUYER", "SELLER", "RENTER", "INVESTOR"],
          description: "Client type",
        },
        intent: {
          type: "string",
          enum: ["BUY", "RENT", "SELL", "LEASE", "INVEST"],
          description: "Client's intention",
        },
      },
      required: ["name"],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/v1/crm/clients",
    httpMethod: "POST",
    requiredScopes: ["crm:write"],
  },

  // MLS/Property Tools
  {
    name: "list_properties",
    displayName: "List Properties",
    description: "Retrieve a list of MLS property listings with optional filtering by status, type, location, or price range. Returns paginated results with property details.",
    category: "mls",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["ACTIVE", "PENDING", "SOLD", "OFF_MARKET", "WITHDRAWN"],
          description: "Filter by property status",
        },
        propertyType: {
          type: "string",
          enum: ["APARTMENT", "HOUSE", "MAISONETTE", "COMMERCIAL", "WAREHOUSE", "PARKING", "PLOT", "FARM", "INDUSTRIAL", "OTHER"],
          description: "Filter by property type",
        },
        transactionType: {
          type: "string",
          enum: ["SALE", "RENTAL", "SHORT_TERM"],
          description: "Filter by transaction type",
        },
        municipality: {
          type: "string",
          description: "Filter by municipality/city",
        },
        priceMin: {
          type: "number",
          description: "Minimum price in EUR",
        },
        priceMax: {
          type: "number",
          description: "Maximum price in EUR",
        },
        limit: {
          type: "number",
          default: 20,
          description: "Number of results to return (max 100)",
        },
        cursor: {
          type: "string",
          description: "Pagination cursor for next page",
        },
      },
      required: [],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/v1/mls/properties",
    httpMethod: "GET",
    requiredScopes: ["mls:read"],
  },
  {
    name: "create_property",
    displayName: "Create Property",
    description: "Create a new property listing with details like type, location, price, and features. Returns the created property record.",
    category: "mls",
    parameters: {
      type: "object",
      properties: {
        propertyName: {
          type: "string",
          description: "Property title/name (required)",
        },
        propertyType: {
          type: "string",
          enum: ["APARTMENT", "HOUSE", "MAISONETTE", "COMMERCIAL", "WAREHOUSE", "PARKING", "PLOT", "FARM", "INDUSTRIAL", "OTHER"],
          description: "Type of property",
        },
        transactionType: {
          type: "string",
          enum: ["SALE", "RENTAL", "SHORT_TERM"],
          description: "Transaction type",
        },
        price: {
          type: "number",
          description: "Price in EUR",
        },
        municipality: {
          type: "string",
          description: "Municipality/city",
        },
        area: {
          type: "string",
          description: "Neighborhood/area",
        },
        bedrooms: {
          type: "number",
          description: "Number of bedrooms",
        },
        bathrooms: {
          type: "number",
          description: "Number of bathrooms",
        },
        sizeNetSqm: {
          type: "number",
          description: "Net size in square meters",
        },
        description: {
          type: "string",
          description: "Property description",
        },
      },
      required: ["propertyName"],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/v1/mls/properties",
    httpMethod: "POST",
    requiredScopes: ["mls:write"],
  },

  // Calendar Tools
  {
    name: "list_events",
    displayName: "List Calendar Events",
    description: "Retrieve calendar events for the organization with optional date filtering. Returns event details including title, time, location, and attendees.",
    category: "calendar",
    parameters: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description: "Filter events starting from this date (ISO 8601 format)",
        },
        endDate: {
          type: "string",
          description: "Filter events until this date (ISO 8601 format)",
        },
        eventType: {
          type: "string",
          enum: ["PROPERTY_VIEWING", "CLIENT_CONSULTATION", "MEETING", "REMINDER", "TASK_DEADLINE", "OTHER"],
          description: "Filter by event type",
        },
        limit: {
          type: "number",
          default: 20,
          description: "Number of results to return (max 100)",
        },
        cursor: {
          type: "string",
          description: "Pagination cursor for next page",
        },
      },
      required: [],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/v1/calendar/events",
    httpMethod: "GET",
    requiredScopes: ["calendar:read"],
  },
  {
    name: "create_event",
    displayName: "Create Calendar Event",
    description: "Create a new calendar event with title, time, location, and optional attendees. Returns the created event details.",
    category: "calendar",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Event title (required)",
        },
        startTime: {
          type: "string",
          description: "Start time in ISO 8601 format (required)",
        },
        endTime: {
          type: "string",
          description: "End time in ISO 8601 format (required)",
        },
        description: {
          type: "string",
          description: "Event description",
        },
        location: {
          type: "string",
          description: "Event location",
        },
        eventType: {
          type: "string",
          enum: ["PROPERTY_VIEWING", "CLIENT_CONSULTATION", "MEETING", "REMINDER", "TASK_DEADLINE", "OTHER"],
          default: "OTHER",
          description: "Type of event",
        },
      },
      required: ["title", "startTime", "endTime"],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/v1/calendar/events",
    httpMethod: "POST",
    requiredScopes: ["calendar:write"],
  },

  // Task Tools
  {
    name: "list_tasks",
    displayName: "List Tasks",
    description: "Retrieve a list of tasks with optional filtering by priority or status. Returns task details including title, due date, and assignment.",
    category: "crm",
    parameters: {
      type: "object",
      properties: {
        priority: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Filter by priority level",
        },
        limit: {
          type: "number",
          default: 20,
          description: "Number of results to return (max 100)",
        },
        cursor: {
          type: "string",
          description: "Pagination cursor for next page",
        },
      },
      required: [],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/v1/crm/tasks",
    httpMethod: "GET",
    requiredScopes: ["tasks:read"],
  },
  {
    name: "create_task",
    displayName: "Create Task",
    description: "Create a new task with title, description, due date, and priority. Returns the created task details.",
    category: "crm",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Task title (required)",
        },
        content: {
          type: "string",
          description: "Task description/content",
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high"],
          default: "medium",
          description: "Task priority",
        },
        dueDateAt: {
          type: "string",
          description: "Due date in ISO 8601 format",
        },
      },
      required: ["title", "priority"],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/v1/crm/tasks",
    httpMethod: "POST",
    requiredScopes: ["tasks:write"],
  },

  // Document Tools
  {
    name: "list_documents",
    displayName: "List Documents",
    description: "Retrieve a list of documents with optional filtering by type or search. Returns document metadata including name, type, and URLs.",
    category: "documents",
    parameters: {
      type: "object",
      properties: {
        documentType: {
          type: "string",
          description: "Filter by document type",
        },
        search: {
          type: "string",
          description: "Search by document name",
        },
        limit: {
          type: "number",
          default: 20,
          description: "Number of results to return (max 100)",
        },
        cursor: {
          type: "string",
          description: "Pagination cursor for next page",
        },
      },
      required: [],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/v1/documents",
    httpMethod: "GET",
    requiredScopes: ["documents:read"],
  },

  // ===========================================
  // ENHANCED CRM TOOLS
  // ===========================================
  
  {
    name: "get_client_details",
    displayName: "Get Client Details",
    description: "Retrieve full details of a specific client including their preferences, notes, communication history, and linked entities. Use this when you need comprehensive information about a particular client.",
    category: "crm",
    parameters: {
      type: "object",
      properties: {
        clientId: {
          type: "string",
          description: "The unique identifier of the client",
        },
      },
      required: ["clientId"],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/v1/crm/clients/{clientId}",
    httpMethod: "GET",
    requiredScopes: ["crm:read"],
  },
  {
    name: "search_clients_semantic",
    displayName: "Search Clients by Criteria",
    description: "Search for clients based on natural language criteria such as preferences, location interests, budget range, or notes content. Returns clients matching the specified criteria.",
    category: "crm",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Natural language search query (e.g., 'clients looking for 2-bedroom apartments in Kolonaki')",
        },
        budgetMin: {
          type: "number",
          description: "Minimum budget in EUR",
        },
        budgetMax: {
          type: "number",
          description: "Maximum budget in EUR",
        },
        intent: {
          type: "string",
          enum: ["BUY", "RENT", "SELL", "LEASE", "INVEST"],
          description: "Client's intention",
        },
        limit: {
          type: "number",
          default: 10,
          description: "Maximum number of results",
        },
      },
      required: ["query"],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/ai/search-clients",
    httpMethod: "POST",
    requiredScopes: ["crm:read"],
  },
  {
    name: "update_client_preferences",
    displayName: "Update Client Preferences",
    description: "Update a client's property preferences including bedrooms, bathrooms, size, location preferences, amenities, and other requirements.",
    category: "crm",
    parameters: {
      type: "object",
      properties: {
        clientId: {
          type: "string",
          description: "The client's ID",
        },
        preferences: {
          type: "object",
          description: "Property preferences to update",
          properties: {
            bedroomsMin: { type: "number" },
            bedroomsMax: { type: "number" },
            bathroomsMin: { type: "number" },
            bathroomsMax: { type: "number" },
            sizeMinSqm: { type: "number" },
            sizeMaxSqm: { type: "number" },
            requiresElevator: { type: "boolean" },
            requiresParking: { type: "boolean" },
            petFriendly: { type: "boolean" },
            furnished: { type: "string", enum: ["NO", "PARTIALLY", "FULLY"] },
          },
        },
        areasOfInterest: {
          type: "array",
          items: { type: "string" },
          description: "Areas/neighborhoods of interest",
        },
      },
      required: ["clientId"],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/v1/crm/clients/{clientId}/preferences",
    httpMethod: "PUT",
    requiredScopes: ["crm:write"],
  },

  // ===========================================
  // ENHANCED CALENDAR TOOLS
  // ===========================================
  
  {
    name: "get_upcoming_events",
    displayName: "Get Upcoming Events",
    description: "Retrieve upcoming calendar events for the next specified number of days. Includes event details, linked properties, and clients.",
    category: "calendar",
    parameters: {
      type: "object",
      properties: {
        days: {
          type: "number",
          default: 7,
          description: "Number of days to look ahead",
        },
        eventType: {
          type: "string",
          enum: ["PROPERTY_VIEWING", "CLIENT_CONSULTATION", "MEETING", "REMINDER", "TASK_DEADLINE", "OTHER"],
          description: "Filter by event type",
        },
        limit: {
          type: "number",
          default: 20,
          description: "Maximum number of events to return",
        },
      },
      required: [],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/v1/calendar/events/upcoming",
    httpMethod: "GET",
    requiredScopes: ["calendar:read"],
  },
  {
    name: "create_reminder",
    displayName: "Create Reminder",
    description: "Create a personal reminder event in the calendar. Use for follow-ups, deadlines, or any time-based reminders.",
    category: "calendar",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Reminder title",
        },
        description: {
          type: "string",
          description: "Reminder details",
        },
        reminderTime: {
          type: "string",
          description: "When to remind (ISO 8601 format)",
        },
        clientId: {
          type: "string",
          description: "Optional: Link to a client",
        },
        propertyId: {
          type: "string",
          description: "Optional: Link to a property",
        },
      },
      required: ["title", "reminderTime"],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/v1/calendar/events",
    httpMethod: "POST",
    requiredScopes: ["calendar:write"],
  },
  {
    name: "find_available_slots",
    displayName: "Find Available Time Slots",
    description: "Find available time slots in the calendar for scheduling meetings or viewings. Returns a list of free time slots.",
    category: "calendar",
    parameters: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description: "Start date for search (ISO 8601)",
        },
        endDate: {
          type: "string",
          description: "End date for search (ISO 8601)",
        },
        durationMinutes: {
          type: "number",
          default: 60,
          description: "Required duration in minutes",
        },
        preferredTimeStart: {
          type: "string",
          description: "Preferred start time (HH:MM)",
        },
        preferredTimeEnd: {
          type: "string",
          description: "Preferred end time (HH:MM)",
        },
      },
      required: ["startDate", "endDate"],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/ai/find-slots",
    httpMethod: "POST",
    requiredScopes: ["calendar:read"],
  },

  // ===========================================
  // MATCHMAKING TOOLS
  // ===========================================
  
  {
    name: "find_matches_for_client",
    displayName: "Find Matching Properties for Client",
    description: "Find properties that match a client's preferences and requirements. Returns a ranked list of matching properties with match scores and explanations.",
    category: "matchmaking",
    parameters: {
      type: "object",
      properties: {
        clientId: {
          type: "string",
          description: "The client's ID",
        },
        limit: {
          type: "number",
          default: 10,
          description: "Maximum number of matches to return",
        },
        minScore: {
          type: "number",
          default: 40,
          description: "Minimum match score (0-100)",
        },
      },
      required: ["clientId"],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/ai/matchmaking/client-matches",
    httpMethod: "POST",
    requiredScopes: ["crm:read", "mls:read"],
  },
  {
    name: "find_matches_for_property",
    displayName: "Find Matching Clients for Property",
    description: "Find clients that might be interested in a specific property based on their preferences. Returns a ranked list of matching clients with match scores.",
    category: "matchmaking",
    parameters: {
      type: "object",
      properties: {
        propertyId: {
          type: "string",
          description: "The property's ID",
        },
        limit: {
          type: "number",
          default: 10,
          description: "Maximum number of matches to return",
        },
        minScore: {
          type: "number",
          default: 40,
          description: "Minimum match score (0-100)",
        },
      },
      required: ["propertyId"],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/ai/matchmaking/property-matches",
    httpMethod: "POST",
    requiredScopes: ["crm:read", "mls:read"],
  },
  {
    name: "explain_match",
    displayName: "Explain Match Score",
    description: "Get a detailed explanation of why a specific client-property pair has a particular match score. Shows which criteria matched and which didn't.",
    category: "matchmaking",
    parameters: {
      type: "object",
      properties: {
        clientId: {
          type: "string",
          description: "The client's ID",
        },
        propertyId: {
          type: "string",
          description: "The property's ID",
        },
      },
      required: ["clientId", "propertyId"],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/ai/matchmaking/explain",
    httpMethod: "POST",
    requiredScopes: ["crm:read", "mls:read"],
  },

  // ===========================================
  // MESSAGING TOOLS
  // ===========================================
  
  {
    name: "get_recent_conversations",
    displayName: "Get Recent Conversations",
    description: "Retrieve recent messaging conversations with previews of the latest messages. Use to see ongoing conversations.",
    category: "messages",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          default: 10,
          description: "Number of conversations to return",
        },
        unreadOnly: {
          type: "boolean",
          default: false,
          description: "Only return conversations with unread messages",
        },
      },
      required: [],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/ai/messages/recent",
    httpMethod: "GET",
    requiredScopes: ["messages:read"],
  },
  {
    name: "draft_message_response",
    displayName: "Draft Message Response",
    description: "Generate a draft response to a message based on the conversation context. The draft can be reviewed and edited before sending.",
    category: "messages",
    parameters: {
      type: "object",
      properties: {
        conversationId: {
          type: "string",
          description: "The conversation ID to respond to",
        },
        tone: {
          type: "string",
          enum: ["professional", "friendly", "formal"],
          default: "professional",
          description: "The tone of the response",
        },
        context: {
          type: "string",
          description: "Additional context for the response",
        },
      },
      required: ["conversationId"],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/ai/messages/draft",
    httpMethod: "POST",
    requiredScopes: ["messages:read"],
  },
  {
    name: "send_message",
    displayName: "Send Message",
    description: "Send a message to a conversation. Use after drafting or for direct messages.",
    category: "messages",
    parameters: {
      type: "object",
      properties: {
        conversationId: {
          type: "string",
          description: "The conversation ID",
        },
        content: {
          type: "string",
          description: "The message content",
        },
      },
      required: ["conversationId", "content"],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/messaging/messages",
    httpMethod: "POST",
    requiredScopes: ["messages:write"],
  },

  // ===========================================
  // DOCUMENT ANALYSIS TOOLS
  // ===========================================
  
  {
    name: "analyze_document",
    displayName: "Analyze Document",
    description: "Analyze a document to extract key information, summarize content, and identify important details. Works with PDFs, images, and text documents.",
    category: "documents",
    parameters: {
      type: "object",
      properties: {
        documentId: {
          type: "string",
          description: "The document's ID",
        },
        analysisType: {
          type: "string",
          enum: ["summary", "extraction", "full"],
          default: "summary",
          description: "Type of analysis to perform",
        },
      },
      required: ["documentId"],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/ai/documents/analyze",
    httpMethod: "POST",
    requiredScopes: ["documents:read"],
  },
  {
    name: "chat_with_document",
    displayName: "Chat with Document",
    description: "Ask questions about a specific document and get answers based on its content.",
    category: "documents",
    parameters: {
      type: "object",
      properties: {
        documentId: {
          type: "string",
          description: "The document's ID",
        },
        question: {
          type: "string",
          description: "Your question about the document",
        },
      },
      required: ["documentId", "question"],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/ai/documents/chat",
    httpMethod: "POST",
    requiredScopes: ["documents:read"],
  },

  // ===========================================
  // CONNECTIONS/SOCIAL TOOLS
  // ===========================================
  
  {
    name: "get_upcoming_birthdays",
    displayName: "Get Upcoming Birthdays",
    description: "Retrieve contacts and clients with upcoming birthdays in the next specified number of days.",
    category: "connections",
    parameters: {
      type: "object",
      properties: {
        days: {
          type: "number",
          default: 30,
          description: "Number of days to look ahead",
        },
        limit: {
          type: "number",
          default: 10,
          description: "Maximum number of results",
        },
      },
      required: [],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/ai/connections/birthdays",
    httpMethod: "GET",
    requiredScopes: ["crm:read"],
  },
  {
    name: "draft_birthday_message",
    displayName: "Draft Birthday Message",
    description: "Generate a personalized birthday message for a contact or client based on their profile and relationship history.",
    category: "connections",
    parameters: {
      type: "object",
      properties: {
        contactId: {
          type: "string",
          description: "The contact's ID",
        },
        tone: {
          type: "string",
          enum: ["professional", "warm", "casual"],
          default: "warm",
          description: "The tone of the message",
        },
        includePropertyMention: {
          type: "boolean",
          default: false,
          description: "Include mention of relevant properties",
        },
      },
      required: ["contactId"],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/ai/connections/draft-birthday",
    httpMethod: "POST",
    requiredScopes: ["crm:read"],
  },
  {
    name: "draft_property_recommendation",
    displayName: "Draft Property Recommendation",
    description: "Create a personalized email recommending properties to a client based on their preferences and recent listings.",
    category: "connections",
    parameters: {
      type: "object",
      properties: {
        clientId: {
          type: "string",
          description: "The client's ID",
        },
        propertyIds: {
          type: "array",
          items: { type: "string" },
          description: "Specific property IDs to recommend (optional)",
        },
        maxProperties: {
          type: "number",
          default: 3,
          description: "Maximum properties to include",
        },
        tone: {
          type: "string",
          enum: ["professional", "friendly", "luxury"],
          default: "professional",
        },
      },
      required: ["clientId"],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/ai/connections/draft-recommendation",
    httpMethod: "POST",
    requiredScopes: ["crm:read", "mls:read"],
  },

  // ===========================================
  // MARKET INTELLIGENCE TOOLS
  // ===========================================
  
  {
    name: "get_market_insights",
    displayName: "Get Market Insights",
    description: "Retrieve market intelligence insights including price trends, inventory levels, and competitor analysis for a specific area or property type.",
    category: "market_intelligence",
    parameters: {
      type: "object",
      properties: {
        area: {
          type: "string",
          description: "Area/neighborhood to analyze",
        },
        propertyType: {
          type: "string",
          enum: ["APARTMENT", "HOUSE", "COMMERCIAL", "PLOT"],
          description: "Property type to focus on",
        },
        transactionType: {
          type: "string",
          enum: ["SALE", "RENTAL"],
          description: "Transaction type",
        },
        timeframe: {
          type: "string",
          enum: ["7d", "30d", "90d", "180d"],
          default: "30d",
          description: "Analysis timeframe",
        },
      },
      required: [],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/ai/market-intel/insights",
    httpMethod: "POST",
    requiredScopes: ["reports:read"],
  },
  {
    name: "find_opportunities",
    displayName: "Find Market Opportunities",
    description: "Identify market opportunities such as underpriced listings, price drops, or high-demand areas based on market intelligence data.",
    category: "market_intelligence",
    parameters: {
      type: "object",
      properties: {
        opportunityType: {
          type: "string",
          enum: ["underpriced", "price_drop", "new_listing", "high_demand"],
          description: "Type of opportunity to find",
        },
        area: {
          type: "string",
          description: "Area to search (optional)",
        },
        limit: {
          type: "number",
          default: 10,
          description: "Maximum results to return",
        },
      },
      required: [],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/ai/market-intel/opportunities",
    httpMethod: "POST",
    requiredScopes: ["reports:read"],
  },
];

async function disableDeprecatedTools() {
  const updates = getDeprecatedToolUpdates();

  for (const update of updates) {
    await prisma.aiTool.updateMany({
      where: { name: update.name, isEnabled: true },
      data: { isEnabled: update.isEnabled },
    });
  }
}

// ============================================
// Schema Validation and Sanitization
// ============================================

interface ValidToolSchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

/**
 * Validate and sanitize a tool schema
 */
function validateAndSanitizeSchema(
  schema: Record<string, unknown>,
  toolName: string
): { valid: boolean; sanitized: ValidToolSchema | null; errors: string[] } {
  const errors: string[] = [];

  // Check for type: "object"
  if (schema.type !== "object") {
    errors.push(`Schema type must be "object", got "${schema.type}"`);
    return { valid: false, sanitized: null, errors };
  }

  // Check for properties
  if (!schema.properties || typeof schema.properties !== "object") {
    errors.push("Schema must have properties object");
    return { valid: false, sanitized: null, errors };
  }

  // Deep clone and sanitize
  const sanitized = JSON.parse(JSON.stringify(schema)) as ValidToolSchema;
  
  // Ensure type is exactly "object"
  sanitized.type = "object";

  // Add additionalProperties: false for OpenAI compatibility
  if (sanitized.additionalProperties === undefined) {
    sanitized.additionalProperties = false;
  }

  // Ensure required is an array
  if (sanitized.required === undefined) {
    sanitized.required = [];
  }

  // Sanitize properties recursively
  const properties = sanitized.properties as Record<string, Record<string, unknown>>;
  for (const [propName, propSchema] of Object.entries(properties)) {
    // Remove default from enum properties (can cause issues with OpenAI)
    if (propSchema.enum && propSchema.default !== undefined) {
      console.log(`    ℹ️  Removing default from enum property "${propName}" in tool "${toolName}"`);
      delete propSchema.default;
    }

    // Recursively sanitize nested objects
    if (propSchema.type === "object" && propSchema.properties) {
      const nested = validateAndSanitizeSchema(
        propSchema as Record<string, unknown>,
        `${toolName}.${propName}`
      );
      if (nested.sanitized) {
        properties[propName] = nested.sanitized;
      }
    }

    // Sanitize array items
    if (propSchema.type === "array" && propSchema.items) {
      const items = propSchema.items as Record<string, unknown>;
      if (items.type === "object" && items.properties) {
        const nestedItems = validateAndSanitizeSchema(items, `${toolName}.${propName}.items`);
        if (nestedItems.sanitized) {
          propSchema.items = nestedItems.sanitized;
        }
      }
    }
  }

  return { valid: true, sanitized, errors };
}

/**
 * Validate all tool definitions before seeding
 */
function validateAllTools(): boolean {
  console.log("🔍 Validating tool schemas...\n");
  let allValid = true;

  for (const tool of systemTools) {
    const result = validateAndSanitizeSchema(tool.parameters, tool.name);
    
    if (!result.valid) {
      console.error(`❌ Invalid schema for "${tool.name}":`);
      for (const error of result.errors) {
        console.error(`   - ${error}`);
      }
      allValid = false;
    } else {
      // Update the tool parameters with sanitized version
      tool.parameters = result.sanitized as Record<string, unknown>;
    }
  }

  if (allValid) {
    console.log(`✅ All ${systemTools.length} tool schemas are valid\n`);
  } else {
    console.error("\n⚠️  Some tool schemas have errors. Fix them before seeding.\n");
  }

  return allValid;
}

async function seedAiTools() {
  console.log("Seeding AI tools...\n");

  // Validate all schemas first
  if (!validateAllTools()) {
    throw new Error("Schema validation failed");
  }

  let created = 0;
  let skipped = 0;

  for (const tool of systemTools) {
    // Check if tool already exists
    const existing = await prisma.aiTool.findUnique({
      where: { name: tool.name },
    });

    if (existing) {
      console.log(`⏭️  Skipping "${tool.displayName}" - already exists`);
      skipped++;
      continue;
    }

    // Create the tool
    await prisma.aiTool.create({
      data: {
        name: tool.name,
        displayName: tool.displayName,
        description: tool.description,
        category: tool.category,
        parameters: tool.parameters as Prisma.InputJsonValue,
        endpointType: tool.endpointType,
        endpointPath: tool.endpointPath,
        httpMethod: tool.httpMethod,
        requiredScopes: tool.requiredScopes,
        isEnabled: true,
        isSystemTool: true,
        createdById: SYSTEM_CREATOR_ID,
      },
    });

    console.log(`✅ Created "${tool.displayName}" (${tool.category})`);
    created++;
  }

  await disableDeprecatedTools();

  console.log(`\n📊 Summary: ${created} created, ${skipped} skipped`);
}

/**
 * Validate and fix existing tools in the database
 */
async function fixExistingTools() {
  console.log("🔧 Validating and fixing existing tools in database...\n");

  const tools = await prisma.aiTool.findMany();
  let fixed = 0;
  let valid = 0;
  let invalid = 0;

  for (const tool of tools) {
    const params = tool.parameters as Record<string, unknown>;
    
    // Check if schema needs fixing
    const result = validateAndSanitizeSchema(params, tool.name);

    if (!result.valid) {
      console.error(`❌ Tool "${tool.name}" has invalid schema:`);
      for (const error of result.errors) {
        console.error(`   - ${error}`);
      }
      invalid++;
      continue;
    }

    // Check if schema was modified during sanitization
    const originalJson = JSON.stringify(params);
    const sanitizedJson = JSON.stringify(result.sanitized);

    if (originalJson !== sanitizedJson) {
      // Update the tool with sanitized schema
      await prisma.aiTool.update({
        where: { id: tool.id },
        data: { parameters: result.sanitized as Prisma.InputJsonValue },
      });
      console.log(`🔧 Fixed schema for "${tool.name}"`);
      fixed++;
    } else {
      valid++;
    }
  }

  await disableDeprecatedTools();

  console.log(`\n📊 Summary: ${valid} valid, ${fixed} fixed, ${invalid} invalid`);
}

/**
 * Check mode from command line arguments
 */
function getMode(): "seed" | "fix" | "validate" {
  const args = process.argv.slice(2);
  if (args.includes("--fix")) return "fix";
  if (args.includes("--validate")) return "validate";
  return "seed";
}

// Run the script based on mode
async function main() {
  const mode = getMode();

  console.log("=".repeat(50));
  console.log(`AI Tools Script - Mode: ${mode.toUpperCase()}`);
  console.log("=".repeat(50) + "\n");

  switch (mode) {
    case "validate":
      console.log("Validating all tool definitions...\n");
      if (validateAllTools()) {
        console.log("All tools are valid!");
      } else {
        process.exit(1);
      }
      break;

    case "fix":
      await fixExistingTools();
      break;

    case "seed":
    default:
      await seedAiTools();
      break;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("\n❌ Error:", error.message || error);
    await prisma.$disconnect();
    process.exit(1);
  });

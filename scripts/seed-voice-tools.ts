/**
 * Seed Voice Assistant AI Tools
 * 
 * This script creates the AI tools optimized for voice assistant usage.
 * Run with: pnpm exec tsx scripts/seed-voice-tools.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SYSTEM_CREATOR_ID = "system";

interface VoiceToolDefinition {
  name: string;
  displayName: string;
  description: string;
  category: string;
  parameters: Record<string, unknown>;
  endpointType: "API_ROUTE";
  endpointPath: string;
  httpMethod: "POST" | "GET";
  requiredScopes: string[];
}

const voiceTools: VoiceToolDefinition[] = [
  // ============================================
  // CLIENT TOOLS
  // ============================================
  {
    name: "create_client",
    displayName: "Create Client",
    description:
      "Create a new client/lead in the CRM. Use this when the user wants to add a new client, lead, or contact. Extract the name, phone, email, and any other details mentioned.",
    category: "crm",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Full name of the client (required)",
        },
        firstName: {
          type: "string",
          description: "First name if mentioned separately",
        },
        lastName: {
          type: "string",
          description: "Last name if mentioned separately",
        },
        phone: {
          type: "string",
          description: "Phone number",
        },
        email: {
          type: "string",
          description: "Email address",
        },
        status: {
          type: "string",
          enum: ["LEAD", "ACTIVE", "CONVERTED", "LOST"],
          description: "Client status (default: LEAD)",
        },
        intent: {
          type: "string",
          enum: ["BUY", "SELL", "RENT", "INVEST", "UNDECIDED"],
          description: "What the client wants to do",
        },
        type: {
          type: "string",
          enum: ["BUYER", "SELLER", "TENANT", "LANDLORD", "INVESTOR"],
          description: "Type of client",
        },
        notes: {
          type: "string",
          description: "Any additional notes or comments",
        },
        areasOfInterest: {
          type: "string",
          description: "Areas/neighborhoods the client is interested in",
        },
        budgetMin: {
          type: "number",
          description: "Minimum budget in EUR",
        },
        budgetMax: {
          type: "number",
          description: "Maximum budget in EUR",
        },
      },
      required: ["name"],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/internal/voice/create-client",
    httpMethod: "POST",
    requiredScopes: [],
  },
  {
    name: "search_clients",
    displayName: "Search Clients",
    description:
      "Search for clients in the CRM. Use this to find clients by name, status, intent, or other criteria. Use for questions like 'find client Maria', 'show my leads', 'who are my buyers'.",
    category: "crm",
    parameters: {
      type: "object",
      properties: {
        search: {
          type: "string",
          description: "Search term (searches name, email, phone)",
        },
        name: {
          type: "string",
          description: "Client name to search for",
        },
        status: {
          type: "string",
          enum: ["LEAD", "ACTIVE", "CONVERTED", "LOST"],
          description: "Filter by status",
        },
        intent: {
          type: "string",
          enum: ["BUY", "SELL", "RENT", "INVEST", "UNDECIDED"],
          description: "Filter by intent",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 10)",
        },
      },
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/internal/voice/search-clients",
    httpMethod: "POST",
    requiredScopes: [],
  },

  // ============================================
  // PROPERTY TOOLS
  // ============================================
  {
    name: "create_property",
    displayName: "Create Property",
    description:
      "Create a new property listing in the MLS. Use when the user wants to add a new property. Extract property type, transaction type, location, price, bedrooms, and any other details.",
    category: "mls",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Property name/title (required)",
        },
        propertyType: {
          type: "string",
          enum: [
            "APARTMENT",
            "HOUSE",
            "MAISONETTE",
            "COMMERCIAL",
            "WAREHOUSE",
            "PARKING",
            "PLOT",
            "FARM",
            "INDUSTRIAL",
            "OTHER",
          ],
          description: "Type of property",
        },
        transactionType: {
          type: "string",
          enum: ["SALE", "RENTAL", "SHORT_TERM", "EXCHANGE"],
          description: "Type of transaction (sale, rent, etc.)",
        },
        price: {
          type: "number",
          description: "Price in EUR",
        },
        municipality: {
          type: "string",
          description: "City/municipality name",
        },
        area: {
          type: "string",
          description: "Neighborhood/area name",
        },
        address: {
          type: "string",
          description: "Street address",
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
          description: "Size in square meters",
        },
        floor: {
          type: "string",
          description: "Floor number (for apartments)",
        },
        floorsTotal: {
          type: "number",
          description: "Total floors (for houses)",
        },
        yearBuilt: {
          type: "number",
          description: "Year of construction",
        },
        heatingType: {
          type: "string",
          enum: ["AUTONOMOUS", "CENTRAL", "NATURAL_GAS", "HEAT_PUMP", "ELECTRIC", "NONE"],
          description: "Type of heating",
        },
        condition: {
          type: "string",
          enum: ["EXCELLENT", "VERY_GOOD", "GOOD", "NEEDS_RENOVATION"],
          description: "Property condition",
        },
        description: {
          type: "string",
          description: "Property description",
        },
        amenities: {
          type: "array",
          items: { type: "string" },
          description: "List of amenities (e.g., parking, elevator, AC)",
        },
      },
      required: ["name"],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/internal/voice/create-property",
    httpMethod: "POST",
    requiredScopes: [],
  },
  {
    name: "search_properties",
    displayName: "Search Properties",
    description:
      "Search for properties in the MLS. Use for questions like 'what properties do I have', 'find apartments in Glyfada', 'show rentals under 1000 euros'.",
    category: "mls",
    parameters: {
      type: "object",
      properties: {
        search: {
          type: "string",
          description: "General search term",
        },
        municipality: {
          type: "string",
          description: "City/municipality to search in",
        },
        area: {
          type: "string",
          description: "Neighborhood/area to search in",
        },
        propertyType: {
          type: "string",
          enum: [
            "APARTMENT",
            "HOUSE",
            "MAISONETTE",
            "COMMERCIAL",
            "WAREHOUSE",
            "PARKING",
            "PLOT",
            "FARM",
          ],
          description: "Type of property",
        },
        transactionType: {
          type: "string",
          enum: ["SALE", "RENTAL", "SHORT_TERM"],
          description: "Sale or rental",
        },
        minPrice: {
          type: "number",
          description: "Minimum price in EUR",
        },
        maxPrice: {
          type: "number",
          description: "Maximum price in EUR",
        },
        minBedrooms: {
          type: "number",
          description: "Minimum number of bedrooms",
        },
        maxBedrooms: {
          type: "number",
          description: "Maximum number of bedrooms",
        },
        status: {
          type: "string",
          enum: ["ACTIVE", "INACTIVE", "SOLD", "RENTED"],
          description: "Property status",
        },
        limit: {
          type: "number",
          description: "Maximum results (default: 10)",
        },
      },
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/internal/voice/search-properties",
    httpMethod: "POST",
    requiredScopes: [],
  },

  // ============================================
  // CALENDAR/EVENT TOOLS
  // ============================================
  {
    name: "create_event",
    displayName: "Create Event/Reminder",
    description:
      "Create a calendar event or reminder. Use for scheduling viewings, meetings, calls, or setting reminders. Parses natural language dates like 'tomorrow', 'next Monday', 'in 2 hours'.",
    category: "calendar",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Event title (required) - e.g., 'Call Maria', 'Viewing at Glyfada apartment'",
        },
        description: {
          type: "string",
          description: "Event description or notes",
        },
        startTime: {
          type: "string",
          description: "Start time in ISO 8601 format (e.g., 2024-01-15T14:00:00)",
        },
        endTime: {
          type: "string",
          description: "End time in ISO 8601 format",
        },
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format (alternative to startTime)",
        },
        time: {
          type: "string",
          description: "Time in HH:MM format (use with date)",
        },
        duration: {
          type: "number",
          description: "Duration in minutes (default: 60 for events, 30 for reminders)",
        },
        location: {
          type: "string",
          description: "Event location",
        },
        eventType: {
          type: "string",
          enum: ["viewing", "meeting", "call", "reminder", "follow_up", "other"],
          description: "Type of event",
        },
        isReminder: {
          type: "boolean",
          description: "Set to true if this is a reminder rather than a meeting",
        },
        clientId: {
          type: "string",
          description: "ID of client to link to this event",
        },
        propertyId: {
          type: "string",
          description: "ID of property to link to this event",
        },
      },
      required: ["title"],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/internal/voice/create-event",
    httpMethod: "POST",
    requiredScopes: [],
  },
  {
    name: "query_calendar",
    displayName: "Query Calendar",
    description:
      "Query calendar events and reminders. Use for questions like 'what do I have today', 'when is my meeting with Maria', 'show my appointments this week'.",
    category: "calendar",
    parameters: {
      type: "object",
      properties: {
        today: {
          type: "boolean",
          description: "Show today's events",
        },
        tomorrow: {
          type: "boolean",
          description: "Show tomorrow's events",
        },
        thisWeek: {
          type: "boolean",
          description: "Show this week's events",
        },
        upcoming: {
          type: "boolean",
          description: "Show all upcoming events",
        },
        date: {
          type: "string",
          description: "Specific date in YYYY-MM-DD format",
        },
        startDate: {
          type: "string",
          description: "Start of date range",
        },
        endDate: {
          type: "string",
          description: "End of date range",
        },
        eventType: {
          type: "string",
          enum: ["viewing", "meeting", "call", "reminder", "follow_up"],
          description: "Filter by event type",
        },
        search: {
          type: "string",
          description: "Search in event titles/descriptions",
        },
        limit: {
          type: "number",
          description: "Maximum results (default: 10)",
        },
      },
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/internal/voice/query-calendar",
    httpMethod: "POST",
    requiredScopes: [],
  },

  // ============================================
  // LINKING TOOL
  // ============================================
  {
    name: "link_entities",
    displayName: "Link Entities",
    description:
      "Link two entities together, such as linking a client to a property, a client to an event, or a property to an event. Can search by name if IDs are not provided.",
    category: "system",
    parameters: {
      type: "object",
      properties: {
        entityType: {
          type: "string",
          enum: ["client", "property", "event", "document"],
          description: "Type of the first entity",
        },
        entityId: {
          type: "string",
          description: "ID of the first entity (if known)",
        },
        entityName: {
          type: "string",
          description: "Name of the first entity (used to search if ID not provided)",
        },
        targetType: {
          type: "string",
          enum: ["client", "property", "event", "document"],
          description: "Type of the entity to link to",
        },
        targetId: {
          type: "string",
          description: "ID of the target entity (if known)",
        },
        targetName: {
          type: "string",
          description: "Name of the target entity (used to search if ID not provided)",
        },
      },
      required: ["entityType", "targetType"],
    },
    endpointType: "API_ROUTE",
    endpointPath: "/api/internal/voice/link-entities",
    httpMethod: "POST",
    requiredScopes: [],
  },
];

async function seedVoiceTools() {
  console.log("Seeding voice assistant AI tools...\n");

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const tool of voiceTools) {
    // Check if tool already exists
    const existing = await prisma.aiTool.findUnique({
      where: { name: tool.name },
    });

    if (existing) {
      // Update existing tool with new definition
      await prisma.aiTool.update({
        where: { name: tool.name },
        data: {
          displayName: tool.displayName,
          description: tool.description,
          category: tool.category,
          parameters: tool.parameters as Prisma.InputJsonValue,
          endpointType: tool.endpointType,
          endpointPath: tool.endpointPath,
          httpMethod: tool.httpMethod,
          requiredScopes: tool.requiredScopes,
        },
      });
      console.log(`✏️  Updated "${tool.displayName}" (${tool.category})`);
      updated++;
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

  console.log(`\n📊 Summary: ${created} created, ${updated} updated, ${skipped} skipped`);
  console.log("\n🎤 Voice assistant tools are ready!");
}

seedVoiceTools()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Error seeding voice tools:", error);
    await prisma.$disconnect();
    process.exit(1);
  });

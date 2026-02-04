"use server";

/**
 * AI Tool Actions - CRM
 *
 * CRM operations for AI tool execution.
 * These functions receive context directly from the AI executor.
 */

import { prismadb } from "@/lib/prisma";
import { createId } from "@paralleldrive/cuid2";
import {
  type AIToolInput,
  type AIToolResponse,
  extractContext,
  validateContext,
  missingContextError,
  successResponse,
  errorResponse,
} from "./types";

// ============================================
// Types
// ============================================

interface ListClientsInput {
  status?: string;
  type?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}

interface GetClientDetailsInput {
  clientId: string;
}

interface CreateClientInput {
  name: string;
  email?: string;
  phone?: string;
  status?: string;
  type?: string;
  notes?: string;
  source?: string;
}

interface UpdateClientPreferencesInput {
  clientId: string;
  preferences: Record<string, unknown>;
}

interface SearchClientsSemanticInput {
  query: string;
  limit?: number;
}

interface ListTasksInput {
  status?: string;
  priority?: string;
  assignedTo?: string;
  limit?: number;
  cursor?: string;
}

interface CreateTaskInput {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: string;
  clientId?: string;
  propertyId?: string;
}

// ============================================
// Client Functions
// ============================================

/**
 * List CRM clients with optional filtering
 */
export async function listClients(
  input: AIToolInput<ListClientsInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const limit = Math.min(input.limit || 20, 100);
    const { status, type, search, cursor } = input;

    const where: Record<string, unknown> = {
      organizationId: context.organizationId,
    };

    if (status) {
      where.client_status = status;
    }

    if (type) {
      where.client_type = type;
    }

    if (search) {
      where.OR = [
        { client_name: { contains: search, mode: "insensitive" } },
        { primary_email: { contains: search, mode: "insensitive" } },
        { primary_phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const clients = await prismadb.clients.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        client_name: true,
        primary_email: true,
        primary_phone: true,
        client_status: true,
        client_type: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        Users_Clients_assigned_toToUsers: {
          select: { id: true, name: true },
        },
      },
    });

    const hasMore = clients.length > limit;
    const items = hasMore ? clients.slice(0, -1) : clients;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return successResponse({
      clients: items.map((client) => ({
        id: client.id,
        name: client.client_name,
        email: client.primary_email,
        phone: client.primary_phone,
        status: client.client_status,
        type: client.client_type,
        description: client.description,
        assignedTo: client.Users_Clients_assigned_toToUsers,
        createdAt: client.createdAt.toISOString(),
        updatedAt: client.updatedAt?.toISOString() || null,
      })),
      pagination: {
        hasMore,
        nextCursor,
        limit,
      },
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to list clients"
    );
  }
}

/**
 * Get detailed information about a specific client
 */
export async function getClientDetails(
  input: AIToolInput<GetClientDetailsInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const { clientId } = input;

    if (!clientId) {
      return errorResponse("Missing required field: clientId");
    }

    const client = await prismadb.clients.findFirst({
      where: {
        id: clientId,
        organizationId: context.organizationId,
      },
      include: {
        Users_Clients_assigned_toToUsers: {
          select: { id: true, name: true, email: true },
        },
        Client_Contacts: {
          select: {
            id: true,
            contact_first_name: true,
            contact_last_name: true,
            email: true,
            mobile_phone: true,
          },
        },
        Client_Properties: {
          take: 10,
          select: {
            Properties: {
              select: {
                id: true,
                property_name: true,
                property_type: true,
                property_status: true,
                price: true,
              },
            },
          },
        },
        CalendarEvent: {
          select: {
            id: true,
            title: true,
            startTime: true,
          },
          orderBy: { startTime: "desc" },
          take: 5,
        },
        Documents: {
          select: {
            id: true,
            document_name: true,
            document_type: true,
            createdAt: true,
          },
          take: 10,
        },
      },
    });

    if (!client) {
      return errorResponse("Client not found");
    }

    return successResponse({
      client: {
        id: client.id,
        name: client.client_name,
        email: client.primary_email,
        phone: client.primary_phone,
        status: client.client_status,
        type: client.client_type,
        leadSource: client.lead_source,
        budget_min: client.budget_min ? Number(client.budget_min) : null,
        budget_max: client.budget_max ? Number(client.budget_max) : null,
        assignedTo: client.Users_Clients_assigned_toToUsers,
        contacts: client.Client_Contacts.map((c) => ({
          id: c.id,
          firstName: c.contact_first_name,
          lastName: c.contact_last_name,
          email: c.email,
          phone: c.mobile_phone,
        })),
        linkedProperties: client.Client_Properties.map((cp) => ({
          id: cp.Properties.id,
          name: cp.Properties.property_name,
          type: cp.Properties.property_type,
          status: cp.Properties.property_status,
          price: cp.Properties.price ? Number(cp.Properties.price) : null,
        })),
        recentEvents: client.CalendarEvent.map((e) => ({
          id: e.id,
          title: e.title,
          startTime: e.startTime.toISOString(),
        })),
        documents: client.Documents.map((d) => ({
          id: d.id,
          name: d.document_name,
          type: d.document_type,
          createdAt: d.createdAt?.toISOString() || null,
        })),
        createdAt: client.createdAt.toISOString(),
        updatedAt: client.updatedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to get client details"
    );
  }
}

/**
 * Create a new CRM client
 */
export async function createClient(
  input: AIToolInput<CreateClientInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const { name, email, phone, status, type, notes, source } = input;

    if (!name) {
      return errorResponse("Missing required field: name");
    }

    // Validate and cast status and type to enum values
    const validStatuses = ["LEAD", "ACTIVE", "INACTIVE", "CONVERTED", "LOST"] as const;
    const validTypes = ["BUYER", "SELLER", "RENTER", "INVESTOR", "REFERRAL_PARTNER"] as const;
    const validLeadSources = ["REFERRAL", "WEB", "PORTAL", "WALK_IN", "SOCIAL"] as const;
    
    const clientStatus = status && validStatuses.includes(status as typeof validStatuses[number])
      ? (status as typeof validStatuses[number])
      : "LEAD";
    
    const clientType = type && validTypes.includes(type as typeof validTypes[number])
      ? (type as typeof validTypes[number])
      : "BUYER";
    
    const leadSource = source && validLeadSources.includes(source as typeof validLeadSources[number])
      ? (source as typeof validLeadSources[number])
      : null;

    const client = await prismadb.clients.create({
      data: {
        id: createId(),
        organizationId: context.organizationId,
        client_name: name,
        primary_email: email || null,
        primary_phone: phone || null,
        client_status: clientStatus,
        client_type: clientType,
        lead_source: leadSource,
        description: notes || null,
        assigned_to: context.userId || null,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        client_name: true,
        primary_email: true,
        primary_phone: true,
        client_status: true,
        client_type: true,
        createdAt: true,
      },
    });

    return successResponse(
      {
        client: {
          id: client.id,
          name: client.client_name,
          email: client.primary_email,
          phone: client.primary_phone,
          status: client.client_status,
          type: client.client_type,
          createdAt: client.createdAt.toISOString(),
        },
      },
      `Client "${name}" created successfully`
    );
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to create client"
    );
  }
}

/**
 * Update client preferences
 */
export async function updateClientPreferences(
  input: AIToolInput<UpdateClientPreferencesInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const { clientId, preferences } = input;

    if (!clientId || !preferences) {
      return errorResponse("Missing required fields: clientId, preferences");
    }

    // Verify client exists and belongs to org
    const client = await prismadb.clients.findFirst({
      where: {
        id: clientId,
        organizationId: context.organizationId,
      },
    });

    if (!client) {
      return errorResponse("Client not found");
    }

    // Update client preferences (stored as JSON in property_preferences field)
    const updated = await prismadb.clients.update({
      where: { id: clientId },
      data: {
        property_preferences: preferences as any,
      },
      select: {
        id: true,
        property_preferences: true,
      },
    });

    return successResponse(
      { preferences: updated.property_preferences },
      "Client preferences updated successfully"
    );
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update preferences"
    );
  }
}

/**
 * Search clients using semantic/text search
 */
export async function searchClientsSemantic(
  input: AIToolInput<SearchClientsSemanticInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const { query, limit = 10 } = input;

    if (!query) {
      return errorResponse("Missing required field: query");
    }

    // For now, use text search. In future, this could use vector embeddings
    const clients = await prismadb.clients.findMany({
      where: {
        organizationId: context.organizationId,
        OR: [
          { client_name: { contains: query, mode: "insensitive" } },
          { primary_email: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      take: limit,
      select: {
        id: true,
        client_name: true,
        primary_email: true,
        client_status: true,
        client_type: true,
        description: true,
      },
    });

    return successResponse({
      query,
      results: clients.map((client) => ({
        id: client.id,
        name: client.client_name,
        email: client.primary_email,
        status: client.client_status,
        type: client.client_type,
        description: client.description,
      })),
      totalResults: clients.length,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to search clients"
    );
  }
}

// ============================================
// Task Functions
// ============================================

/**
 * List tasks with optional filtering
 */
export async function listTasks(
  input: AIToolInput<ListTasksInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const limit = Math.min(input.limit || 20, 100);
    const { status, priority, assignedTo, cursor } = input;

    const where: Record<string, unknown> = {
      organizationId: context.organizationId,
    };

    if (status) {
      // Note: crm_Accounts_Tasks doesn't have a status field
    }

    if (priority) {
      where.priority = priority;
    }

    if (assignedTo) {
      where.assigned_to = assignedTo;
    }

    const tasks = await prismadb.crm_Accounts_Tasks.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        priority: true,
        dueDateAt: true,
        createdAt: true,
        Users: {
          select: { id: true, name: true },
        },
        Clients: {
          select: { id: true, client_name: true },
        },
      },
    });

    const hasMore = tasks.length > limit;
    const items = hasMore ? tasks.slice(0, -1) : tasks;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return successResponse({
      tasks: items.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.content,
        priority: task.priority,
        dueDate: task.dueDateAt?.toISOString() || null,
        assignedTo: task.Users,
        linkedClient: task.Clients,
        createdAt: task.createdAt?.toISOString() || null,
      })),
      pagination: {
        hasMore,
        nextCursor,
        limit,
      },
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to list tasks"
    );
  }
}

/**
 * Create a new task
 */
export async function createTask(
  input: AIToolInput<CreateTaskInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const { title, description, dueDate, priority, clientId, propertyId } = input;

    if (!title) {
      return errorResponse("Missing required field: title");
    }

    const task = await prismadb.crm_Accounts_Tasks.create({
      data: {
        id: createId(),
        organizationId: context.organizationId,
        title,
        content: description || null,
        priority: priority || "MEDIUM",
        dueDateAt: dueDate ? new Date(dueDate) : null,
        user: context.userId || null,
        account: clientId || null,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        title: true,
        content: true,
        priority: true,
        dueDateAt: true,
        createdAt: true,
      },
    });

    return successResponse(
      {
        task: {
          id: task.id,
          title: task.title,
          description: task.content,
        priority: task.priority,
        dueDate: task.dueDateAt?.toISOString() || null,
          createdAt: task.createdAt?.toISOString() || null,
        },
      },
      `Task "${title}" created successfully`
    );
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to create task"
    );
  }
}

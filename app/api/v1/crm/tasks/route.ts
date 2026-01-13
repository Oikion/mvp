import { NextRequest } from "next/server";
import { prismadb } from "@/lib/prisma";
import { API_SCOPES } from "@/lib/api-auth";
import {
  withExternalApi,
  createApiSuccessResponse,
  createApiErrorResponse,
  parsePaginationParams,
  parseFilterParams,
  ExternalApiContext,
} from "@/lib/external-api-middleware";
import { generateFriendlyId } from "@/lib/friendly-id";
import { dispatchTaskWebhook } from "@/lib/webhooks";

/**
 * GET /api/v1/crm/tasks
 * List tasks for the organization
 */
export const GET = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const { cursor, limit } = parsePaginationParams(req);
    const filters = parseFilterParams(req, [
      "priority",
      "assignedTo",
      "clientId",
      "dueBefore",
      "dueAfter",
      "search",
    ]);

    // Build where clause
    const where: Record<string, unknown> = {
      organizationId: context.organizationId,
    };

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.assignedTo) {
      where.user = filters.assignedTo;
    }

    if (filters.clientId) {
      where.account = filters.clientId;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { content: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Due date filters
    if (filters.dueBefore || filters.dueAfter) {
      where.dueDateAt = {};
      if (filters.dueBefore) {
        (where.dueDateAt as Record<string, Date>).lte = new Date(filters.dueBefore);
      }
      if (filters.dueAfter) {
        (where.dueDateAt as Record<string, Date>).gte = new Date(filters.dueAfter);
      }
    }

    // Fetch tasks
    const tasks = await prismadb.crm_Accounts_Tasks.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { dueDateAt: "asc" },
      select: {
        id: true,
        title: true,
        content: true,
        priority: true,
        dueDateAt: true,
        user: true,
        account: true,
        createdAt: true,
        updatedAt: true,
        Users: {
          select: { id: true, name: true, email: true },
        },
        Clients: {
          select: { id: true, client_name: true },
        },
      },
    });

    const hasMore = tasks.length > limit;
    const items = hasMore ? tasks.slice(0, -1) : tasks;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return createApiSuccessResponse(
      {
        tasks: items.map((task) => ({
          id: task.id,
          title: task.title,
          content: task.content,
          priority: task.priority,
          dueDate: task.dueDateAt?.toISOString(),
          assignedTo: task.Users,
          client: task.Clients,
          createdAt: task.createdAt?.toISOString(),
          updatedAt: task.updatedAt?.toISOString(),
        })),
      },
      200,
      { nextCursor, hasMore, limit }
    );
  },
  { requiredScopes: [API_SCOPES.TASKS_READ] }
);

/**
 * POST /api/v1/crm/tasks
 * Create a new task
 */
export const POST = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const body = await req.json();

    const { title, content, priority, dueDate, assignedTo, clientId, tags } = body;

    // Validate required fields
    if (!title) {
      return createApiErrorResponse("Missing required field: title", 400);
    }

    if (!priority) {
      return createApiErrorResponse("Missing required field: priority", 400);
    }

    // Validate priority
    const validPriorities = ["Low", "Normal", "High", "Urgent"];
    if (!validPriorities.includes(priority)) {
      return createApiErrorResponse(
        `Invalid priority. Must be one of: ${validPriorities.join(", ")}`,
        400
      );
    }

    // Generate friendly ID
    const taskId = await generateFriendlyId(prismadb, "crm_Accounts_Tasks");

    // Parse due date
    let dueDateAt = null;
    if (dueDate) {
      dueDateAt = new Date(dueDate);
      if (isNaN(dueDateAt.getTime())) {
        return createApiErrorResponse("Invalid date format for dueDate", 400);
      }
    }

    // Create task
    const task = await prismadb.crm_Accounts_Tasks.create({
      data: {
        id: taskId,
        organizationId: context.organizationId,
        createdBy: context.createdById,
        updatedBy: context.createdById,
        title,
        content: content || null,
        priority,
        dueDateAt,
        user: assignedTo || null,
        account: clientId || null,
        tags: tags || null,
      },
      select: {
        id: true,
        title: true,
        content: true,
        priority: true,
        dueDateAt: true,
        user: true,
        account: true,
        createdAt: true,
      },
    });

    // Dispatch webhook
    dispatchTaskWebhook(context.organizationId, "task.created", task).catch(console.error);

    return createApiSuccessResponse(
      {
        task: {
          id: task.id,
          title: task.title,
          content: task.content,
          priority: task.priority,
          dueDate: task.dueDateAt?.toISOString(),
          assignedTo: task.user,
          clientId: task.account,
          createdAt: task.createdAt?.toISOString(),
        },
      },
      201
    );
  },
  { requiredScopes: [API_SCOPES.TASKS_WRITE] }
);

import { NextRequest } from "next/server";
import { prismadb } from "@/lib/prisma";
import { API_SCOPES } from "@/lib/api-auth";
import {
  withExternalApi,
  createApiSuccessResponse,
  createApiErrorResponse,
  ExternalApiContext,
} from "@/lib/external-api-middleware";
import { dispatchTaskWebhook } from "@/lib/webhooks";

/**
 * GET /api/v1/crm/tasks/[taskId]
 * Get a single task
 */
export const GET = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const url = new URL(req.url);
    const taskId = url.pathname.split("/").pop();

    if (!taskId) {
      return createApiErrorResponse("Task ID is required", 400);
    }

    const task = await prismadb.crm_Accounts_Tasks.findFirst({
      where: {
        id: taskId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        title: true,
        content: true,
        priority: true,
        dueDateAt: true,
        tags: true,
        user: true,
        account: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        Users: {
          select: { id: true, name: true, email: true },
        },
        Clients: {
          select: { id: true, client_name: true },
        },
        crm_Accounts_Tasks_Comments: {
          select: {
            id: true,
            comment: true,
            createdAt: true,
            Users: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!task) {
      return createApiErrorResponse("Task not found", 404);
    }

    return createApiSuccessResponse({
      task: {
        id: task.id,
        title: task.title,
        content: task.content,
        priority: task.priority,
        dueDate: task.dueDateAt?.toISOString(),
        tags: task.tags,
        assignedTo: task.Users,
        client: task.Clients,
        comments: task.crm_Accounts_Tasks_Comments.map((c) => ({
          id: c.id,
          comment: c.comment,
          createdAt: c.createdAt.toISOString(),
          author: c.Users,
        })),
        createdAt: task.createdAt?.toISOString(),
        updatedAt: task.updatedAt?.toISOString(),
      },
    });
  },
  { requiredScopes: [API_SCOPES.TASKS_READ] }
);

/**
 * PUT /api/v1/crm/tasks/[taskId]
 * Update a task
 */
export const PUT = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const url = new URL(req.url);
    const taskId = url.pathname.split("/").pop();

    if (!taskId) {
      return createApiErrorResponse("Task ID is required", 400);
    }

    // Verify task exists and belongs to organization
    const existingTask = await prismadb.crm_Accounts_Tasks.findFirst({
      where: {
        id: taskId,
        organizationId: context.organizationId,
      },
    });

    if (!existingTask) {
      return createApiErrorResponse("Task not found", 404);
    }

    const body = await req.json();
    const { title, content, priority, dueDate, assignedTo, clientId, tags, completed } = body;

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedBy: context.createdById,
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (priority !== undefined) {
      const validPriorities = ["Low", "Normal", "High", "Urgent"];
      if (!validPriorities.includes(priority)) {
        return createApiErrorResponse(
          `Invalid priority. Must be one of: ${validPriorities.join(", ")}`,
          400
        );
      }
      updateData.priority = priority;
    }
    if (dueDate !== undefined) {
      if (dueDate === null) {
        updateData.dueDateAt = null;
      } else {
        const parsedDate = new Date(dueDate);
        if (isNaN(parsedDate.getTime())) {
          return createApiErrorResponse("Invalid date format for dueDate", 400);
        }
        updateData.dueDateAt = parsedDate;
      }
    }
    if (assignedTo !== undefined) updateData.user = assignedTo;
    if (clientId !== undefined) updateData.account = clientId;
    if (tags !== undefined) updateData.tags = tags;

    const task = await prismadb.crm_Accounts_Tasks.update({
      where: { id: taskId },
      data: updateData,
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
      },
    });

    // Dispatch webhook - check if task was marked as completed
    const webhookEvent = completed ? "task.completed" : "task.updated";
    dispatchTaskWebhook(context.organizationId, webhookEvent, task).catch(console.error);

    return createApiSuccessResponse({
      task: {
        id: task.id,
        title: task.title,
        content: task.content,
        priority: task.priority,
        dueDate: task.dueDateAt?.toISOString(),
        assignedTo: task.user,
        clientId: task.account,
        createdAt: task.createdAt?.toISOString(),
        updatedAt: task.updatedAt?.toISOString(),
      },
    });
  },
  { requiredScopes: [API_SCOPES.TASKS_WRITE] }
);

/**
 * DELETE /api/v1/crm/tasks/[taskId]
 * Delete a task
 */
export const DELETE = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const url = new URL(req.url);
    const taskId = url.pathname.split("/").pop();

    if (!taskId) {
      return createApiErrorResponse("Task ID is required", 400);
    }

    // Verify task exists and belongs to organization
    const existingTask = await prismadb.crm_Accounts_Tasks.findFirst({
      where: {
        id: taskId,
        organizationId: context.organizationId,
      },
    });

    if (!existingTask) {
      return createApiErrorResponse("Task not found", 404);
    }

    // Delete task
    await prismadb.crm_Accounts_Tasks.delete({
      where: { id: taskId },
    });

    // Dispatch webhook
    dispatchTaskWebhook(context.organizationId, "task.deleted", existingTask).catch(console.error);

    return createApiSuccessResponse({
      message: "Task deleted successfully",
      taskId,
    });
  },
  { requiredScopes: [API_SCOPES.TASKS_WRITE] }
);

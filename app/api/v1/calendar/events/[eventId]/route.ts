import { NextRequest } from "next/server";
import { prismadb } from "@/lib/prisma";
import { API_SCOPES } from "@/lib/api-auth";
import {
  withExternalApi,
  createApiSuccessResponse,
  createApiErrorResponse,
  ExternalApiContext,
} from "@/lib/external-api-middleware";
import { dispatchCalendarWebhook } from "@/lib/webhooks";

interface RouteParams {
  params: Promise<{ eventId: string }>;
}

/**
 * GET /api/v1/calendar/events/[eventId]
 * Get a single calendar event
 */
export const GET = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const url = new URL(req.url);
    const eventId = url.pathname.split("/").pop();

    if (!eventId) {
      return createApiErrorResponse("Event ID is required", 400);
    }

    const event = await prismadb.CalendarEvent.findFirst({
      where: {
        id: eventId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        location: true,
        status: true,
        eventType: true,
        assignedUserId: true,
        reminderMinutes: true,
        recurrenceRule: true,
        createdAt: true,
        updatedAt: true,
        Clients: {
          select: { id: true, client_name: true },
        },
        Properties: {
          select: { id: true, property_name: true },
        },
        Users: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!event) {
      return createApiErrorResponse("Event not found", 404);
    }

    return createApiSuccessResponse({
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        location: event.location,
        status: event.status,
        eventType: event.eventType,
        assignedUser: event.Users,
        reminderMinutes: event.reminderMinutes,
        recurrenceRule: event.recurrenceRule,
        linkedClients: event.Clients,
        linkedProperties: event.Properties,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
      },
    });
  },
  { requiredScopes: [API_SCOPES.CALENDAR_READ] }
);

/**
 * PUT /api/v1/calendar/events/[eventId]
 * Update a calendar event
 */
export const PUT = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const url = new URL(req.url);
    const eventId = url.pathname.split("/").pop();

    if (!eventId) {
      return createApiErrorResponse("Event ID is required", 400);
    }

    // Verify event exists and belongs to organization
    const existingEvent = await prismadb.CalendarEvent.findFirst({
      where: {
        id: eventId,
        organizationId: context.organizationId,
      },
    });

    if (!existingEvent) {
      return createApiErrorResponse("Event not found", 404);
    }

    const body = await req.json();
    const {
      title,
      description,
      startTime,
      endTime,
      location,
      status,
      eventType,
      assignedUserId,
      clientIds,
      propertyIds,
    } = body;

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    if (status !== undefined) updateData.status = status;
    if (eventType !== undefined) updateData.eventType = eventType;
    if (assignedUserId !== undefined) updateData.assignedUserId = assignedUserId;

    // Handle dates
    if (startTime !== undefined) {
      const start = new Date(startTime);
      if (isNaN(start.getTime())) {
        return createApiErrorResponse("Invalid date format for startTime", 400);
      }
      updateData.startTime = start;
    }

    if (endTime !== undefined) {
      const end = new Date(endTime);
      if (isNaN(end.getTime())) {
        return createApiErrorResponse("Invalid date format for endTime", 400);
      }
      updateData.endTime = end;
    }

    // Handle relations
    if (clientIds !== undefined) {
      updateData.Clients = {
        set: [], // Clear existing
        connect: Array.isArray(clientIds) ? clientIds.map((id: string) => ({ id })) : [],
      };
    }

    if (propertyIds !== undefined) {
      updateData.Properties = {
        set: [], // Clear existing
        connect: Array.isArray(propertyIds) ? propertyIds.map((id: string) => ({ id })) : [],
      };
    }

    const event = await prismadb.CalendarEvent.update({
      where: { id: eventId },
      data: updateData,
      select: {
        id: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        location: true,
        status: true,
        eventType: true,
        assignedUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Dispatch webhook
    dispatchCalendarWebhook(context.organizationId, "calendar.event.updated", event).catch(
      console.error
    );

    return createApiSuccessResponse({
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        location: event.location,
        status: event.status,
        eventType: event.eventType,
        assignedUserId: event.assignedUserId,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
      },
    });
  },
  { requiredScopes: [API_SCOPES.CALENDAR_WRITE] }
);

/**
 * DELETE /api/v1/calendar/events/[eventId]
 * Delete (cancel) a calendar event
 */
export const DELETE = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const url = new URL(req.url);
    const eventId = url.pathname.split("/").pop();

    if (!eventId) {
      return createApiErrorResponse("Event ID is required", 400);
    }

    // Verify event exists and belongs to organization
    const existingEvent = await prismadb.CalendarEvent.findFirst({
      where: {
        id: eventId,
        organizationId: context.organizationId,
      },
    });

    if (!existingEvent) {
      return createApiErrorResponse("Event not found", 404);
    }

    // Update status to cancelled instead of hard delete
    const event = await prismadb.CalendarEvent.update({
      where: { id: eventId },
      data: {
        status: "cancelled",
        updatedAt: new Date(),
      },
    });

    // Dispatch webhook
    dispatchCalendarWebhook(context.organizationId, "calendar.event.cancelled", event).catch(
      console.error
    );

    return createApiSuccessResponse({
      message: "Event cancelled successfully",
      eventId: event.id,
    });
  },
  { requiredScopes: [API_SCOPES.CALENDAR_WRITE] }
);

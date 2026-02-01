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
import { dispatchCalendarWebhook } from "@/lib/webhooks";

/**
 * GET /api/v1/calendar/events
 * List calendar events for the organization
 */
export const GET = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const { cursor, limit } = parsePaginationParams(req);
    const filters = parseFilterParams(req, ["startTime", "endTime", "status", "eventType"]);

    // Build where clause
    const where: Record<string, unknown> = {
      organizationId: context.organizationId,
    };

    // Date range filter
    if (filters.startTime || filters.endTime) {
      where.startTime = {};
      if (filters.startTime) {
        (where.startTime as Record<string, Date>).gte = new Date(filters.startTime);
      }
      if (filters.endTime) {
        (where.startTime as Record<string, Date>).lte = new Date(filters.endTime);
      }
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.eventType) {
      where.eventType = filters.eventType;
    }

    // Fetch events
    const events = await prismadb.calendarEvent.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { startTime: "asc" },
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
        Clients: {
          select: { id: true, client_name: true },
        },
        Properties: {
          select: { id: true, property_name: true },
        },
      },
    });

    const hasMore = events.length > limit;
    const items = hasMore ? events.slice(0, -1) : events;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return createApiSuccessResponse(
      {
        events: items.map((event) => ({
          id: event.id,
          title: event.title,
          description: event.description,
          startTime: event.startTime.toISOString(),
          endTime: event.endTime.toISOString(),
          location: event.location,
          status: event.status,
          eventType: event.eventType,
          assignedUserId: event.assignedUserId,
          linkedClients: event.Clients,
          linkedProperties: event.Properties,
          createdAt: event.createdAt.toISOString(),
          updatedAt: event.updatedAt.toISOString(),
        })),
      },
      200,
      { nextCursor, hasMore, limit }
    );
  },
  { requiredScopes: [API_SCOPES.CALENDAR_READ] }
);

/**
 * POST /api/v1/calendar/events
 * Create a new calendar event
 */
export const POST = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const body = await req.json();

    const {
      title,
      description,
      startTime,
      endTime,
      location,
      eventType,
      assignedUserId,
      clientIds,
      propertyIds,
    } = body;

    // Validate required fields
    if (!title || !startTime || !endTime) {
      return createApiErrorResponse(
        "Missing required fields: title, startTime, endTime",
        400
      );
    }

    // Validate dates
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return createApiErrorResponse("Invalid date format for startTime or endTime", 400);
    }

    if (end <= start) {
      return createApiErrorResponse("endTime must be after startTime", 400);
    }

    // Build relations
    const relations: Record<string, unknown> = {};
    if (clientIds && Array.isArray(clientIds) && clientIds.length > 0) {
      relations.Clients = { connect: clientIds.map((id: string) => ({ id })) };
    }
    if (propertyIds && Array.isArray(propertyIds) && propertyIds.length > 0) {
      relations.Properties = { connect: propertyIds.map((id: string) => ({ id })) };
    }

    // Generate IDs
    const friendlyEventId = await generateFriendlyId(prismadb, "CalComEvent");
    const calendarEventId = Math.abs(Math.floor(Date.now() / 1000));

    // Create event
    const event = await prismadb.calendarEvent.create({
      data: {
        id: friendlyEventId,
        calendarEventId,
        calendarUserId: 0,
        organizationId: context.organizationId,
        title,
        description: description || null,
        startTime: start,
        endTime: end,
        location: location || null,
        status: "scheduled",
        eventType: eventType || null,
        assignedUserId: assignedUserId || null,
        updatedAt: new Date(),
        ...relations,
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
        createdAt: true,
      },
    });

    // Dispatch webhook
    dispatchCalendarWebhook(context.organizationId, "calendar.event.created", event).catch(
      console.error
    );

    return createApiSuccessResponse(
      {
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
        },
      },
      201
    );
  },
  { requiredScopes: [API_SCOPES.CALENDAR_WRITE] }
);

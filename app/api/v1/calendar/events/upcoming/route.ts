import { NextRequest } from "next/server";
import { prismadb } from "@/lib/prisma";
import { API_SCOPES } from "@/lib/api-auth";
import {
  withExternalApi,
  withInternalToolApi,
  createApiSuccessResponse,
  ExternalApiContext,
} from "@/lib/external-api-middleware";

/**
 * GET /api/v1/calendar/events/upcoming
 * Get upcoming calendar events for the next specified number of days
 * 
 * Supports both:
 * - External API calls (with API key authentication)
 * - Internal AI tool calls (with X-Tool-Context headers)
 */
export const GET = withInternalToolApi(
  withExternalApi(
    async (req: NextRequest, context: ExternalApiContext) => {
      const { searchParams } = new URL(req.url);
      
      // Parse parameters
      const days = Math.min(Number.parseInt(searchParams.get("days") || "7", 10), 365); // Max 1 year
      const limit = Math.min(Number.parseInt(searchParams.get("limit") || "20", 10), 100); // Max 100
      const eventType = searchParams.get("eventType");

      // Calculate date range
      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + days);

      // Build where clause
      const where: Record<string, unknown> = {
        organizationId: context.organizationId,
        startTime: {
          gte: now,
          lte: endDate,
        },
        status: {
          notIn: ["cancelled"],
        },
      };

      if (eventType) {
        where.eventType = eventType;
      }

      // Fetch upcoming events
      const events = await prismadb.CalendarEvent.findMany({
        where,
        take: limit,
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

      return createApiSuccessResponse(
        {
          events: events.map((event) => ({
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
          summary: {
            totalEvents: events.length,
            daysAhead: days,
            dateRange: {
              from: now.toISOString(),
              to: endDate.toISOString(),
            },
          },
        },
        200
      );
    },
    { requiredScopes: [API_SCOPES.CALENDAR_READ] }
  )
);

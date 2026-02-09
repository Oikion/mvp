"use server";

/**
 * AI Tool Actions - Showing Scheduler
 *
 * Schedules a property showing by creating a calendar event.
 */

import { createId } from "@paralleldrive/cuid2";
import { prismadb } from "@/lib/prisma";
import {
  type AIToolInput,
  type AIToolResponse,
  extractContext,
  validateContext,
  missingContextError,
  successResponse,
  errorResponse,
} from "./types";

type SchedulePropertyShowingInput = {
  propertyId: string;
  clientId: string;
  preferredDates?: string[];
  duration?: number;
  autoConfirm?: boolean;
  sendReminders?: boolean;
};

function resolveStartTime(preferredDates?: string[]): Date {
  if (preferredDates && preferredDates.length > 0) {
    const candidate = new Date(preferredDates[0]);
    if (!Number.isNaN(candidate.getTime())) {
      return candidate;
    }
  }

  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(10, 0, 0, 0);
  return fallback;
}

/**
 * Schedule a property showing for a client.
 */
export async function schedulePropertyShowing(
  input: AIToolInput<SchedulePropertyShowingInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const { propertyId, clientId, duration = 30 } = input;

    if (!propertyId || !clientId) {
      return errorResponse("Missing required fields: propertyId, clientId");
    }

    const [property, client] = await Promise.all([
      prismadb.properties.findFirst({
        where: { id: propertyId, organizationId: context.organizationId },
        select: { id: true, property_name: true },
      }),
      prismadb.clients.findFirst({
        where: { id: clientId, organizationId: context.organizationId },
        select: { id: true, client_name: true },
      }),
    ]);

    if (!property) {
      return errorResponse("Property not found");
    }
    if (!client) {
      return errorResponse("Client not found");
    }

    const startTime = resolveStartTime(input.preferredDates);
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    const eventId = createId();
    const calendarEventId = Math.abs(Math.floor(Date.now() / 1000));

    const event = await prismadb.calendarEvent.create({
      data: {
        id: eventId,
        calendarEventId,
        calendarUserId: 0,
        organizationId: context.organizationId,
        title: `Showing: ${property.property_name || "Property"}`,
        description: `Showing for ${client.client_name || "client"}.`,
        startTime,
        endTime,
        status: "scheduled",
        eventType: "PROPERTY_VIEWING",
        assignedUserId: context.userId || null,
        updatedAt: new Date(),
        Clients: { connect: [{ id: clientId }] },
        Properties: { connect: [{ id: propertyId }] },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
      },
    });

    return successResponse({
      eventId: event.id,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to schedule showing"
    );
  }
}

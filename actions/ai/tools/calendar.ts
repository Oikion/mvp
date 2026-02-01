"use server";

/**
 * AI Tool Actions - Calendar
 *
 * Calendar operations for AI tool execution.
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

interface GetUpcomingEventsInput {
  days?: number;
  eventType?: string;
  limit?: number;
}

interface CreateEventInput {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  eventType?: string;
  clientIds?: string[];
  propertyIds?: string[];
}

interface ListEventsInput {
  startTime?: string;
  endTime?: string;
  status?: string;
  eventType?: string;
  limit?: number;
  cursor?: string;
}

interface CreateReminderInput {
  eventId: string;
  reminderTime: string;
  message?: string;
}

interface FindAvailableSlotsInput {
  date: string;
  duration?: number;
  startHour?: number;
  endHour?: number;
}

// ============================================
// Tool Functions
// ============================================

/**
 * Get upcoming calendar events for the organization
 */
export async function getUpcomingEvents(
  input: AIToolInput<GetUpcomingEventsInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const days = Math.min(input.days || 7, 365);
    const limit = Math.min(input.limit || 20, 100);
    const { eventType } = input;

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + days);

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

    const events = await prismadb.calendarEvent.findMany({
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
        Clients: {
          select: { id: true, client_name: true },
        },
        Properties: {
          select: { id: true, property_name: true },
        },
      },
    });

    return successResponse({
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
      })),
      summary: {
        totalEvents: events.length,
        daysAhead: days,
        dateRange: {
          from: now.toISOString(),
          to: endDate.toISOString(),
        },
      },
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to get upcoming events"
    );
  }
}

/**
 * List calendar events with filtering
 */
export async function listEvents(
  input: AIToolInput<ListEventsInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const limit = Math.min(input.limit || 20, 100);
    const { startTime, endTime, status, eventType, cursor } = input;

    const where: Record<string, unknown> = {
      organizationId: context.organizationId,
    };

    if (startTime || endTime) {
      where.startTime = {};
      if (startTime) {
        (where.startTime as Record<string, Date>).gte = new Date(startTime);
      }
      if (endTime) {
        (where.startTime as Record<string, Date>).lte = new Date(endTime);
      }
    }

    if (status) {
      where.status = status;
    }

    if (eventType) {
      where.eventType = eventType;
    }

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

    return successResponse({
      events: items.map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        location: event.location,
        status: event.status,
        eventType: event.eventType,
        linkedClients: event.Clients,
        linkedProperties: event.Properties,
      })),
      pagination: {
        hasMore,
        nextCursor,
        limit,
      },
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to list events"
    );
  }
}

/**
 * Create a new calendar event
 */
export async function createEvent(
  input: AIToolInput<CreateEventInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const {
      title,
      description,
      startTime,
      endTime,
      location,
      eventType,
      clientIds,
      propertyIds,
    } = input;

    // Validate required fields
    if (!title || !startTime || !endTime) {
      return errorResponse("Missing required fields: title, startTime, endTime");
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return errorResponse("Invalid date format for startTime or endTime");
    }

    if (end <= start) {
      return errorResponse("endTime must be after startTime");
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
    const eventId = createId();
    const calendarEventId = Math.abs(Math.floor(Date.now() / 1000));

    const event = await prismadb.calendarEvent.create({
      data: {
        id: eventId,
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
        assignedUserId: context.userId || null,
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
        createdAt: true,
      },
    });

    return successResponse(
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
          createdAt: event.createdAt.toISOString(),
        },
      },
      `Event "${title}" created successfully`
    );
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to create event"
    );
  }
}

/**
 * Create a reminder for an event
 */
export async function createReminder(
  input: AIToolInput<CreateReminderInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const { eventId, reminderTime, message } = input;

    if (!eventId || !reminderTime) {
      return errorResponse("Missing required fields: eventId, reminderTime");
    }

    // Verify event exists and belongs to org
    const event = await prismadb.calendarEvent.findFirst({
      where: {
        id: eventId,
        organizationId: context.organizationId,
      },
    });

    if (!event) {
      return errorResponse("Event not found");
    }

    const scheduledFor = new Date(reminderTime);
    if (isNaN(scheduledFor.getTime())) {
      return errorResponse("Invalid reminderTime format");
    }

    const reminder = await prismadb.calendarReminder.create({
      data: {
        id: createId(),
        eventId,
        scheduledFor,
        message: message || `Reminder for: ${event.title}`,
        status: "PENDING",
        updatedAt: new Date(),
      },
    });

    return successResponse(
      {
        reminder: {
          id: reminder.id,
          eventId: reminder.eventId,
          scheduledFor: reminder.scheduledFor.toISOString(),
          message: reminder.message,
          status: reminder.status,
        },
      },
      "Reminder created successfully"
    );
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to create reminder"
    );
  }
}

/**
 * Find available time slots for a given date
 */
export async function findAvailableSlots(
  input: AIToolInput<FindAvailableSlotsInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const { date, duration = 60, startHour = 9, endHour = 18 } = input;

    if (!date) {
      return errorResponse("Missing required field: date");
    }

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return errorResponse("Invalid date format");
    }

    // Set time range for the day
    const dayStart = new Date(targetDate);
    dayStart.setHours(startHour, 0, 0, 0);

    const dayEnd = new Date(targetDate);
    dayEnd.setHours(endHour, 0, 0, 0);

    // Get existing events for the day
    const existingEvents = await prismadb.calendarEvent.findMany({
      where: {
        organizationId: context.organizationId,
        startTime: {
          gte: dayStart,
          lt: dayEnd,
        },
        status: {
          notIn: ["cancelled"],
        },
      },
      select: {
        startTime: true,
        endTime: true,
      },
      orderBy: { startTime: "asc" },
    });

    // Calculate available slots
    const slots: Array<{ start: string; end: string }> = [];
    let currentTime = dayStart;
    const slotDuration = duration * 60 * 1000; // Convert to milliseconds

    for (const event of existingEvents) {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);

      // Add slots before this event
      while (currentTime.getTime() + slotDuration <= eventStart.getTime()) {
        const slotEnd = new Date(currentTime.getTime() + slotDuration);
        slots.push({
          start: currentTime.toISOString(),
          end: slotEnd.toISOString(),
        });
        currentTime = slotEnd;
      }

      // Move past this event
      if (eventEnd > currentTime) {
        currentTime = eventEnd;
      }
    }

    // Add remaining slots after last event
    while (currentTime.getTime() + slotDuration <= dayEnd.getTime()) {
      const slotEnd = new Date(currentTime.getTime() + slotDuration);
      slots.push({
        start: currentTime.toISOString(),
        end: slotEnd.toISOString(),
      });
      currentTime = slotEnd;
    }

    return successResponse({
      date: targetDate.toISOString().split("T")[0],
      duration,
      availableSlots: slots,
      totalSlots: slots.length,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to find available slots"
    );
  }
}

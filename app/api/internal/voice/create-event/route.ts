import { NextRequest, NextResponse } from "next/server";
import { getInternalApiContext } from "@/lib/internal-api-auth";
import { prismadb } from "@/lib/prisma";
import { generateFriendlyId } from "@/lib/friendly-id";

/**
 * POST /api/internal/voice/create-event
 * Internal API for voice assistant to create calendar events/reminders
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getInternalApiContext(request);

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, organizationId, isAdminTest } = context;

    // Return mock response for admin testing (don't actually create)
    if (isAdminTest) {
      const body = await request.json();
      const title = body.title || "Test Event";
      const startTime = body.startTime ? new Date(body.startTime) : new Date();
      const isReminder = body.isReminder || false;

      const formattedDate = startTime.toLocaleDateString("el-GR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      const formattedTime = startTime.toLocaleTimeString("el-GR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      return NextResponse.json({
        success: true,
        event: {
          id: `test-event-${Date.now()}`,
          title,
          startTime: startTime.toISOString(),
          endTime: new Date(startTime.getTime() + 60 * 60 * 1000).toISOString(),
          type: body.eventType || (isReminder ? "reminder" : "meeting"),
          location: body.location || null,
          formattedDate,
          formattedTime,
          createdAt: new Date().toISOString(),
        },
        message: isReminder
          ? `Reminder "${title}" would be set for ${formattedDate} at ${formattedTime} (test mode)`
          : `Event "${title}" would be scheduled for ${formattedDate} at ${formattedTime} (test mode)`,
        _testMode: true,
      });
    }

    const body = await request.json();
    const {
      title,
      description,
      startTime,
      endTime,
      date,
      time,
      duration,
      location,
      eventType,
      isReminder,
      clientId,
      propertyId,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Event title is required" },
        { status: 400 }
      );
    }

    // Parse start time from various formats
    let start: Date;
    let end: Date;

    if (startTime) {
      start = new Date(startTime);
    } else if (date && time) {
      start = new Date(`${date}T${time}`);
    } else if (date) {
      // If only date provided, default to 9 AM
      start = new Date(`${date}T09:00:00`);
    } else {
      return NextResponse.json(
        { error: "Start time is required (provide startTime, or date/time)" },
        { status: 400 }
      );
    }

    if (isNaN(start.getTime())) {
      return NextResponse.json(
        { error: "Invalid date/time format" },
        { status: 400 }
      );
    }

    // Calculate end time
    if (endTime) {
      end = new Date(endTime);
    } else {
      // Default duration: 30 min for reminders, 60 min for events
      const durationMs = (duration || (isReminder ? 30 : 60)) * 60 * 1000;
      end = new Date(start.getTime() + durationMs);
    }

    // Build relations
    const relations: Record<string, unknown> = {};
    if (clientId) {
      relations.Clients = { connect: [{ id: clientId }] };
    }
    if (propertyId) {
      relations.Properties = { connect: [{ id: propertyId }] };
    }

    // Generate IDs
    const friendlyEventId = await generateFriendlyId(prismadb, "CalendarEvent");
    const calendarEventId = Math.abs(Math.floor(Date.now() / 1000));

    // Create event
    const event = await prismadb.CalendarEvent.create({
      data: {
        id: friendlyEventId,
        calendarEventId,
        calendarUserId: 0,
        organizationId,
        title,
        description: description || null,
        startTime: start,
        endTime: end,
        location: location || null,
        status: "scheduled",
        eventType: eventType || (isReminder ? "reminder" : "meeting"),
        assignedUserId: userId,
        updatedAt: new Date(),
        ...relations,
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        eventType: true,
        location: true,
        createdAt: true,
      },
    });

    // Format response with locale-aware date
    const formattedDate = event.startTime.toLocaleDateString("el-GR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const formattedTime = event.startTime.toLocaleTimeString("el-GR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        type: event.eventType,
        location: event.location,
        formattedDate,
        formattedTime,
        createdAt: event.createdAt.toISOString(),
      },
      message: isReminder
        ? `Reminder "${event.title}" set for ${formattedDate} at ${formattedTime}`
        : `Event "${event.title}" scheduled for ${formattedDate} at ${formattedTime}`,
    });
  } catch (error) {
    console.error("[VOICE_CREATE_EVENT]", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}

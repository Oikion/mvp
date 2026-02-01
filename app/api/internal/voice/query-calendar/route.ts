import { NextRequest, NextResponse } from "next/server";
import { getInternalApiContext } from "@/lib/internal-api-auth";
import { prismadb } from "@/lib/prisma";

/**
 * POST /api/internal/voice/query-calendar
 * Internal API for voice assistant to query calendar events
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getInternalApiContext(request);

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, organizationId, isAdminTest } = context;

    // Return mock data for admin testing
    if (isAdminTest) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return NextResponse.json({
        success: true,
        events: [
          {
            id: "test-event-1",
            title: "Property Viewing - Glyfada Apartment",
            description: "Show apartment to client Maria",
            startTime: new Date(now.setHours(14, 0, 0, 0)).toISOString(),
            endTime: new Date(now.setHours(15, 0, 0, 0)).toISOString(),
            dateFormatted: now.toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" }),
            timeFormatted: "14:00 - 15:00",
            location: "Glyfada",
            status: "scheduled",
            type: "viewing",
            linkedClients: [{ id: "test-client-1", name: "Maria Papadopoulou" }],
            linkedProperties: [{ id: "test-prop-1", name: "Test Apartment in Glyfada" }],
          },
          {
            id: "test-event-2",
            title: "Call with Nikos",
            description: "Follow-up call",
            startTime: new Date(tomorrow.setHours(10, 0, 0, 0)).toISOString(),
            endTime: new Date(tomorrow.setHours(10, 30, 0, 0)).toISOString(),
            dateFormatted: tomorrow.toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" }),
            timeFormatted: "10:00 - 10:30",
            location: null,
            status: "scheduled",
            type: "call",
            linkedClients: [{ id: "test-client-2", name: "Nikos Georgiadis" }],
            linkedProperties: [],
          },
        ],
        count: 2,
        message: "You have 2 events (test mode)",
        _testMode: true,
      });
    }

    const body = await request.json();
    const {
      date,
      startDate,
      endDate,
      eventType,
      search,
      upcoming,
      today,
      tomorrow,
      thisWeek,
      limit = 10,
    } = body;

    // Build where clause
    const where: Record<string, unknown> = {
      organizationId,
      assignedUserId: userId, // Only show user's own events
    };

    // Date filters
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

    if (today) {
      where.startTime = {
        gte: startOfDay(now),
        lte: endOfDay(now),
      };
    } else if (tomorrow) {
      const tomorrowDate = new Date(now);
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      where.startTime = {
        gte: startOfDay(tomorrowDate),
        lte: endOfDay(tomorrowDate),
      };
    } else if (thisWeek) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);
      where.startTime = {
        gte: now,
        lte: weekEnd,
      };
    } else if (upcoming) {
      where.startTime = { gte: now };
    } else if (date) {
      const targetDate = new Date(date);
      where.startTime = {
        gte: startOfDay(targetDate),
        lte: endOfDay(targetDate),
      };
    } else if (startDate || endDate) {
      where.startTime = {};
      if (startDate) (where.startTime as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.startTime as Record<string, Date>).lte = new Date(endDate);
    }

    if (eventType) {
      where.eventType = eventType;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ];
    }

    // Fetch events
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
        Clients: {
          select: { id: true, client_name: true },
        },
        Properties: {
          select: { id: true, property_name: true },
        },
      },
    });

    // Format events for voice output
    const formatEventTime = (event: { startTime: Date; endTime: Date }) => {
      const dateStr = event.startTime.toLocaleDateString("el-GR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      const timeStr = event.startTime.toLocaleTimeString("el-GR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const endTimeStr = event.endTime.toLocaleTimeString("el-GR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return { dateStr, timeStr, endTimeStr };
    };

    const formattedEvents = events.map((event) => {
      const { dateStr, timeStr, endTimeStr } = formatEventTime(event);
      return {
        id: event.id,
        title: event.title,
        description: event.description,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        dateFormatted: dateStr,
        timeFormatted: `${timeStr} - ${endTimeStr}`,
        location: event.location,
        status: event.status,
        type: event.eventType,
        linkedClients: event.Clients?.map((c) => ({ id: c.id, name: c.client_name })) || [],
        linkedProperties: event.Properties?.map((p) => ({ id: p.id, name: p.property_name })) || [],
      };
    });

    // Generate natural language summary
    let message: string;
    if (events.length === 0) {
      if (today) message = "You have no events scheduled for today";
      else if (tomorrow) message = "You have no events scheduled for tomorrow";
      else if (thisWeek) message = "You have no events scheduled this week";
      else message = "No events found matching your criteria";
    } else if (events.length === 1) {
      const evt = formattedEvents[0];
      message = `You have 1 event: "${evt.title}" on ${evt.dateFormatted} at ${evt.timeFormatted}`;
    } else {
      message = `You have ${events.length} events`;
      if (today) message += " today";
      else if (tomorrow) message += " tomorrow";
      else if (thisWeek) message += " this week";
    }

    return NextResponse.json({
      success: true,
      events: formattedEvents,
      count: events.length,
      message,
    });
  } catch (error) {
    console.error("[VOICE_QUERY_CALENDAR]", error);
    return NextResponse.json(
      { error: "Failed to query calendar" },
      { status: 500 }
    );
  }
}

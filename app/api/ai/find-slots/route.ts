import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { 
  parseISO, 
  addDays, 
  setHours, 
  setMinutes, 
  isBefore, 
  isAfter, 
  addMinutes,
  format,
  eachDayOfInterval,
} from "date-fns";

/**
 * POST /api/ai/find-slots
 * Find available time slots in the calendar
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (!user || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      startDate, 
      endDate, 
      durationMinutes = 60,
      preferredTimeStart = "09:00",
      preferredTimeEnd = "18:00",
    } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const start = parseISO(startDate);
    const end = parseISO(endDate);

    // Parse preferred times
    const [startHour, startMin] = preferredTimeStart.split(":").map(Number);
    const [endHour, endMin] = preferredTimeEnd.split(":").map(Number);

    // Get existing events in the date range
    const events = await prismadb.calendarEvent.findMany({
      where: {
        organizationId,
        OR: [
          { assignedUserId: user.id },
          { 
            EventInvitee: {
              some: { userId: user.id },
            },
          },
        ],
        startTime: { gte: start },
        endTime: { lte: addDays(end, 1) },
        status: { not: "CANCELLED" },
      },
      orderBy: { startTime: "asc" },
    });

    // Generate available slots
    const availableSlots: Array<{
      date: string;
      start: string;
      end: string;
      duration: number;
    }> = [];

    const days = eachDayOfInterval({ start, end });

    for (const day of days) {
      // Skip weekends (optional - could be configurable)
      const dayOfWeek = day.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      // Set working hours for this day
      let slotStart = setMinutes(setHours(day, startHour), startMin);
      const dayEnd = setMinutes(setHours(day, endHour), endMin);

      // Get events for this day
      const dayEvents = events.filter((e) => {
        const eventStart = new Date(e.startTime);
        return format(eventStart, "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
      });

      // Find gaps between events
      for (const event of dayEvents) {
        const eventStart = new Date(event.startTime);
        const eventEnd = new Date(event.endTime);

        // If there's a gap before this event
        if (isBefore(slotStart, eventStart)) {
          const gapEnd = eventStart;
          const gapDuration = (gapEnd.getTime() - slotStart.getTime()) / (1000 * 60);

          if (gapDuration >= durationMinutes) {
            availableSlots.push({
              date: format(day, "yyyy-MM-dd"),
              start: format(slotStart, "HH:mm"),
              end: format(addMinutes(slotStart, durationMinutes), "HH:mm"),
              duration: durationMinutes,
            });
          }
        }

        // Move slot start to after this event
        if (isAfter(eventEnd, slotStart)) {
          slotStart = eventEnd;
        }
      }

      // Check for slot after last event
      if (isBefore(slotStart, dayEnd)) {
        const gapDuration = (dayEnd.getTime() - slotStart.getTime()) / (1000 * 60);

        if (gapDuration >= durationMinutes) {
          availableSlots.push({
            date: format(day, "yyyy-MM-dd"),
            start: format(slotStart, "HH:mm"),
            end: format(addMinutes(slotStart, durationMinutes), "HH:mm"),
            duration: durationMinutes,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      query: {
        startDate,
        endDate,
        durationMinutes,
        preferredTimeStart,
        preferredTimeEnd,
      },
      slots: availableSlots.slice(0, 20), // Limit results
      total: availableSlots.length,
    });
  } catch (error) {
    console.error("[AI_FIND_SLOTS]", error);
    return NextResponse.json(
      { error: "Failed to find available slots" },
      { status: 500 }
    );
  }
}

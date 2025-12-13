import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import {
  createRemindersForEvent,
  sendReminderNotification,
  cancelReminder,
  cancelAllRemindersForEvent,
} from "@/lib/calendar-reminders";
import { canManageReminders } from "@/lib/calendar-permissions";

/**
 * GET /api/calendar/reminders
 * List reminders (filtered by org/user)
 */
export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const currentOrgId = await getCurrentOrgIdSafe();

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const status = searchParams.get("status");

    const where: any = {
      organizationId: currentOrgId,
    };

    if (eventId) {
      where.eventId = eventId;
    }

    if (status) {
      where.status = status;
    }

    const reminders = await prismadb.calendarReminder.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            assignedUserId: true,
          },
        },
      },
      orderBy: {
        scheduledFor: "asc",
      },
    });

    return NextResponse.json({ reminders });
  } catch (error: any) {
    console.error("[CALENDAR_REMINDERS_GET]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch reminders" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/reminders
 * Create reminder for event
 */
export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const currentOrgId = await getCurrentOrgIdSafe();
    const body = await req.json();

    const { eventId, reminderMinutes } = body;

    if (!eventId || !reminderMinutes || !Array.isArray(reminderMinutes)) {
      return NextResponse.json(
        { error: "Missing required fields: eventId, reminderMinutes" },
        { status: 400 }
      );
    }

    // Check permissions
    const canManage = await canManageReminders(eventId);
    if (!canManage) {
      return NextResponse.json(
        { error: "Unauthorized to manage reminders for this event" },
        { status: 403 }
      );
    }

    // Verify event exists and belongs to org
    const event = await prismadb.calComEvent.findUnique({
      where: { id: eventId },
    });

    if (!event || event.organizationId !== currentOrgId) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Create reminders
    await createRemindersForEvent(eventId, reminderMinutes, currentOrgId);

    return NextResponse.json(
      { message: "Reminders created successfully" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[CALENDAR_REMINDERS_POST]", error);
    return NextResponse.json(
      { error: error.message || "Failed to create reminders" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/reminders/send-test
 * Test reminder email
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { reminderId } = body;

    if (!reminderId) {
      return NextResponse.json(
        { error: "Missing required field: reminderId" },
        { status: 400 }
      );
    }

    // Check permissions
    const reminder = await prismadb.calendarReminder.findUnique({
      where: { id: reminderId },
      include: {
        event: true,
      },
    });

    if (!reminder) {
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 }
      );
    }

    const canManage = await canManageReminders(reminder.eventId);
    if (!canManage) {
      return NextResponse.json(
        { error: "Unauthorized to manage this reminder" },
        { status: 403 }
      );
    }

    // Send test notification
    await sendReminderNotification(reminderId);

    return NextResponse.json({
      message: "Test reminder sent successfully",
    });
  } catch (error: any) {
    console.error("[CALENDAR_REMINDERS_SEND_TEST]", error);
    return NextResponse.json(
      { error: error.message || "Failed to send test reminder" },
      { status: 500 }
    );
  }
}












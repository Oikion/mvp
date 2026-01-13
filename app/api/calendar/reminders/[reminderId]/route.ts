import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { cancelReminder } from "@/lib/calendar-reminders";
import { canManageReminders } from "@/lib/calendar-permissions";

/**
 * PUT /api/calendar/reminders/[reminderId]
 * Update reminder
 */
export async function PUT(
  req: Request,
  props: { params: Promise<{ reminderId: string }> }
) {
  try {
    const { reminderId } = await props.params;
    const body = await req.json();

    const reminder = await prismadb.calendarReminder.findUnique({
      where: { id: reminderId },
      include: {
        CalComEvent: true,
      },
    });

    if (!reminder) {
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const canManage = await canManageReminders(reminder.eventId);
    if (!canManage) {
      return NextResponse.json(
        { error: "Unauthorized to manage this reminder" },
        { status: 403 }
      );
    }

    // Update reminder (currently only supports rescheduling)
    const { scheduledFor, reminderMinutes } = body;

    const updateData: any = {};
    if (scheduledFor) {
      updateData.scheduledFor = new Date(scheduledFor);
    }
    if (reminderMinutes !== undefined) {
      updateData.reminderMinutes = reminderMinutes;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const updated = await prismadb.calendarReminder.update({
      where: { id: reminderId },
      data: updateData,
    });

    return NextResponse.json({ reminder: updated });
  } catch (error: any) {
    console.error("[CALENDAR_REMINDERS_UPDATE]", error);
    return NextResponse.json(
      { error: error.message || "Failed to update reminder" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendar/reminders/[reminderId]
 * Cancel reminder
 */
export async function DELETE(
  req: Request,
  props: { params: Promise<{ reminderId: string }> }
) {
  try {
    const { reminderId } = await props.params;

    const reminder = await prismadb.calendarReminder.findUnique({
      where: { id: reminderId },
      include: {
        CalComEvent: true,
      },
    });

    if (!reminder) {
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const canManage = await canManageReminders(reminder.eventId);
    if (!canManage) {
      return NextResponse.json(
        { error: "Unauthorized to manage this reminder" },
        { status: 403 }
      );
    }

    await cancelReminder(reminderId);

    return NextResponse.json({
      message: "Reminder cancelled successfully",
    });
  } catch (error: any) {
    console.error("[CALENDAR_REMINDERS_DELETE]", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel reminder" },
      { status: 500 }
    );
  }
}




















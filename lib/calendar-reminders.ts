/**
 * Calendar Reminder Service
 * Handles creation, scheduling, and sending of calendar reminders
 */

import { prismadb } from "./prisma";
import resendHelper from "./resend";
import CalendarReminderEmail from "@/emails/CalendarReminder";
import { createNotification } from "@/lib/notifications";

/**
 * Get user notification settings, with defaults if not found
 */
async function getUserNotificationSettings(userId: string) {
  const settings = await prismadb.userNotificationSettings.findUnique({
    where: { userId },
  });

  // Return settings with defaults if not found
  return {
    calendarEmailEnabled: settings?.calendarEmailEnabled ?? true,
    calendarInAppEnabled: settings?.calendarInAppEnabled ?? true,
  };
}

export interface ReminderConfig {
  eventId: string;
  reminderMinutes: number[];
  organizationId: string;
}

/**
 * Create reminder records for an event
 */
export async function createRemindersForEvent(
  eventId: string,
  reminderMinutes: number[],
  organizationId: string
): Promise<void> {
  const event = await prismadb.calComEvent.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  // Delete existing pending reminders for this event
  await prismadb.calendarReminder.deleteMany({
    where: {
      eventId,
      status: "PENDING",
    },
  });

  // Create new reminder records
  const reminders = reminderMinutes.map((minutes) => {
    const scheduledFor = new Date(event.startTime);
    scheduledFor.setMinutes(scheduledFor.getMinutes() - minutes);

    return {
      eventId,
      reminderMinutes: minutes,
      scheduledFor,
      status: "PENDING" as const,
      notificationType: "EMAIL" as const,
      organizationId,
    };
  });

  await prismadb.calendarReminder.createMany({
    data: reminders,
  });
}

/**
 * Get upcoming reminders that need to be sent
 */
export async function getUpcomingReminders(
  organizationId: string,
  minutesAhead: number = 5
): Promise<any[]> {
  const now = new Date();
  const futureTime = new Date(now.getTime() + minutesAhead * 60 * 1000);

  return await prismadb.calendarReminder.findMany({
    where: {
      organizationId,
      status: "PENDING",
      scheduledFor: {
        lte: futureTime,
        gte: now,
      },
    },
    include: {
      event: {
        include: {
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              userLanguage: true,
            },
          },
          linkedClients: {
            select: {
              id: true,
              client_name: true,
            },
          },
          linkedProperties: {
            select: {
              id: true,
              property_name: true,
            },
          },
        },
      },
    },
    orderBy: {
      scheduledFor: "asc",
    },
  });
}

/**
 * Send a reminder notification
 */
export async function sendReminderNotification(
  reminderId: string
): Promise<void> {
  const reminder = await prismadb.calendarReminder.findUnique({
    where: { id: reminderId },
    include: {
      event: {
        include: {
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              userLanguage: true,
            },
          },
          linkedClients: {
            select: {
              id: true,
              client_name: true,
            },
          },
          linkedProperties: {
            select: {
              id: true,
              property_name: true,
            },
          },
        },
      },
    },
  });

  if (!reminder) {
    throw new Error("Reminder not found");
  }

  if (reminder.status !== "PENDING") {
    throw new Error(`Reminder already ${reminder.status}`);
  }

  const event = reminder.event;
  const user = event.assignedUser;

  if (!user || !user.email) {
    throw new Error("Event has no assigned user with email");
  }

  // Check user notification settings
  const notificationSettings = await getUserNotificationSettings(user.id);

  try {
    // Determine reminder time label
    const minutesLabel =
      reminder.reminderMinutes >= 1440
        ? `${Math.floor(reminder.reminderMinutes / 1440)} day(s)`
        : reminder.reminderMinutes >= 60
        ? `${Math.floor(reminder.reminderMinutes / 60)} hour(s)`
        : `${reminder.reminderMinutes} minute(s)`;

    // Send email notification only if user has email notifications enabled
    if (notificationSettings.calendarEmailEnabled) {
      const resend = await resendHelper();

      await resend.emails.send({
        from:
          process.env.NEXT_PUBLIC_APP_NAME +
          " <" +
          process.env.EMAIL_FROM +
          ">",
        to: user.email,
        subject:
          user.userLanguage === "el"
            ? `Υπενθύμιση: ${event.title || "Συμβάν"} σε ${minutesLabel}`
            : `Reminder: ${event.title || "Event"} in ${minutesLabel}`,
        text: "",
        react: CalendarReminderEmail({
          eventTitle: event.title || "Untitled Event",
          eventDescription: event.description || "",
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location || "",
          reminderMinutes: reminder.reminderMinutes,
          minutesLabel,
          linkedClients: event.linkedClients,
          linkedProperties: event.linkedProperties,
          userLanguage: user.userLanguage || "en",
          eventUrl: `${process.env.NEXT_PUBLIC_APP_URL}/calendar`,
        }),
      });
    }

    // Create in-app notification only if user has in-app notifications enabled
    if (notificationSettings.calendarInAppEnabled) {
      try {
        await createNotification({
          userId: user.id,
          organizationId: reminder.organizationId,
          type: "CALENDAR_REMINDER",
          title: `Reminder: ${event.title || "Event"} in ${minutesLabel}`,
          message: `Your event "${event.title || "Untitled Event"}" starts ${minutesLabel} from now.${event.location ? ` Location: ${event.location}` : ""}`,
          entityType: "CALENDAR_EVENT",
          entityId: event.id,
          metadata: {
            eventTitle: event.title || "Untitled Event",
            startTime: event.startTime.toISOString(),
            endTime: event.endTime.toISOString(),
            location: event.location || "",
            reminderMinutes: reminder.reminderMinutes,
            minutesLabel,
          },
        });
      } catch {
        // Don't fail the reminder if notification creation fails
      }
    }

    // Mark reminder as sent
    await markReminderSent(reminderId);
  } catch (error) {
    // Mark as failed
    await prismadb.calendarReminder.update({
      where: { id: reminderId },
      data: {
        status: "FAILED",
      },
    });

    throw error;
  }
}

/**
 * Mark a reminder as sent
 */
export async function markReminderSent(reminderId: string): Promise<void> {
  await prismadb.calendarReminder.update({
    where: { id: reminderId },
    data: {
      status: "SENT",
      sentAt: new Date(),
    },
  });
}

/**
 * Cancel a reminder
 */
export async function cancelReminder(reminderId: string): Promise<void> {
  await prismadb.calendarReminder.update({
    where: { id: reminderId },
    data: {
      status: "CANCELLED",
    },
  });
}

/**
 * Cancel all reminders for an event
 */
export async function cancelAllRemindersForEvent(
  eventId: string
): Promise<void> {
  await prismadb.calendarReminder.updateMany({
    where: {
      eventId,
      status: "PENDING",
    },
    data: {
      status: "CANCELLED",
    },
  });
}


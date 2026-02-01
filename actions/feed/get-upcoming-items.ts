"use server";

import { getCurrentOrgIdSafe, getCurrentUserSafe } from "@/lib/get-current-user";
import { prismaForOrg } from "@/lib/tenant";
import { prismadb } from "@/lib/prisma";
import { startOfDay, endOfDay, addDays, isToday, isTomorrow, isThisWeek } from "date-fns";

export interface UpcomingItem {
  id: string;
  type: "event" | "task" | "reminder";
  title: string;
  description?: string;
  datetime: string;
  endDatetime?: string;
  location?: string;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  status?: string;
  linkedEntity?: {
    type: "property" | "client";
    id: string;
    name: string;
  };
  isOverdue?: boolean;
  isToday?: boolean;
  isTomorrow?: boolean;
  isThisWeek?: boolean;
}

export async function getUpcomingItems(): Promise<{
  today: UpcomingItem[];
  tomorrow: UpcomingItem[];
  thisWeek: UpcomingItem[];
  overdue: UpcomingItem[];
}> {
  const orgId = await getCurrentOrgIdSafe();
  const currentUser = await getCurrentUserSafe();
  
  if (!orgId || !currentUser) {
    return { today: [], tomorrow: [], thisWeek: [], overdue: [] };
  }

  const prisma = prismaForOrg(orgId);
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const tomorrowStart = startOfDay(addDays(now, 1));
  const tomorrowEnd = endOfDay(addDays(now, 1));
  const weekEnd = endOfDay(addDays(now, 7));

  const items: UpcomingItem[] = [];

  // Fetch upcoming calendar events
  try {
    const events = await prismadb.calendarEvent.findMany({
      where: {
        organizationId: orgId,
        startTime: {
          gte: startOfDay(addDays(now, -7)), // Include recent past for overdue
          lte: weekEnd,
        },
      },
      orderBy: { startTime: "asc" },
      include: {
        Clients: {
          select: { id: true, client_name: true },
          take: 1,
        },
        Properties: {
          select: { id: true, property_name: true },
          take: 1,
        },
      },
    });

    for (const event of events) {
      const eventDate = new Date(event.startTime);
      const isEventOverdue = eventDate < now && event.status !== "completed";
      
      let linkedEntity: UpcomingItem["linkedEntity"] = undefined;
      if (event.Properties?.[0]) {
        linkedEntity = {
          type: "property",
          id: event.Properties[0].id,
          name: event.Properties[0].property_name || "Property",
        };
      } else if (event.Clients?.[0]) {
        linkedEntity = {
          type: "client",
          id: event.Clients[0].id,
          name: event.Clients[0].client_name || "Client",
        };
      }

      items.push({
        id: `event-${event.id}`,
        type: "event",
        title: event.title || "Untitled Event",
        description: event.description || undefined,
        datetime: event.startTime.toISOString(),
        endDatetime: event.endTime?.toISOString(),
        location: event.location || undefined,
        status: event.status || undefined,
        linkedEntity,
        isOverdue: isEventOverdue,
        isToday: isToday(eventDate),
        isTomorrow: isTomorrow(eventDate),
        isThisWeek: isThisWeek(eventDate),
      });
    }
  } catch (error) {
    // CalendarEvent might not exist yet, skip silently
  }

  // Fetch upcoming tasks
  try {
    const tasks = await prisma.crm_Accounts_Tasks.findMany({
      where: {
        dueDateAt: {
          gte: startOfDay(addDays(now, -7)), // Include recent past for overdue
          lte: weekEnd,
        },
      },
      orderBy: { dueDateAt: "asc" },
      include: {
        Clients: {
          select: { id: true, client_name: true },
        },
      },
    });

    for (const task of tasks) {
      if (!task.dueDateAt) continue;
      
      const taskDate = new Date(task.dueDateAt);
      const isTaskOverdue = taskDate < now;

      let linkedEntity: UpcomingItem["linkedEntity"] = undefined;
      if (task.Clients) {
        linkedEntity = {
          type: "client",
          id: task.Clients.id,
          name: task.Clients.client_name || "Client",
        };
      }

      items.push({
        id: `task-${task.id}`,
        type: "task",
        title: task.title || "Untitled Task",
        description: task.content || undefined,
        datetime: task.dueDateAt.toISOString(),
        priority: task.priority as "HIGH" | "MEDIUM" | "LOW" | undefined,
        linkedEntity,
        isOverdue: isTaskOverdue,
        isToday: isToday(taskDate),
        isTomorrow: isTomorrow(taskDate),
        isThisWeek: isThisWeek(taskDate),
      });
    }
  } catch (error) {
    // Tasks might not exist yet, skip silently
  }

  // Fetch upcoming reminders
  try {
    const reminders = await prismadb.calendarReminder.findMany({
      where: {
        organizationId: orgId,
        scheduledFor: {
          gte: startOfDay(addDays(now, -1)),
          lte: weekEnd,
        },
        status: "PENDING",
      },
      orderBy: { scheduledFor: "asc" },
      include: {
        CalendarEvent: {
          select: { title: true, startTime: true },
        },
      },
    });

    for (const reminder of reminders) {
      const reminderDate = new Date(reminder.scheduledFor);
      const isReminderOverdue = reminderDate < now;

      items.push({
        id: `reminder-${reminder.id}`,
        type: "reminder",
        title: `Reminder: ${reminder.CalendarEvent?.title || "Event"}`,
        description: reminder.CalendarEvent?.startTime 
          ? `Event starts at ${new Date(reminder.CalendarEvent.startTime).toLocaleTimeString()}`
          : undefined,
        datetime: reminder.scheduledFor.toISOString(),
        status: reminder.status,
        isOverdue: isReminderOverdue,
        isToday: isToday(reminderDate),
        isTomorrow: isTomorrow(reminderDate),
        isThisWeek: isThisWeek(reminderDate),
      });
    }
  } catch (error) {
    // Reminders might not exist yet, skip silently
  }

  // Sort and categorize
  const sortedItems = items.sort((a, b) => 
    new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  );

  return {
    overdue: sortedItems.filter(i => i.isOverdue && !i.isToday),
    today: sortedItems.filter(i => i.isToday && !i.isOverdue),
    tomorrow: sortedItems.filter(i => i.isTomorrow),
    thisWeek: sortedItems.filter(i => i.isThisWeek && !i.isToday && !i.isTomorrow && !i.isOverdue),
  };
}
















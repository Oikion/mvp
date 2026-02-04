import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/get-current-user';
import { prismadb } from '@/lib/prisma';
import {
  canSyncTasksToCalendar,
  canEditTask,
} from '@/lib/calendar-permissions';

/**
 * POST /api/calendar/tasks/sync
 * Link a task to a calendar event (admins or task owner)
 */
export async function POST(req: Request) {
  try {
    await getCurrentUser(); // Verify authentication
    const body = await req.json();
    const { taskId, eventId } = body;

    if (!taskId || !eventId) {
      return NextResponse.json(
        { error: 'taskId and eventId are required' },
        { status: 400 }
      );
    }

    // Check permissions
    const hasPermission = await canSyncTasksToCalendar(taskId);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Unauthorized to sync this task' },
        { status: 403 }
      );
    }

    // Verify event exists
    const event = await prismadb.calendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Calendar event not found' },
        { status: 404 }
      );
    }

    // Link task to calendar event
    await prismadb.crm_Accounts_Tasks.update({
      where: { id: taskId },
      data: {
        calendarEventId: eventId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[CALENDAR_TASKS_SYNC_POST]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync task to calendar' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/calendar/tasks/sync
 * Get calendar events linked to tasks
 */
export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');
    const userId = searchParams.get('userId');

    if (taskId) {
      // Get event for specific task
      const task = await prismadb.crm_Accounts_Tasks.findUnique({
        where: { id: taskId },
        include: {
          CalendarEvent: true,
        },
      });

      if (!task) {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }

      // Check permissions
      const hasPermission = await canEditTask(taskId);
      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }

      return NextResponse.json({ event: task.CalendarEvent });
    }

    // Get all tasks with calendar events
    const where: any = {
      calendarEventId: { not: null },
    };

    if (userId) {
      // Check permissions
      if (userId !== currentUser.id) {
        if (!currentUser.is_account_admin && !currentUser.is_admin) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          );
        }
      }
      where.user = userId;
    } else if (!currentUser.is_account_admin && !currentUser.is_admin) {
      // Show current user's tasks only if not admin
      where.user = currentUser.id;
    }

    const tasks = await prismadb.crm_Accounts_Tasks.findMany({
      where,
      include: {
        CalendarEvent: true,
        Users: {
          select: { id: true, name: true, email: true },
        },
        Clients: {
          select: { id: true, client_name: true },
        },
      },
      orderBy: { dueDateAt: 'asc' },
    });

    return NextResponse.json({ tasks });
  } catch (error: any) {
    console.error('[CALENDAR_TASKS_SYNC_GET]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch task calendar events' },
      { status: 500 }
    );
  }
}


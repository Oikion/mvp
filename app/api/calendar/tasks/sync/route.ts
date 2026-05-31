import { NextResponse } from 'next/server';
import { getCurrentUser, getCurrentOrgIdSafe } from '@/lib/get-current-user';
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
    const organizationId = await getCurrentOrgIdSafe();
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
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

    // Verify event exists AND belongs to the caller's org (prevent linking a
    // task to a cross-org calendar event).
    const event = await prismadb.calendarEvent.findFirst({
      where: { id: eventId, organizationId },
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
      { error: 'Failed to sync task to calendar' },
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
    const organizationId = await getCurrentOrgIdSafe();
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');
    const userId = searchParams.get('userId');

    if (taskId) {
      // Get event for specific task (org-scoped)
      const task = await prismadb.crm_Accounts_Tasks.findFirst({
        where: { id: taskId, organizationId },
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

    // Get all tasks with calendar events — ALWAYS scoped to the caller's org
    // (without this, an admin with no userId filter would receive tasks from
    // every organization).
    const where: any = {
      calendarEventId: { not: null },
      organizationId,
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
      },
      orderBy: { dueDateAt: 'asc' },
    });

    return NextResponse.json({ tasks });
  } catch (error: any) {
    console.error('[CALENDAR_TASKS_SYNC_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch task calendar events' },
      { status: 500 }
    );
  }
}


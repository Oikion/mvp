import { NextResponse } from 'next/server';
import { prismadb } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/get-current-user';
import { getCurrentOrgIdSafe } from '@/lib/get-current-user';
import {
  canViewCalendar,
  canCreateEvent,
} from '@/lib/calendar-permissions';

/**
 * GET /api/calendar/events
 * Fetch calendar events from database (filtered by org/user, role-based)
 */
export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const currentOrgId = await getCurrentOrgIdSafe();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const includeTasks = searchParams.get('includeTasks') === 'true';

    // Check permissions
    const hasPermission = await canViewCalendar(
      userId || undefined,
      currentOrgId || undefined
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Unauthorized to view this calendar' },
        { status: 403 }
      );
    }

    // Determine target user ID for querying
    const targetUserId = (userId && (currentUser.is_account_admin || currentUser.is_admin)) 
      ? userId 
      : currentUser.id;

    // Fetch events from database
    const eventWhere: any = {
      organizationId: currentOrgId,
      ...(startTime && endTime
        ? {
            startTime: {
              gte: new Date(startTime),
              lte: new Date(endTime),
            },
          }
        : {}),
    };

    const events = await prismadb.calComEvent.findMany({
      where: eventWhere,
      include: {
        linkedTasks: {
          include: {
            assigned_user: {
              select: { id: true, name: true, email: true },
            },
            crm_accounts: {
              select: { id: true, client_name: true },
            },
          },
        },
        linkedClients: {
          select: { id: true, client_name: true },
        },
        linkedProperties: {
          select: { id: true, property_name: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // If includeTasks is true, also fetch tasks that should appear on calendar
    let tasks: any[] = [];
    if (includeTasks) {
      const taskWhere: any = {
        dueDateAt: { not: null },
      };

      if (userId && (currentUser.is_account_admin || currentUser.is_admin)) {
        taskWhere.user = userId;
      } else {
        taskWhere.user = currentUser.id;
      }

      if (startTime && endTime) {
        taskWhere.dueDateAt = {
          gte: new Date(startTime),
          lte: new Date(endTime),
        };
      }

      tasks = await prismadb.crm_Accounts_Tasks.findMany({
        where: taskWhere,
        include: {
          assigned_user: {
            select: { id: true, name: true, email: true },
          },
          crm_accounts: {
            select: { id: true, client_name: true },
          },
        },
        orderBy: { dueDateAt: 'asc' },
      });
    }

    // Transform database events to match CalendarEvent interface
    const transformedEvents = events.map((event) => ({
      id: event.calcomEventId,
      title: event.title || 'Untitled Event',
      description: event.description || undefined,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      location: event.location || undefined,
      status: event.status || undefined,
    }));

    return NextResponse.json({
      events: transformedEvents,
      tasks,
    });
  } catch (error: any) {
    console.error('[CALENDAR_EVENTS_GET]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/events
 * Create a calendar event (role check: admins can create for any user)
 */
export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const body = await req.json();

    const {
      title,
      description,
      startTime,
      endTime,
      location,
      userId: targetUserId,
      clientId,
      propertyId,
    } = body;

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: title, startTime, endTime' },
        { status: 400 }
      );
    }

    // Check permissions
    const hasPermission = await canCreateEvent(targetUserId);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Unauthorized to create events for this user' },
        { status: 403 }
      );
    }

    // Determine target user
    const userId = targetUserId || currentUser.id;
    const organizationId = await getCurrentOrgIdSafe();

    // Generate a unique event ID (using timestamp in seconds)
    const eventId = Math.abs(Math.floor(Date.now() / 1000));

    // Create event in database
    const event = await prismadb.calComEvent.create({
      data: {
        calcomEventId: eventId,
        calcomUserId: 0, // Not using Cal.com anymore
        organizationId,
        title,
        description: description || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location: location || null,
        status: 'scheduled',
        ...(clientId && {
          linkedClients: {
            connect: { id: clientId },
          },
        }),
        ...(propertyId && {
          linkedProperties: {
            connect: { id: propertyId },
          },
        }),
      },
    });

    return NextResponse.json({ 
      event,
      message: 'Event created successfully'
    }, { status: 201 });
  } catch (error: any) {
    console.error('[CALENDAR_EVENTS_POST]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create calendar event' },
      { status: 500 }
    );
  }
}

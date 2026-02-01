import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { prismadb } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/get-current-user';
import { getCurrentOrgIdSafe } from '@/lib/get-current-user';
import {
  canViewCalendar,
  canCreateEvent,
} from '@/lib/calendar-permissions';
import { createRemindersForEvent } from '@/lib/calendar-reminders';
import { prismaForOrg } from '@/lib/tenant';
import { format } from 'date-fns';
import { generateFriendlyId } from '@/lib/friendly-id';
import { dispatchCalendarWebhook } from '@/lib/webhooks';

/**
 * Create notifications for calendar event creation
 */
async function createEventNotifications(
  event: any,
  organizationId: string,
  creatorId: string,
  creatorName: string,
  clientIds?: string[],
  propertyIds?: string[]
) {
  try {
    const db = prismaForOrg(organizationId);
    const eventDate = format(new Date(event.startTime), 'PPp');
    
    // Build notification message with linked entities
    const linkedEntities: string[] = [];
    
    // Get client names if linked
    if (clientIds && clientIds.length > 0) {
      const clients = await prismadb.clients.findMany({
        where: { id: { in: clientIds } },
        select: { client_name: true },
      });
      if (clients.length > 0) {
        linkedEntities.push(`Clients: ${clients.map(c => c.client_name).join(', ')}`);
      }
    }
    
    // Get property names if linked
    if (propertyIds && propertyIds.length > 0) {
      const properties = await prismadb.properties.findMany({
        where: { id: { in: propertyIds } },
        select: { property_name: true },
      });
      if (properties.length > 0) {
        linkedEntities.push(`Properties: ${properties.map(p => p.property_name).join(', ')}`);
      }
    }
    
    const linkedInfo = linkedEntities.length > 0 
      ? ` | ${linkedEntities.join(' | ')}`
      : '';
    
    // Create notification for the assigned user (if different from creator)
    if (event.assignedUserId && event.assignedUserId !== creatorId) {
      await db.notification.create({
        data: {
          id: randomUUID(),
          userId: event.assignedUserId,
          organizationId,
          type: 'CALENDAR_EVENT_CREATED',
          title: `New Event: ${event.title}`,
          message: `${creatorName} created "${event.title}" scheduled for ${eventDate}${linkedInfo}`,
          entityType: 'CALENDAR_EVENT',
          entityId: event.id,
          metadata: {
            eventTitle: event.title,
            eventDate: event.startTime,
            createdBy: creatorId,
            createdByName: creatorName,
            linkedClients: clientIds || [],
            linkedProperties: propertyIds || [],
          },
          updatedAt: new Date(),
        },
      });
    }
    
    // If there are linked clients, notify their assigned agents (if they have one)
    if (clientIds && clientIds.length > 0) {
      const clients = await prismadb.clients.findMany({
        where: { id: { in: clientIds } },
        select: { assigned_to: true, client_name: true },
      });
      
      const agentIds = Array.from(new Set(
        clients
          .filter(c => c.assigned_to && c.assigned_to !== creatorId && c.assigned_to !== event.assignedUserId)
          .map(c => c.assigned_to!)
      ));
      
      for (const agentId of agentIds) {
        const linkedClientNames = clients
          .filter(c => c.assigned_to === agentId)
          .map(c => c.client_name)
          .join(', ');
          
        await db.notification.create({
          data: {
            id: randomUUID(),
            userId: agentId,
            organizationId,
            type: 'CALENDAR_EVENT_CREATED',
            title: `Event for your client: ${event.title}`,
            message: `${creatorName} created "${event.title}" linked to your client(s): ${linkedClientNames}. Scheduled for ${eventDate}`,
            entityType: 'CALENDAR_EVENT',
            entityId: event.id,
            metadata: {
              eventTitle: event.title,
              eventDate: event.startTime,
              createdBy: creatorId,
              createdByName: creatorName,
              linkedClients: clientIds,
            },
            updatedAt: new Date(),
          },
        });
      }
    }
    
  } catch (error) {
    console.error('[CREATE_EVENT_NOTIFICATIONS]', error);
    // Don't throw - notifications are non-critical
  }
}

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

    const events = await prismadb.calendarEvent.findMany({
      where: eventWhere,
      include: {
        crm_Accounts_Tasks: {
          include: {
            Users: {
              select: { id: true, name: true, email: true },
            },
            Clients: {
              select: { id: true, client_name: true },
            },
          },
        },
        Clients: {
          select: { id: true, client_name: true },
        },
        Properties: {
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
          Users: {
            select: { id: true, name: true, email: true },
          },
          Clients: {
            select: { id: true, client_name: true },
          },
        },
        orderBy: { dueDateAt: 'asc' },
      });
    }

    // Transform database events to match CalendarEvent interface
    const transformedEvents = events.map((event) => ({
      id: event.calendarEventId,
      eventId: event.id, // Include the database ID for navigation
      title: event.title || 'Untitled Event',
      description: event.description || undefined,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      location: event.location || undefined,
      status: event.status || undefined,
      eventType: event.eventType || undefined,
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
      clientIds,
      propertyIds,
      documentIds,
      taskIds,
      eventType,
      assignedUserId,
      reminderMinutes,
      recurrenceRule,
    } = body;

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: title, startTime, endTime' },
        { status: 400 }
      );
    }

    // Check permissions
    const hasPermission = await canCreateEvent(targetUserId || assignedUserId);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Unauthorized to create events for this user' },
        { status: 403 }
      );
    }

    // Determine target user
    const userId = targetUserId || assignedUserId || currentUser.id;
    const organizationId = await getCurrentOrgIdSafe();

    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate a unique event ID (using timestamp in seconds)
    const eventId = Math.abs(Math.floor(Date.now() / 1000));

    // Build relations using correct Prisma relation names
    const relations: any = {};
    
    if (clientIds && Array.isArray(clientIds) && clientIds.length > 0) {
      relations.Clients = {
        connect: clientIds.map((id: string) => ({ id })),
      };
    }

    if (propertyIds && Array.isArray(propertyIds) && propertyIds.length > 0) {
      relations.Properties = {
        connect: propertyIds.map((id: string) => ({ id })),
      };
    }

    if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
      relations.Documents = {
        connect: documentIds.map((id: string) => ({ id })),
      };
    }

    if (taskIds && Array.isArray(taskIds) && taskIds.length > 0) {
      relations.crm_Accounts_Tasks = {
        connect: taskIds.map((id: string) => ({ id })),
      };
    }

    // Generate friendly ID for the event
    const friendlyEventId = await generateFriendlyId(prismadb, "CalendarEvent");

    // Create event in database
    const event = await prismadb.calendarEvent.create({
      data: {
        id: friendlyEventId,
        calendarEventId: eventId,
        calendarUserId: 0, // Legacy field maintained for backwards compatibility
        organizationId,
        title,
        description: description || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        updatedAt: new Date(),
        location: location || null,
        status: 'scheduled',
        eventType: eventType || null,
        assignedUserId: assignedUserId || userId || null,
        reminderMinutes: reminderMinutes && Array.isArray(reminderMinutes) ? reminderMinutes : [],
        recurrenceRule: recurrenceRule || null,
        ...relations,
      },
    });

    // Create reminders if specified
    if (reminderMinutes && Array.isArray(reminderMinutes) && reminderMinutes.length > 0) {
      await createRemindersForEvent(event.id, reminderMinutes, organizationId);
    }

    // Create notifications for linked entities (async, non-blocking)
    createEventNotifications(
      event,
      organizationId,
      currentUser.id,
      currentUser.name || currentUser.email,
      clientIds,
      propertyIds
    ).catch(err => console.error('[EVENT_NOTIFICATIONS_ERROR]', err));

    // Dispatch webhook for external integrations
    dispatchCalendarWebhook(organizationId, 'calendar.event.created', event).catch(console.error);

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

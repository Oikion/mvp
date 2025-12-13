import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import {
  canEditEvent,
  canDeleteEvent,
} from "@/lib/calendar-permissions";
import {
  createRemindersForEvent,
  cancelAllRemindersForEvent,
} from "@/lib/calendar-reminders";
import { prismaForOrg } from "@/lib/tenant";
import { format } from "date-fns";

/**
 * Create notifications for calendar event update
 */
async function createUpdateNotifications(
  event: any,
  organizationId: string,
  updaterId: string,
  updaterName: string
) {
  try {
    const db = prismaForOrg(organizationId);
    const eventDate = format(new Date(event.startTime), "PPp");
    
    // Notify assigned user if different from updater
    if (event.assignedUserId && event.assignedUserId !== updaterId) {
      await db.notification.create({
        data: {
          id: randomUUID(),
          userId: event.assignedUserId,
          organizationId,
          type: "CALENDAR_EVENT_UPDATED",
          title: `Event Updated: ${event.title}`,
          message: `${updaterName} updated "${event.title}" scheduled for ${eventDate}`,
          entityType: "CALENDAR_EVENT",
          entityId: event.id,
          metadata: {
            eventTitle: event.title,
            eventDate: event.startTime,
            updatedBy: updaterId,
            updatedByName: updaterName,
          },
        },
      });
    }
  } catch (error) {
    console.error("[CREATE_UPDATE_NOTIFICATIONS]", error);
  }
}

/**
 * Create notifications for calendar event cancellation
 */
async function createCancellationNotifications(
  event: any,
  organizationId: string,
  cancellerId: string,
  cancellerName: string
) {
  try {
    const db = prismaForOrg(organizationId);
    const eventDate = format(new Date(event.startTime), "PPp");
    
    // Notify assigned user if different from canceller
    if (event.assignedUserId && event.assignedUserId !== cancellerId) {
      await db.notification.create({
        data: {
          id: randomUUID(),
          userId: event.assignedUserId,
          organizationId,
          type: "CALENDAR_EVENT_CANCELLED",
          title: `Event Cancelled: ${event.title}`,
          message: `${cancellerName} cancelled "${event.title}" that was scheduled for ${eventDate}`,
          entityType: "CALENDAR_EVENT",
          entityId: event.id,
          metadata: {
            eventTitle: event.title,
            eventDate: event.startTime,
            cancelledBy: cancellerId,
            cancelledByName: cancellerName,
          },
        },
      });
    }
    
    // Notify linked client agents
    if (event.linkedClients && event.linkedClients.length > 0) {
      const clientIds = event.linkedClients.map((c: any) => c.id);
      const clients = await prismadb.clients.findMany({
        where: { id: { in: clientIds } },
        select: { assigned_to: true, client_name: true },
      });
      
      const agentIds = new Set(
        clients
          .filter((c) => c.assigned_to && c.assigned_to !== cancellerId && c.assigned_to !== event.assignedUserId)
          .map((c) => c.assigned_to!)
      );
      
      for (const agentId of Array.from(agentIds)) {
        await db.notification.create({
          data: {
            id: randomUUID(),
            userId: agentId,
            organizationId,
            type: "CALENDAR_EVENT_CANCELLED",
            title: `Event Cancelled: ${event.title}`,
            message: `${cancellerName} cancelled "${event.title}" linked to your client(s)`,
            entityType: "CALENDAR_EVENT",
            entityId: event.id,
            metadata: {
              eventTitle: event.title,
              eventDate: event.startTime,
              cancelledBy: cancellerId,
              cancelledByName: cancellerName,
            },
          },
        });
      }
    }
  } catch (error) {
    console.error("[CREATE_CANCELLATION_NOTIFICATIONS]", error);
  }
}

/**
 * GET /api/calendar/events/[eventId]
 * Get single event with all relations
 */
export async function GET(
  req: Request,
  props: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await props.params;
    const currentOrgId = await getCurrentOrgIdSafe();

    if (!currentOrgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const event = await prismadb.calComEvent.findFirst({
      where: {
        id: eventId,
        organizationId: currentOrgId,
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
        linkedDocuments: {
          select: {
            id: true,
            document_name: true,
            document_file_url: true,
          },
        },
        reminders: {
          orderBy: {
            scheduledFor: "asc",
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ event });
  } catch (error: any) {
    console.error("[CALENDAR_EVENTS_GET]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch event" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/calendar/events/[eventId]
 * Update event
 */
export async function PUT(
  req: Request,
  props: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await props.params;
    const currentUser = await getCurrentUser();
    const currentOrgId = await getCurrentOrgIdSafe();
    const body = await req.json();

    if (!currentOrgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    const canEdit = await canEditEvent(eventId);
    if (!canEdit) {
      return NextResponse.json(
        { error: "Unauthorized to edit this event" },
        { status: 403 }
      );
    }

    // Verify event exists and belongs to org
    const existingEvent = await prismadb.calComEvent.findFirst({
      where: {
        id: eventId,
        organizationId: currentOrgId,
      },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const {
      title,
      description,
      startTime,
      endTime,
      location,
      status,
      eventType,
      assignedUserId,
      clientIds,
      propertyIds,
      documentIds,
      taskIds,
      reminderMinutes,
    } = body;

    // Build update data
    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (location !== undefined) updateData.location = location;
    if (status !== undefined) updateData.status = status;
    if (eventType !== undefined) updateData.eventType = eventType;
    if (assignedUserId !== undefined) updateData.assignedUserId = assignedUserId;

    // Handle relations
    const connectDisconnect: any = {};

    if (clientIds !== undefined) {
      connectDisconnect.linkedClients = {
        set: clientIds.map((id: string) => ({ id })),
      };
    }

    if (propertyIds !== undefined) {
      connectDisconnect.linkedProperties = {
        set: propertyIds.map((id: string) => ({ id })),
      };
    }

    if (documentIds !== undefined) {
      connectDisconnect.linkedDocuments = {
        set: documentIds.map((id: string) => ({ id })),
      };
    }

    if (taskIds !== undefined) {
      connectDisconnect.linkedTasks = {
        set: taskIds.map((id: string) => ({ id })),
      };
    }

    // Update event
    const event = await prismadb.calComEvent.update({
      where: { id: eventId },
      data: {
        ...updateData,
        ...connectDisconnect,
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        linkedTasks: true,
        linkedClients: true,
        linkedProperties: true,
        linkedDocuments: true,
        reminders: true,
      },
    });

    // Handle reminders
    if (reminderMinutes !== undefined && Array.isArray(reminderMinutes)) {
      // Cancel existing reminders
      await cancelAllRemindersForEvent(eventId);
      // Create new reminders
      if (reminderMinutes.length > 0) {
        await createRemindersForEvent(
          eventId,
          reminderMinutes,
          currentOrgId
        );
      }
    }

    // Create notifications for event update (async, non-blocking)
    createUpdateNotifications(
      event,
      currentOrgId,
      currentUser.id,
      currentUser.name || currentUser.email
    ).catch((err) => console.error("[UPDATE_NOTIFICATIONS_ERROR]", err));

    return NextResponse.json({
      event,
      message: "Event updated successfully",
    });
  } catch (error: any) {
    console.error("[CALENDAR_EVENTS_PUT]", error);
    return NextResponse.json(
      { error: error.message || "Failed to update event" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendar/events/[eventId]
 * Delete event
 */
export async function DELETE(
  req: Request,
  props: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await props.params;
    const currentUser = await getCurrentUser();
    const currentOrgId = await getCurrentOrgIdSafe();

    if (!currentOrgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    const canDelete = await canDeleteEvent(eventId);
    if (!canDelete) {
      return NextResponse.json(
        { error: "Unauthorized to delete this event" },
        { status: 403 }
      );
    }

    // Verify event exists and belongs to org, include relations for notifications
    const event = await prismadb.calComEvent.findFirst({
      where: {
        id: eventId,
        organizationId: currentOrgId,
      },
      include: {
        linkedClients: {
          select: { id: true, client_name: true },
        },
        linkedProperties: {
          select: { id: true, property_name: true },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Create cancellation notifications before deleting (async, non-blocking)
    createCancellationNotifications(
      event,
      currentOrgId,
      currentUser.id,
      currentUser.name || currentUser.email
    ).catch((err) => console.error("[CANCELLATION_NOTIFICATIONS_ERROR]", err));

    // Cancel all reminders (they will be cascade deleted, but cancel them first)
    await cancelAllRemindersForEvent(eventId);

    // Delete event (reminders cascade delete)
    await prismadb.calComEvent.delete({
      where: { id: eventId },
    });

    return NextResponse.json({
      message: "Event deleted successfully",
    });
  } catch (error: any) {
    console.error("[CALENDAR_EVENTS_DELETE]", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete event" },
      { status: 500 }
    );
  }
}






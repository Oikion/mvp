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
import { requireCanModify, checkAssignedToChange } from "@/lib/permissions/guards";

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
          updatedAt: new Date(),
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
          updatedAt: new Date(),
        },
      });
    }
    
    // Notify linked client agents
    if (event.Clients && event.Clients.length > 0) {
      const clientIds = event.Clients.map((c: any) => c.id);
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
            updatedAt: new Date(),
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

    const event = await prismadb.calendarEvent.findFirst({
      where: {
        id: eventId,
        organizationId: currentOrgId,
      },
      include: {
        Users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
        Documents: {
          select: {
            id: true,
            document_name: true,
            document_file_url: true,
          },
        },
        CalendarReminder: {
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
    // Permission check: Viewers cannot edit events
    const permissionError = await requireCanModify();
    if (permissionError) return permissionError;

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
    const existingEvent = await prismadb.calendarEvent.findFirst({
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

    // Permission check: Members cannot change assigned user
    const assignedToError = await checkAssignedToChange(
      { assigned_to: body.assignedUserId },
      existingEvent.assignedUserId
    );
    if (assignedToError) return assignedToError;

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

    // Handle relations using correct Prisma relation names
    // Validate that all IDs exist before attempting to connect them
    const connectDisconnect: any = {};

    if (clientIds !== undefined) {
      if (Array.isArray(clientIds) && clientIds.length > 0) {
        // Validate client IDs exist
        const validClients = await prismadb.clients.findMany({
          where: {
            id: { in: clientIds },
            organizationId: currentOrgId,
          },
          select: { id: true },
        });
        
        connectDisconnect.Clients = {
          set: validClients.map((client) => ({ id: client.id })),
        };
      } else {
        // Clear all clients if empty array
        connectDisconnect.Clients = { set: [] };
      }
    }

    if (propertyIds !== undefined) {
      if (Array.isArray(propertyIds) && propertyIds.length > 0) {
        // Validate property IDs exist
        const validProperties = await prismadb.properties.findMany({
          where: {
            id: { in: propertyIds },
            organizationId: currentOrgId,
          },
          select: { id: true },
        });
        
        connectDisconnect.Properties = {
          set: validProperties.map((property) => ({ id: property.id })),
        };
      } else {
        // Clear all properties if empty array
        connectDisconnect.Properties = { set: [] };
      }
    }

    if (documentIds !== undefined) {
      if (Array.isArray(documentIds) && documentIds.length > 0) {
        // Validate document IDs exist
        const validDocuments = await prismadb.documents.findMany({
          where: {
            id: { in: documentIds },
            organizationId: currentOrgId,
          },
          select: { id: true },
        });
        
        connectDisconnect.Documents = {
          set: validDocuments.map((doc) => ({ id: doc.id })),
        };
      } else {
        // Clear all documents if empty array
        connectDisconnect.Documents = { set: [] };
      }
    }

    if (taskIds !== undefined) {
      if (Array.isArray(taskIds) && taskIds.length > 0) {
        // Validate task IDs exist
        const validTasks = await prismadb.crm_Accounts_Tasks.findMany({
          where: {
            id: { in: taskIds },
            organizationId: currentOrgId,
          },
          select: { id: true },
        });
        
        connectDisconnect.crm_Accounts_Tasks = {
          set: validTasks.map((task) => ({ id: task.id })),
        };
      } else {
        // Clear all tasks if empty array
        connectDisconnect.crm_Accounts_Tasks = { set: [] };
      }
    }

    // Update event
    const event = await prismadb.calendarEvent.update({
      where: { id: eventId },
      data: {
        ...updateData,
        ...connectDisconnect,
        updatedAt: new Date(),
      },
      include: {
        Users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        crm_Accounts_Tasks: true,
        Clients: true,
        Properties: true,
        Documents: true,
        CalendarReminder: true,
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
    const event = await prismadb.calendarEvent.findFirst({
      where: {
        id: eventId,
        organizationId: currentOrgId,
      },
      include: {
        Clients: {
          select: { id: true, client_name: true },
        },
        Properties: {
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
    await prismadb.calendarEvent.delete({
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






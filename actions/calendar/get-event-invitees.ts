"use server";

import { prismaForOrg } from "@/lib/tenant";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";

export interface EventInviteeData {
  id: string;
  userId: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "TENTATIVE";
  respondedAt: Date | null;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
}

export async function getEventInvitees(eventId: string): Promise<EventInviteeData[]> {
  try {
    // Check permission to read calendar events
    const guard = await requireAction("calendar:read");
    if (guard) return [];

    const organizationId = await getCurrentOrgId();
    const prismaTenant = prismaForOrg(organizationId);

    const invitees = await prismaTenant.eventInvitee.findMany({
      where: {
        eventId,
        organizationId,
      },
      include: {
        Users: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return invitees.map((inv) => ({
      id: inv.id,
      userId: inv.userId,
      status: inv.status,
      respondedAt: inv.respondedAt,
      createdAt: inv.createdAt,
      user: inv.Users,
    }));
  } catch (error) {
    console.error("[GET_EVENT_INVITEES]", error);
    throw error;
  }
}

/**
 * Get events where the current user is invited
 */
export async function getInvitedEvents(status?: "PENDING" | "ACCEPTED" | "DECLINED" | "TENTATIVE") {
  try {
    const organizationId = await getCurrentOrgId();
    const prismaTenant = prismaForOrg(organizationId);
    
    // We need to get the current user ID first
    const { getCurrentUser } = await import("@/lib/get-current-user");
    const currentUser = await getCurrentUser();

    const invitations = await prismaTenant.eventInvitee.findMany({
      where: {
        userId: currentUser.id,
        organizationId,
        ...(status ? { status } : {}),
      },
      include: {
        CalendarEvent: {
          include: {
            Users: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
            Clients: {
              select: {
                id: true,
                client_name: true,
              },
            },
            Properties: {
              select: {
                id: true,
                property_name: true,
              },
            },
          },
        },
      },
      orderBy: {
        CalComEvent: {
          startTime: "asc",
        },
      },
    });

    return invitations.map((inv) => ({
      invitationId: inv.id,
      status: inv.status,
      respondedAt: inv.respondedAt,
      event: {
        id: inv.CalendarEvent.id,
        title: inv.CalendarEvent.title,
        description: inv.CalendarEvent.description,
        startTime: inv.CalendarEvent.startTime,
        endTime: inv.CalendarEvent.endTime,
        location: inv.CalendarEvent.location,
        eventType: inv.CalendarEvent.eventType,
        assignedUser: inv.CalendarEvent.Users,
        linkedClients: inv.CalendarEvent.Clients,
        linkedProperties: inv.CalendarEvent.Properties,
      },
    }));
  } catch (error) {
    console.error("[GET_INVITED_EVENTS]", error);
    throw error;
  }
}

/**
 * Get pending invitation count for the current user
 */
export async function getPendingInvitationCount(): Promise<number> {
  try {
    const organizationId = await getCurrentOrgId();
    const prismaTenant = prismaForOrg(organizationId);
    
    const { getCurrentUser } = await import("@/lib/get-current-user");
    const currentUser = await getCurrentUser();

    const count = await prismaTenant.eventInvitee.count({
      where: {
        userId: currentUser.id,
        organizationId,
        status: "PENDING",
      },
    });

    return count;
  } catch (error) {
    console.error("[GET_PENDING_INVITATION_COUNT]", error);
    return 0;
  }
}








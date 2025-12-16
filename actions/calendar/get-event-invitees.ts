"use server";

import { prismaForOrg } from "@/lib/tenant";
import { getCurrentOrgId } from "@/lib/get-current-user";

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
    const organizationId = await getCurrentOrgId();
    const prismaTenant = prismaForOrg(organizationId);

    const invitees = await prismaTenant.eventInvitee.findMany({
      where: {
        eventId,
        organizationId,
      },
      include: {
        user: {
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
      user: inv.user,
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
        event: {
          include: {
            assignedUser: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
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
        event: {
          startTime: "asc",
        },
      },
    });

    return invitations.map((inv) => ({
      invitationId: inv.id,
      status: inv.status,
      respondedAt: inv.respondedAt,
      event: {
        id: inv.event.id,
        title: inv.event.title,
        description: inv.event.description,
        startTime: inv.event.startTime,
        endTime: inv.event.endTime,
        location: inv.event.location,
        eventType: inv.event.eventType,
        assignedUser: inv.event.assignedUser,
        linkedClients: inv.event.linkedClients,
        linkedProperties: inv.event.linkedProperties,
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


// @ts-nocheck
"use server";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe, getCurrentUser } from "@/lib/get-current-user";
import { decryptCalendarEventForOrg, decryptContactForOrg } from "@/lib/model-encryption";

export interface UpcomingEvent {
  id: string;
  friendlyId: string;
  title: string | null;
  description: string | null;
  startTime: Date;
  endTime: Date;
  location: string | null;
  eventType: string | null;
  assignedUser: {
    id: string;
    name: string | null;
    avatar: string | null;
  } | null;
  clients: Array<{ id: string; name: string }>;
  properties: Array<{ id: string; name: string }>;
}

export const getUpcomingEvents = async (limit: number = 5): Promise<UpcomingEvent[]> => {
  const organizationId = await getCurrentOrgIdSafe();
  
  // Return empty array if no organization context
  if (!organizationId) {
    return [];
  }

  let currentUser;
  try {
    currentUser = await getCurrentUser();
  } catch {
    return [];
  }

  const now = new Date();

  const events = await prismadb.calendarEvent.findMany({
    where: {
      organizationId,
      startTime: {
        gte: now,
      },
      // Filter for events assigned to current user or where they are an invitee
      OR: [
        { assignedUserId: currentUser.id },
        {
          EventInvitee: {
            some: {
              userId: currentUser.id,
              status: { in: ["PENDING", "ACCEPTED"] },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      friendlyId: true,
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      location: true,
      eventType: true,
      Users: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
      Contacts: {
        select: {
          id: true,
          displayName: true,
        },
      },
      Properties: {
        select: {
          id: true,
          property_name: true,
        },
      },
    },
    orderBy: {
      startTime: "asc",
    },
    take: limit,
  });

  // Decrypt event fields and linked entity names
  return Promise.all(
    events.map(async (event) => {
      const dec = await decryptCalendarEventForOrg(event, organizationId);
      // Decrypt linked client names
      const clients = await Promise.all(
        event.Contacts.map(async (c) => {
          const dc = await decryptContactForOrg(c, organizationId);
          return { id: dc.id, name: dc.displayName };
        })
      );
      return {
        id: dec.id,
        friendlyId: dec.friendlyId,
        title: dec.title,
        description: dec.description,
        startTime: dec.startTime,
        endTime: dec.endTime,
        location: dec.location,
        eventType: dec.eventType,
        assignedUser: dec.Users
          ? {
              id: dec.Users.id,
              name: dec.Users.name,
              avatar: dec.Users.avatar,
            }
          : null,
        clients,
        properties: event.Properties.map((p) => ({ id: p.id, name: p.property_name })),
      };
    })
  );
};

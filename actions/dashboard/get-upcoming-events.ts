import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe, getCurrentUser } from "@/lib/get-current-user";

export interface UpcomingEvent {
  id: string;
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
    orderBy: {
      startTime: "asc",
    },
    take: limit,
  });

  return events.map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    startTime: event.startTime,
    endTime: event.endTime,
    location: event.location,
    eventType: event.eventType,
    assignedUser: event.Users
      ? {
          id: event.Users.id,
          name: event.Users.name,
          avatar: event.Users.avatar,
        }
      : null,
    clients: event.Clients.map((c) => ({ id: c.id, name: c.client_name })),
    properties: event.Properties.map((p) => ({ id: p.id, name: p.property_name })),
  }));
};

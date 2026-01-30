import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";

export interface MentionOption {
  id: string;
  name: string;
  type: "client" | "property" | "event" | "task";
}

export async function getMentionOptions(): Promise<{
  clients: MentionOption[];
  properties: MentionOption[];
  events: MentionOption[];
  tasks: MentionOption[];
}> {
  const organizationId = await getCurrentOrgId();

  const [clients, properties, events, tasks] = await Promise.all([
    // Clients
    prismadb.clients.findMany({
      where: { organizationId },
      select: {
        id: true,
        client_name: true,
      },
      orderBy: {
        client_name: "asc",
      },
      take: 1000,
    }),

    // Properties
    prismadb.properties.findMany({
      where: { organizationId },
      select: {
        id: true,
        property_name: true,
      },
      orderBy: {
        property_name: "asc",
      },
      take: 1000,
    }),

    // Calendar Events
    prismadb.calComEvent.findMany({
      where: { organizationId },
      select: {
        id: true,
        title: true,
      },
      orderBy: {
        startTime: "desc",
      },
      take: 500,
    }),

    // Tasks
    prismadb.crm_Accounts_Tasks.findMany({
      select: {
        id: true,
        title: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 500,
    }),
  ]);

  return {
    clients: clients.map((c) => ({
      id: c.id,
      name: c.client_name,
      type: "client" as const,
    })),
    properties: properties.map((p) => ({
      id: p.id,
      name: p.property_name,
      type: "property" as const,
    })),
    events: events
      .filter((e: any) => e.title)
      .map((e: any) => ({
        id: e.id,
        name: e.title || "",
        type: "event" as const,
      })),
    tasks: tasks.map((t) => ({
      id: t.id,
      name: t.title,
      type: "task" as const,
    })),
  };
}


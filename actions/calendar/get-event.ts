import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";

export async function getEvent(eventId: string) {
  const organizationId = await getCurrentOrgId();

  const event = await prismadb.calComEvent.findFirst({
    where: {
      id: eventId,
      organizationId,
    },
    include: {
      assignedUser: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
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
        select: { id: true, client_name: true, primary_email: true },
      },
      linkedProperties: {
        select: { id: true, property_name: true, address_street: true, address_city: true },
      },
      linkedDocuments: {
        select: {
          id: true,
          document_name: true,
          document_file_url: true,
          document_file_mimeType: true,
        },
      },
      reminders: {
        orderBy: {
          scheduledFor: "asc",
        },
      },
    },
  });

  return event;
}














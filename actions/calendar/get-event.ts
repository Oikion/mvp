import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";

export async function getEvent(eventId: string) {
  // Check permission to read calendar events
  const guard = await requireAction("calendar:read");
  if (guard) return null;

  const organizationId = await getCurrentOrgIdSafe();
  
  // Return null if no organization context (e.g., session not synced yet)
  if (!organizationId) {
    return null;
  }

  const event = await prismadb.calendarEvent.findFirst({
    where: {
      id: eventId,
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
        select: { id: true, client_name: true, primary_email: true },
      },
      Properties: {
        select: { id: true, property_name: true, address_street: true, address_city: true },
      },
      Documents: {
        select: {
          id: true,
          document_name: true,
          document_file_url: true,
          document_file_mimeType: true,
        },
      },
      CalendarReminder: {
        orderBy: {
          scheduledFor: "asc",
        },
      },
    },
  });

  return event;
}




















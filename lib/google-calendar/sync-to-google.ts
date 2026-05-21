import { google } from "googleapis";
import { prismadb } from "@/lib/prisma";
import { getAuthenticatedClient } from "./client";
import { decryptCalendarEventForOrg } from "@/lib/model-encryption";
import type { calendar_v3 } from "googleapis";

function toGoogleEvent(
  event: {
    title?: string | null;
    description?: string | null;
    startTime: Date;
    endTime: Date;
    location?: string | null;
    recurrenceRule?: string | null;
  },
  attendeeEmails: string[] = []
): calendar_v3.Schema$Event {
  return {
    summary: event.title ?? "(No title)",
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    start: { dateTime: event.startTime.toISOString(), timeZone: "UTC" },
    end: { dateTime: event.endTime.toISOString(), timeZone: "UTC" },
    ...(event.recurrenceRule
      ? { recurrence: [`RRULE:${event.recurrenceRule}`] }
      : {}),
    ...(attendeeEmails.length > 0
      ? { attendees: attendeeEmails.map((email) => ({ email })) }
      : {}),
    extendedProperties: {
      private: { oikionSource: "true" },
    },
  };
}

/**
 * Push an Oikion calendar event to Google Calendar.
 * Creates if no googleEventId exists; updates if it does.
 * Silently skips if the user has no active Google connection.
 */
export async function pushEventToGoogle(
  calendarEventId: string
): Promise<void> {
  const event = await prismadb.calendarEvent.findUnique({
    where: { id: calendarEventId },
    select: {
      id: true,
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      location: true,
      recurrenceRule: true,
      googleEventId: true,
      assignedUserId: true,
      organizationId: true,
      EventInvitee: {
        select: {
          Users: { select: { email: true } },
        },
      },
    },
  });

  if (!event?.assignedUserId) return;

  const oauth2Client = await getAuthenticatedClient(event.assignedUserId);
  if (!oauth2Client) return;

  // Decrypt encrypted fields (title, description, location) before sending to Google
  const decrypted = await decryptCalendarEventForOrg(event, event.organizationId);
  const attendeeEmails = event.EventInvitee
    .map((inv) => inv.Users?.email)
    .filter((e): e is string => !!e);
  const cal = google.calendar({ version: "v3", auth: oauth2Client });
  const googleEvent = toGoogleEvent(decrypted, attendeeEmails);

  try {
    if (event.googleEventId) {
      await cal.events.update({
        calendarId: "primary",
        eventId: event.googleEventId,
        requestBody: googleEvent,
        sendUpdates: "all",
      });
    } else {
      const res = await cal.events.insert({
        calendarId: "primary",
        requestBody: googleEvent,
        sendUpdates: "all",
      });
      if (res.data.id) {
        await prismadb.calendarEvent.update({
          where: { id: calendarEventId },
          data: { googleEventId: res.data.id },
        });
      }
    }

    await prismadb.userGoogleCalendarConnection.updateMany({
      where: { userId: event.assignedUserId },
      data: { lastSyncedAt: new Date() },
    });
  } catch (err) {
    console.error("[GOOGLE_CALENDAR_SYNC] pushEventToGoogle failed", err);
  }
}

/**
 * Delete the corresponding Google Calendar event when an Oikion event is archived/deleted.
 */
export async function deleteEventFromGoogle(
  calendarEventId: string
): Promise<void> {
  const event = await prismadb.calendarEvent.findUnique({
    where: { id: calendarEventId },
    select: { googleEventId: true, assignedUserId: true },
  });

  if (!event?.googleEventId || !event.assignedUserId) return;

  const oauth2Client = await getAuthenticatedClient(event.assignedUserId);
  if (!oauth2Client) return;

  const cal = google.calendar({ version: "v3", auth: oauth2Client });

  try {
    await cal.events.delete({
      calendarId: "primary",
      eventId: event.googleEventId,
    });
    await prismadb.calendarEvent.update({
      where: { id: calendarEventId },
      data: { googleEventId: null },
    });
  } catch (err: unknown) {
    // 410 Gone = already deleted on Google's side, safe to clear our reference
    if ((err as { code?: number }).code === 410) {
      await prismadb.calendarEvent.update({
        where: { id: calendarEventId },
        data: { googleEventId: null },
      });
      return;
    }
    console.error("[GOOGLE_CALENDAR_SYNC] deleteEventFromGoogle failed", err);
  }
}

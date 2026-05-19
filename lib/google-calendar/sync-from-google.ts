import { google } from "googleapis";
import { prismadb } from "@/lib/prisma";
import { getAuthenticatedClient } from "./client";
import { encryptCalendarEventForOrg } from "@/lib/model-encryption";
import { generateFriendlyId } from "@/lib/friendly-id";
import type { calendar_v3 } from "googleapis";

function parseGoogleEvent(gEvent: calendar_v3.Schema$Event) {
  const start = gEvent.start?.dateTime ?? gEvent.start?.date;
  const end = gEvent.end?.dateTime ?? gEvent.end?.date;
  return {
    title: gEvent.summary ?? null,
    description: gEvent.description ?? null,
    location: gEvent.location ?? null,
    startTime: start ? new Date(start) : null,
    endTime: end ? new Date(end) : null,
    recurrenceRule:
      gEvent.recurrence
        ?.find((r) => r.startsWith("RRULE:"))
        ?.replace("RRULE:", "") ?? null,
    googleUpdatedAt: gEvent.updated ? new Date(gEvent.updated) : null,
  };
}

/**
 * Pull a specific Google Calendar event into Oikion.
 * Upserts by googleEventId — never creates duplicates.
 * Skips update if Google's version is older than Oikion's.
 */
export async function pullEventFromGoogle(
  googleEventId: string,
  userId: string,
  organizationId: string
): Promise<void> {
  const oauth2Client = await getAuthenticatedClient(userId);
  if (!oauth2Client) return;

  const cal = google.calendar({ version: "v3", auth: oauth2Client });

  let gEvent: calendar_v3.Schema$Event;
  try {
    const res = await cal.events.get({
      calendarId: "primary",
      eventId: googleEventId,
    });
    gEvent = res.data;
  } catch (err: unknown) {
    // 404 = event deleted on Google — archive our copy
    if ((err as { code?: number }).code === 404) {
      await archiveEventByGoogleId(googleEventId);
    }
    return;
  }

  // Skip events we originally created from Oikion (prevent echo loops)
  if (gEvent.extendedProperties?.private?.oikionSource === "true") return;

  const parsed = parseGoogleEvent(gEvent);
  if (!parsed.startTime || !parsed.endTime) return;

  const existing = await prismadb.calendarEvent.findUnique({
    where: { googleEventId },
    select: { id: true, updatedAt: true },
  });

  // Oikion wins if our record is newer than Google's
  if (
    existing &&
    parsed.googleUpdatedAt &&
    existing.updatedAt >= parsed.googleUpdatedAt
  ) {
    return;
  }

  const user = await prismadb.users.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) return;

  // Encrypt plaintext fields from Google before persisting to the DB
  const encrypted = await encryptCalendarEventForOrg(
    { title: parsed.title, description: parsed.description, location: parsed.location },
    organizationId
  );

  if (existing) {
    await prismadb.calendarEvent.update({
      where: { googleEventId },
      data: {
        ...encrypted,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        recurrenceRule: parsed.recurrenceRule,
        updatedAt: new Date(),
      },
    });
  } else {
    // New event created in Google — create it in Oikion using the same ID patterns as the events API
    const friendlyId = await generateFriendlyId(prismadb, "CalendarEvent", organizationId);
    const calendarEventId = Math.abs(Math.floor(Date.now() / 1000));
    await prismadb.calendarEvent.create({
      data: {
        id: crypto.randomUUID(),
        friendlyId,
        calendarEventId,
        calendarUserId: 0,
        organizationId,
        assignedUserId: userId,
        googleEventId,
        ...encrypted,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        recurrenceRule: parsed.recurrenceRule,
        updatedAt: new Date(),
      },
    });
  }

  await prismadb.userGoogleCalendarConnection.updateMany({
    where: { userId },
    data: { lastSyncedAt: new Date() },
  });
}

async function archiveEventByGoogleId(googleEventId: string): Promise<void> {
  await prismadb.calendarEvent.updateMany({
    where: { googleEventId },
    data: { archivedAt: new Date(), googleEventId: null },
  });
}


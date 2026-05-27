import { google } from "googleapis";
import { prismadb } from "@/lib/prisma";
import { getAuthenticatedClient } from "./client";
import { encryptCalendarEventForOrg } from "@/lib/model-encryption";
import { generateFriendlyId } from "@/lib/friendly-id";
import { withGoogleRetry } from "./retry";
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
    const res = await withGoogleRetry(() =>
      cal.events.get({
        calendarId: "primary",
        eventId: googleEventId,
      })
    );
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
    select: { id: true, updatedAt: true, archivedAt: true },
  });

  if (existing?.archivedAt) {
    return; // Never resurrect a deliberately archived event
  }

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

  const friendlyId = existing
    ? undefined
    : await generateFriendlyId(prismadb, "CalendarEvent", organizationId);
  const calendarEventId = existing
    ? undefined
    : Math.abs(Math.floor(Date.now() / 1000));

  await prismadb.calendarEvent.upsert({
    where: { googleEventId },
    create: {
      id: crypto.randomUUID(),
      friendlyId: friendlyId!,
      calendarEventId: calendarEventId!,
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
    update: {
      ...encrypted,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      recurrenceRule: parsed.recurrenceRule,
      updatedAt: new Date(),
    },
  });

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

/**
 * Full sync: fetch all events in a rolling window from Google and upsert into Oikion.
 * Uses the list API (no per-event GET calls) for efficiency.
 * Called by the manual "Sync now" action from the banner.
 */
export async function syncAllEventsFromGoogle(
  userId: string,
  organizationId: string
): Promise<{ synced: number; deleted: number }> {
  const oauth2Client = await getAuthenticatedClient(userId);
  if (!oauth2Client) return { synced: 0, deleted: 0 };

  const cal = google.calendar({ version: "v3", auth: oauth2Client });

  // 90 days back → 1 year forward covers the practical calendar window
  const timeMin = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  let synced = 0;
  let deleted = 0;
  let pageToken: string | undefined;

  do {
    const res = await withGoogleRetry(() =>
      cal.events.list({
        calendarId: "primary",
        timeMin,
        timeMax,
        maxResults: 250,
        singleEvents: true,
        orderBy: "startTime",
        pageToken,
      })
    );

    const items = res.data.items ?? [];
    pageToken = res.data.nextPageToken ?? undefined;

    for (const item of items) {
      if (!item.id) continue;

      if (item.status === "cancelled") {
        await prismadb.calendarEvent.updateMany({
          where: { googleEventId: item.id },
          data: { archivedAt: new Date(), googleEventId: null },
        });
        deleted++;
        continue;
      }

      // Skip events we originally pushed from Oikion to avoid echo loops
      if (item.extendedProperties?.private?.oikionSource === "true") continue;

      const parsed = parseGoogleEvent(item);
      if (!parsed.startTime || !parsed.endTime) continue;

      const existing = await prismadb.calendarEvent.findUnique({
        where: { googleEventId: item.id },
        select: { id: true, updatedAt: true, archivedAt: true },
      });

      if (existing?.archivedAt) {
        continue; // Never resurrect a deliberately archived event
      }

      // Oikion wins if our record was touched after Google's last update
      if (existing && parsed.googleUpdatedAt && existing.updatedAt >= parsed.googleUpdatedAt) {
        continue;
      }

      const encrypted = await encryptCalendarEventForOrg(
        { title: parsed.title, description: parsed.description, location: parsed.location },
        organizationId
      );

      const itemFriendlyId = existing
        ? undefined
        : await generateFriendlyId(prismadb, "CalendarEvent", organizationId);
      const itemCalendarEventId = existing
        ? undefined
        : Math.abs(Math.floor(Date.now() / 1000));

      await prismadb.calendarEvent.upsert({
        where: { googleEventId: item.id },
        create: {
          id: crypto.randomUUID(),
          friendlyId: itemFriendlyId!,
          calendarEventId: itemCalendarEventId!,
          calendarUserId: 0,
          organizationId,
          assignedUserId: userId,
          googleEventId: item.id,
          ...encrypted,
          startTime: parsed.startTime,
          endTime: parsed.endTime,
          recurrenceRule: parsed.recurrenceRule,
          updatedAt: new Date(),
        },
        update: {
          ...encrypted,
          startTime: parsed.startTime,
          endTime: parsed.endTime,
          recurrenceRule: parsed.recurrenceRule,
          updatedAt: new Date(),
        },
      });
      synced++;
    }
  } while (pageToken);

  await prismadb.userGoogleCalendarConnection.updateMany({
    where: { userId },
    data: { lastSyncedAt: new Date() },
  });

  return { synced, deleted };
}


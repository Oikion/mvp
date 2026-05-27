import { NextRequest, NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { pullEventFromGoogle } from "@/lib/google-calendar/sync-from-google";
import { getAuthenticatedClient } from "@/lib/google-calendar/client";
import { google } from "googleapis";

/**
 * Receives Google Calendar push notifications.
 * Google sends a POST with headers identifying the channel and resource state.
 * Docs: https://developers.google.com/calendar/api/guides/push#receiving-notifications
 */
export async function POST(req: NextRequest) {
  const channelId = req.headers.get("x-goog-channel-id");
  const resourceState = req.headers.get("x-goog-resource-state");

  // "sync" is the initial handshake — acknowledge and ignore
  if (resourceState === "sync") {
    return NextResponse.json({ ok: true });
  }

  if (!channelId || !resourceState) {
    return NextResponse.json({ error: "Missing headers" }, { status: 400 });
  }

  // Look up which user this channel belongs to
  const conn = await prismadb.userGoogleCalendarConnection.findFirst({
    where: { watchChannelId: channelId },
    select: { userId: true, organizationId: true, watchChannelToken: true },
  });

  if (!conn) {
    // Unknown channel — may be from a previously disconnected account
    return NextResponse.json({ ok: true });
  }

  const channelToken = req.headers.get("x-goog-channel-token");
  if (!channelToken || conn.watchChannelToken !== channelToken) {
    return NextResponse.json({ ok: true });
  }

  if (resourceState === "not_exists") {
    // Resource deleted — nothing specific to do; individual event deletions
    // will surface when we next try to fetch them (404 → archive)
    return NextResponse.json({ ok: true });
  }

  if (resourceState !== "exists") {
    return NextResponse.json({ ok: true });
  }

  // Fetch the list of recently changed events and pull each one
  const oauth2Client = await getAuthenticatedClient(conn.userId);
  if (!oauth2Client) {
    return NextResponse.json({ ok: true });
  }

  try {
    const cal = google.calendar({ version: "v3", auth: oauth2Client });

    // Fetch events modified in the last hour — avoids needing a sync token column
    const updatedMin = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const res = await cal.events.list({
      calendarId: "primary",
      updatedMin,
      maxResults: 50,
      singleEvents: true,
    });

    const items = res.data.items ?? [];

    for (const item of items) {
      if (!item.id) continue;

      if (item.status === "cancelled") {
        // Event deleted in Google — archive in Oikion
        await prismadb.calendarEvent.updateMany({
          where: { googleEventId: item.id },
          data: { archivedAt: new Date(), googleEventId: null },
        });
      } else {
        await pullEventFromGoogle(item.id, conn.userId, conn.organizationId);
      }
    }
  } catch (err) {
    console.error("[GOOGLE_CALENDAR_WEBHOOK] Failed to process push notification", err);
    // Return 200 — Google will retry on non-2xx which could cause notification loops
  }

  return NextResponse.json({ ok: true });
}

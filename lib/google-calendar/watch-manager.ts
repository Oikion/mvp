import { google } from "googleapis";
import { prismadb } from "@/lib/prisma";
import { getAuthenticatedClient } from "./client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const WEBHOOK_URL = `${APP_URL}/api/webhooks/google-calendar`;

// Google Calendar watch channels last up to 7 days; we renew at 6 days to stay ahead
const CHANNEL_TTL_MS = 6 * 24 * 60 * 60 * 1000;

/**
 * Register a Google Calendar push notification channel for a user.
 * Stores the channel ID, resource ID, and expiry in the connection record.
 */
export async function registerWatchChannel(userId: string): Promise<void> {
  const oauth2Client = await getAuthenticatedClient(userId);
  if (!oauth2Client) return;

  const conn = await prismadb.userGoogleCalendarConnection.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!conn) return;

  const cal = google.calendar({ version: "v3", auth: oauth2Client });
  const channelId = crypto.randomUUID();
  const expiration = Date.now() + CHANNEL_TTL_MS;

  try {
    const res = await cal.events.watch({
      calendarId: "primary",
      requestBody: {
        id: channelId,
        type: "web_hook",
        address: WEBHOOK_URL,
        expiration: String(expiration),
      },
    });

    await prismadb.userGoogleCalendarConnection.update({
      where: { userId },
      data: {
        watchChannelId: res.data.id ?? channelId,
        watchResourceId: res.data.resourceId ?? null,
        watchExpiry: new Date(Number(res.data.expiration ?? expiration)),
      },
    });
  } catch (err) {
    // Watch registration failing doesn't break the OAuth flow — sync still works via pull
    console.error("[GOOGLE_CALENDAR_WATCH] registerWatchChannel failed", err);
  }
}

/**
 * Stop an existing watch channel. Called on disconnect.
 */
export async function stopWatchChannel(userId: string): Promise<void> {
  const conn = await prismadb.userGoogleCalendarConnection.findUnique({
    where: { userId },
    select: { watchChannelId: true, watchResourceId: true },
  });

  if (!conn?.watchChannelId || !conn.watchResourceId) return;

  const oauth2Client = await getAuthenticatedClient(userId);
  if (!oauth2Client) return;

  const cal = google.calendar({ version: "v3", auth: oauth2Client });

  try {
    await cal.channels.stop({
      requestBody: {
        id: conn.watchChannelId,
        resourceId: conn.watchResourceId,
      },
    });
  } catch (err) {
    console.error("[GOOGLE_CALENDAR_WATCH] stopWatchChannel failed", err);
  }
}

/**
 * Renew watch channels that expire within 24 hours.
 * Called by the daily cron job.
 */
export async function renewExpiringWatchChannels(): Promise<{
  renewed: number;
  failed: number;
}> {
  const cutoff = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const connections = await prismadb.userGoogleCalendarConnection.findMany({
    where: {
      status: "ACTIVE",
      syncEnabled: true,
      watchExpiry: { lte: cutoff },
    },
    select: { userId: true },
  });

  let renewed = 0;
  let failed = 0;

  for (const { userId } of connections) {
    try {
      await stopWatchChannel(userId);
      await registerWatchChannel(userId);
      renewed++;
    } catch {
      failed++;
    }
  }

  return { renewed, failed };
}

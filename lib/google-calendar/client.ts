import { google } from "googleapis";
import { prismadb } from "@/lib/prisma";
import { encrypt, decryptWithFallback } from "@/lib/encryption";
import { GoogleSyncStatus } from "@prisma/client";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const GOOGLE_REDIRECT_URI = `${APP_URL}/api/auth/google-calendar/callback`;

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function buildOAuthClient() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

export function buildOAuthUrl(state: string): string {
  const client = buildOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    state,
  });
}

/**
 * Returns an authenticated OAuth2 client for the given user.
 * Automatically refreshes an expired access token and persists the new token.
 * Sets connection status to NEEDS_REAUTH if refresh fails.
 */
export async function getAuthenticatedClient(userId: string) {
  const conn = await prismadb.userGoogleCalendarConnection.findUnique({
    where: { userId },
  });
  if (!conn) return null;

  const oauth2Client = buildOAuthClient();
  const accessToken = decryptWithFallback(conn.accessToken);
  const refreshToken = decryptWithFallback(conn.refreshToken);

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // Refresh if token expires within 5 minutes
  if (conn.tokenExpiresAt <= new Date(Date.now() + 5 * 60 * 1000)) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      const newAccessToken = credentials.access_token!;
      const newExpiry = new Date(credentials.expiry_date ?? Date.now() + 3600 * 1000);

      const updated = await prismadb.userGoogleCalendarConnection.updateMany({
        where: {
          userId,
          tokenExpiresAt: conn.tokenExpiresAt,
        },
        data: {
          accessToken: encrypt(newAccessToken),
          tokenExpiresAt: newExpiry,
          status: GoogleSyncStatus.ACTIVE,
        },
      });

      if (updated.count === 0) {
        // Another concurrent request already refreshed; re-fetch the fresh token
        const fresh = await prismadb.userGoogleCalendarConnection.findUnique({
          where: { userId },
          select: { accessToken: true, refreshToken: true },
        });
        if (!fresh) return null;
        oauth2Client.setCredentials({
          access_token: decryptWithFallback(fresh.accessToken),
          refresh_token: decryptWithFallback(fresh.refreshToken),
        });
        return oauth2Client;
      }

      oauth2Client.setCredentials({
        access_token: newAccessToken,
        refresh_token: refreshToken,
      });
    } catch {
      await prismadb.userGoogleCalendarConnection.update({
        where: { userId },
        data: { status: GoogleSyncStatus.NEEDS_REAUTH },
      });
      return null;
    }
  }

  return oauth2Client;
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { google } from "googleapis";
import { prismadb } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { buildOAuthClient } from "@/lib/google-calendar/client";
import { registerWatchChannel } from "@/lib/google-calendar/watch-manager";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const SAFE_RETURN_PREFIXES = [
  "/app/calendar",
  "/app/integrations",
  "/app/settings",
];

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(`${APP_URL}/sign-in`);
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieStore = await cookies();

  if (error || !code || !state) {
    console.error("[GOOGLE_CALENDAR_CALLBACK] OAuth error or missing params", { error });
    const returnTo = cookieStore.get("gcal_return_to")?.value ?? null;
    cookieStore.delete("gcal_return_to");
    const basePath =
      returnTo && SAFE_RETURN_PREFIXES.some((p) => returnTo.startsWith(p))
        ? returnTo
        : "/app/calendar";
    const dest = new URL(`${APP_URL}${basePath}`);
    dest.searchParams.set("error", "google_auth_failed");
    return NextResponse.redirect(dest.toString());
  }

  // Validate CSRF state cookie
  const savedState = cookieStore.get("gcal_oauth_state")?.value;
  cookieStore.delete("gcal_oauth_state");

  if (!savedState || savedState !== state) {
    const dest = new URL(`${APP_URL}/app/calendar`);
    dest.searchParams.set("error", "google_auth_failed");
    return NextResponse.redirect(dest.toString());
  }

  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) {
    const dest = new URL(`${APP_URL}/app/calendar`);
    dest.searchParams.set("error", "no_org");
    return NextResponse.redirect(dest.toString());
  }

  try {
    const oauth2Client = buildOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error("Missing tokens in Google response");
    }

    // Fetch the Google account email
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();
    const googleEmail = userInfo.email ?? "";

    const tokenExpiresAt = new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000);

    // Get our internal Users record from Clerk userId
    const user = await prismadb.users.findFirst({
      where: { clerkUserId: userId },
      select: { id: true },
    });
    if (!user) throw new Error("User not found");

    await prismadb.userGoogleCalendarConnection.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        organizationId,
        googleEmail,
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        tokenExpiresAt,
        status: "ACTIVE",
        syncEnabled: true,
      },
      update: {
        organizationId,
        googleEmail,
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        tokenExpiresAt,
        status: "ACTIVE",
        syncEnabled: true,
      },
    });

    // Register push notification channel (non-blocking — failure doesn't break the flow)
    registerWatchChannel(user.id).catch((err) => {
      console.error("[GOOGLE_CALENDAR_CALLBACK] registerWatchChannel failed", err);
    });

    // Redirect back to the page that initiated the connect flow, or fall back to calendar.
    const returnTo = cookieStore.get("gcal_return_to")?.value ?? null;
    cookieStore.delete("gcal_return_to");

    const basePath =
      returnTo && SAFE_RETURN_PREFIXES.some((p) => returnTo.startsWith(p))
        ? returnTo
        : "/app/calendar";

    const dest = new URL(`${APP_URL}${basePath}`);
    dest.searchParams.set("connected", "google");
    return NextResponse.redirect(dest.toString());
  } catch (err) {
    console.error("[GOOGLE_CALENDAR_CALLBACK] Failed to complete OAuth", err);
    const errDest = new URL(`${APP_URL}/app/calendar`);
    errDest.searchParams.set("error", "google_auth_failed");
    return NextResponse.redirect(errDest.toString());
  }
}

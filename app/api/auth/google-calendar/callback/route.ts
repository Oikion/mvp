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

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(`${APP_URL}/sign-in`);
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    console.error("[GOOGLE_CALENDAR_CALLBACK] OAuth error or missing params", { error });
    return NextResponse.redirect(`${APP_URL}/app/settings/integrations?error=google_auth_failed`);
  }

  // Validate CSRF state cookie
  const cookieStore = await cookies();
  const savedState = cookieStore.get("gcal_oauth_state")?.value;
  cookieStore.delete("gcal_oauth_state");

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${APP_URL}/app/settings/integrations?error=google_auth_failed`);
  }

  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) {
    return NextResponse.redirect(`${APP_URL}/app/settings/integrations?error=no_org`);
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

    return NextResponse.redirect(`${APP_URL}/app/settings/integrations?connected=google`);
  } catch (err) {
    console.error("[GOOGLE_CALENDAR_CALLBACK] Failed to complete OAuth", err);
    return NextResponse.redirect(`${APP_URL}/app/settings/integrations?error=google_auth_failed`);
  }
}

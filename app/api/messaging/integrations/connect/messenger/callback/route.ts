import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { MessagingPlatform } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { generateWebhookSecret } from "@/lib/webhooks";

const GRAPH_VERSION = "v18.0";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const messagesPath = "/app/messages";
  const redirectSuccess = baseUrl ? `${baseUrl}${messagesPath}?messenger=connected` : messagesPath;
  const redirectError = baseUrl ? `${baseUrl}${messagesPath}?messenger=error` : messagesPath;

  if (error === "access_denied" || error === "user_cancelled_oauth") {
    return NextResponse.redirect(redirectError);
  }

  if (!code) {
    return NextResponse.redirect(redirectError);
  }

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(redirectError);
    }

    const organizationId = await getCurrentOrgId();
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const redirectUri = baseUrl
      ? `${baseUrl}/api/messaging/integrations/connect/messenger/callback`
      : "";

    if (!appId || !appSecret || !redirectUri) {
      return NextResponse.redirect(redirectError);
    }

    const tokenUrl = `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${encodeURIComponent(code)}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = (await tokenRes.json().catch(() => null)) as {
      access_token?: string;
      error?: { message?: string };
    };

    if (!tokenRes.ok || !tokenData.access_token) {
      return NextResponse.redirect(redirectError);
    }

    const userAccessToken = tokenData.access_token;
    const accountsUrl = `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?access_token=${encodeURIComponent(userAccessToken)}`;
    const accountsRes = await fetch(accountsUrl);
    const accountsData = (await accountsRes.json().catch(() => null)) as {
      data?: Array<{ id: string; name?: string; access_token?: string }>;
      error?: { message?: string };
    };

    if (!accountsRes.ok || !accountsData.data?.length) {
      return NextResponse.redirect(redirectError);
    }

    const page = accountsData.data[0];
    const pageAccessToken = page.access_token;
    const pageId = page.id;
    const pageName = page.name ?? "Messenger";

    if (!pageAccessToken || !pageId) {
      return NextResponse.redirect(redirectError);
    }

    const webhookSecret = generateWebhookSecret();
    await prismadb.messagingIntegration.create({
      data: {
        organizationId,
        platform: MessagingPlatform.MESSENGER,
        displayName: pageName,
        accessToken: pageAccessToken,
        platformAccountId: pageId,
        webhookSecret,
      },
    });

    return NextResponse.redirect(redirectSuccess);
  } catch {
    return NextResponse.redirect(redirectError);
  }
}

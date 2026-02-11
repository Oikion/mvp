import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { MessagingPlatform } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { generateFriendlyId } from "@/lib/friendly-id";
import { getExternalSystemUser } from "@/lib/messaging/external-sender";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (!mode || !token) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (mode === "subscribe" && verifyToken && token === verifyToken) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(req: Request) {
  try {
    const signatureHeader = req.headers.get("x-hub-signature-256");
    const appSecret = process.env.META_APP_SECRET;
    if (!signatureHeader || !appSecret) {
      return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
    }

    const rawBody = await req.text();
    const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
    const signature = signatureHeader.replace("sha256=", "");
    if (signature !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as {
      entry?: Array<{
        messaging?: Array<{
          sender?: { id?: string };
          recipient?: { id?: string };
          message?: { mid?: string; text?: string };
        }>;
      }>;
    };

    const entries = payload.entry ?? [];
    for (const entry of entries) {
      const messaging = entry.messaging ?? [];
      for (const event of messaging) {
        if (!event.sender?.id || !event.recipient?.id) continue;

        const integration = await prismadb.messagingIntegration.findFirst({
          where: {
            platform: MessagingPlatform.MESSENGER,
            platformAccountId: event.recipient.id,
            isActive: true,
          },
        });

        if (!integration) continue;

        const contact = await prismadb.externalContact.upsert({
          where: {
            integrationId_platformUserId: {
              integrationId: integration.id,
              platformUserId: event.sender.id,
            },
          },
          update: {
            lastMessageAt: new Date(),
          },
          create: {
            integrationId: integration.id,
            platformUserId: event.sender.id,
            lastMessageAt: new Date(),
          },
        });

        const systemUser = await getExternalSystemUser();
        const messageId = await generateFriendlyId(prismadb, "Message");
        await prismadb.message.create({
          data: {
            id: messageId,
            organizationId: integration.organizationId,
            senderId: systemUser.id,
            content: event.message?.text ?? "",
            contentType: "TEXT",
            externalPlatform: MessagingPlatform.MESSENGER,
            externalMessageId: event.message?.mid,
            externalContactId: contact.id,
            externalMetadata: event,
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[WEBHOOK] Messenger error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

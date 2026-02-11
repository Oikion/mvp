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
        changes?: Array<{
          value?: {
            metadata?: { phone_number_id?: string; display_phone_number?: string };
            contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
            messages?: Array<{ from?: string; id?: string; text?: { body?: string } }>;
          };
        }>;
      }>;
    };

    const changes = payload.entry?.flatMap((entry) => entry.changes ?? []) ?? [];
    for (const change of changes) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!value || !phoneNumberId) continue;

      const integration = await prismadb.messagingIntegration.findFirst({
        where: {
          platform: MessagingPlatform.WHATSAPP,
          platformAccountId: phoneNumberId,
          isActive: true,
        },
      });

      if (!integration) {
        continue;
      }

      const contactInfo = value.contacts?.[0];
      const messages = value.messages ?? [];
      for (const message of messages) {
        if (!message.from) continue;

        const contact = await prismadb.externalContact.upsert({
          where: {
            integrationId_platformUserId: {
              integrationId: integration.id,
              platformUserId: message.from,
            },
          },
          update: {
            displayName: contactInfo?.profile?.name,
            lastMessageAt: new Date(),
          },
          create: {
            integrationId: integration.id,
            platformUserId: message.from,
            displayName: contactInfo?.profile?.name,
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
            content: message.text?.body ?? "",
            contentType: "TEXT",
            externalPlatform: MessagingPlatform.WHATSAPP,
            externalMessageId: message.id,
            externalContactId: contact.id,
            externalMetadata: message,
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[WEBHOOK] WhatsApp error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

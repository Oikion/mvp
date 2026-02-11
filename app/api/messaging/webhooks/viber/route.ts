import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { MessagingPlatform } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { generateFriendlyId } from "@/lib/friendly-id";
import { getExternalSystemUser } from "@/lib/messaging/external-sender";

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("x-viber-content-signature");
    const secret = process.env.VIBER_WEBHOOK_SECRET;
    if (!signature || !secret) {
      return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
    }

    const rawBody = await req.text();
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    if (signature !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as {
      event?: string;
      message?: { text?: string; token?: string };
      sender?: { id: string; name?: string; avatar?: string };
      receiver?: { id: string };
    };

    if (payload.event !== "message" || !payload.sender?.id) {
      return NextResponse.json({ ok: true });
    }

    const integration = await prismadb.messagingIntegration.findFirst({
      where: {
        platform: MessagingPlatform.VIBER,
        platformAccountId: payload.receiver?.id,
        isActive: true,
      },
    });

    if (!integration) {
      return NextResponse.json({ ok: true });
    }

    const contact = await prismadb.externalContact.upsert({
      where: {
        integrationId_platformUserId: {
          integrationId: integration.id,
          platformUserId: payload.sender.id,
        },
      },
      update: {
        displayName: payload.sender.name,
        avatarUrl: payload.sender.avatar,
        lastMessageAt: new Date(),
      },
      create: {
        integrationId: integration.id,
        platformUserId: payload.sender.id,
        displayName: payload.sender.name,
        avatarUrl: payload.sender.avatar,
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
        content: payload.message?.text ?? "",
        contentType: "TEXT",
        externalPlatform: MessagingPlatform.VIBER,
        externalMessageId: payload.message?.token,
        externalContactId: contact.id,
        externalMetadata: payload,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[WEBHOOK] Viber error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

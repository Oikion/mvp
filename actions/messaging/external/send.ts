"use server";

import { randomUUID } from "crypto";
import { MessagingPlatform } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { actionError, actionSuccess, type ActionResponse } from "@/lib/action-response";
import { externalMessageSendSchema } from "@/lib/validations/messaging";
import { generateFriendlyId } from "@/lib/friendly-id";
import { sendViberMessage } from "./viber";
import { sendWhatsAppMessage } from "./whatsapp";
import { sendMessengerMessage } from "./messenger";

interface SendExternalMessageResult {
  messageId: string;
  externalMessageId: string;
}

export async function sendExternalMessage(
  params: {
    integrationId: string;
    contactId: string;
    content: string;
  }
): Promise<ActionResponse<SendExternalMessageResult>> {
  const guard = await requireAction("messaging:send_message");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const validation = externalMessageSendSchema.safeParse(params);
  if (!validation.success) {
    return actionError("Validation failed", "VALIDATION_ERROR", validation.error.flatten());
  }

  try {
    const currentUser = await getCurrentUser();
    const { integrationId, contactId, content } = validation.data;

    const integration = await prismadb.messagingIntegration.findFirst({
      where: { id: integrationId, organizationId },
    });

    if (!integration || !integration.isActive) {
      return actionError("Integration not found or inactive", "NOT_FOUND");
    }

    const contact = await prismadb.externalContact.findFirst({
      where: { id: contactId, integrationId: integration.id },
    });

    if (!contact) {
      return actionError("External contact not found", "NOT_FOUND");
    }

    let externalMessageId: string = randomUUID();
    switch (integration.platform) {
      case MessagingPlatform.VIBER:
        externalMessageId = await sendViberMessage({
          accessToken: integration.accessToken,
          recipientId: contact.platformUserId,
          content,
        });
        break;
      case MessagingPlatform.WHATSAPP:
        externalMessageId = await sendWhatsAppMessage({
          accessToken: integration.accessToken,
          phoneNumberId: integration.platformAccountId,
          recipientId: contact.platformUserId,
          content,
        });
        break;
      case MessagingPlatform.MESSENGER:
        externalMessageId = await sendMessengerMessage({
          accessToken: integration.accessToken,
          pageId: integration.platformAccountId,
          recipientId: contact.platformUserId,
          content,
        });
        break;
      default:
        return actionError("Unsupported platform", "UNSUPPORTED_PLATFORM");
    }

    const messageId = await generateFriendlyId(prismadb, "Message");
    const message = await prismadb.message.create({
      data: {
        id: messageId,
        organizationId,
        senderId: currentUser.id,
        content,
        contentType: "TEXT",
        externalPlatform: integration.platform,
        externalMessageId,
        externalContactId: contact.id,
      },
    });

    await prismadb.externalContact.update({
      where: { id: contact.id },
      data: { lastMessageAt: new Date() },
    });

    return actionSuccess({
      messageId: message.id,
      externalMessageId,
    });
  } catch (error) {
    console.error("[EXTERNAL_MESSAGE_SEND]", error);
    return actionError("Failed to send external message");
  }
}

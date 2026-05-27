import { prismadb } from "@/lib/prisma";
import { generateFriendlyId } from "@/lib/friendly-id";
import { encryptMessageForOrg } from "@/lib/model-encryption";
import { getExternalSystemUser } from "@/lib/messaging/external-sender";
import { publishToChannel, getConversationChannelName } from "@/lib/ably";
import type { ParsedEmail } from "./email-parser";

export interface IngestResult {
  conversationId: string;
  messageId: string;
  isNewConversation: boolean;
}

export async function ingestEmailMessage(
  parsedEmail: ParsedEmail,
  channelId: string,
  organizationId: string
): Promise<IngestResult> {
  const systemUser = await getExternalSystemUser();

  // Deduplication: skip if we've already stored this exact message
  const existing = await prismadb.message.findFirst({
    where: { externalMessageId: parsedEmail.messageId, organizationId },
    select: { id: true, conversationId: true },
  });
  if (existing?.conversationId) {
    return {
      conversationId: existing.conversationId,
      messageId: existing.id,
      isNewConversation: false,
    };
  }

  // Threading: find existing conversation by externalThreadId matching any
  // ancestor in the References chain or the In-Reply-To header
  const threadIds = [
    parsedEmail.inReplyTo,
    ...parsedEmail.references,
  ].filter((id): id is string => !!id);

  let conversation = threadIds.length > 0
    ? await prismadb.conversation.findFirst({
        where: {
          organizationId,
          externalThreadId: { in: threadIds },
        },
        select: { id: true, externalThreadId: true },
      })
    : null;

  let isNewConversation = false;

  if (!conversation) {
    isNewConversation = true;

    // Find or create a stub Contact for the sender.
    // Contact model intentionally allows duplicate emails per org (one person, many contacts).
    // We match on email here as a best-effort dedup for inbound senders only.
    let contact = await prismadb.contact.findFirst({
      where: { organizationId, email: parsedEmail.fromAddress },
      select: { id: true },
    });

    if (!contact) {
      const nameParts = (parsedEmail.fromName ?? parsedEmail.fromAddress).split(" ");
      const contactId = await generateFriendlyId(prismadb, "Contact", organizationId);
      const firstName = nameParts[0] ?? parsedEmail.fromAddress;
      const lastName = nameParts.slice(1).join(" ") || null;
      try {
        contact = await prismadb.contact.create({
          data: {
            id: contactId,
            organizationId,
            firstName,
            lastName,
            displayName: lastName ? `${firstName} ${lastName}` : firstName,
            email: parsedEmail.fromAddress,
            source: "EMAIL_INBOUND",
          },
          select: { id: true },
        });
      } catch {
        // Concurrent creation — fetch the row the other request created
        contact = await prismadb.contact.findFirst({
          where: { organizationId, email: parsedEmail.fromAddress },
          select: { id: true },
        });
        if (!contact) throw new Error("Contact creation failed");
      }
    }

    const convId = await generateFriendlyId(prismadb, "Conversation", organizationId);
    conversation = await prismadb.conversation.create({
      data: {
        id: convId,
        organizationId,
        scope: "ORG",
        isGroup: false,
        isE2ee: false,
        externalThreadId: parsedEmail.messageId,
        externalSubject: parsedEmail.subject,
        externalSenderEmail: parsedEmail.fromAddress,
        externalSenderName: parsedEmail.fromName,
        participants: {
          create: { userId: systemUser.id },
        },
      },
      select: { id: true, externalThreadId: true },
    });

    // Add all channel members as conversation participants so they see it
    const channelMembers = await prismadb.channelMember.findMany({
      where: { channelId },
      select: { userId: true },
      take: 100,
    });
    if (channelMembers.length > 0) {
      await prismadb.conversationParticipant.createMany({
        data: channelMembers.map(m => ({
          conversationId: conversation!.id,
          userId: m.userId,
        })),
        skipDuplicates: true,
      });
    }
  }

  // Create the message
  const MAX_EMAIL_BODY_LENGTH = 10_000;
  let textContent = parsedEmail.textBody || parsedEmail.subject;
  if (textContent && textContent.length > MAX_EMAIL_BODY_LENGTH) {
    textContent = textContent.slice(0, MAX_EMAIL_BODY_LENGTH) + "\n\n[Email truncated — content exceeded 10,000 characters]";
  }
  const { content: encryptedContent } = await encryptMessageForOrg(
    { content: textContent },
    organizationId
  );

  const messageId = await generateFriendlyId(prismadb, "Message", organizationId);
  const message = await prismadb.message.create({
    data: {
      id: messageId,
      organizationId,
      conversationId: conversation.id,
      senderId: systemUser.id,
      content: encryptedContent ?? textContent,
      contentType: "TEXT",
      externalMessageId: parsedEmail.messageId,
    },
  });

  // Update conversation timestamp
  await prismadb.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  // Real-time push via Ably
  await publishToChannel(
    getConversationChannelName(organizationId, conversation.id),
    "message:new",
    {
      id: message.id,
      content: textContent,
      contentType: "TEXT",
      senderId: systemUser.id,
      senderName: parsedEmail.fromName ?? parsedEmail.fromAddress,
      senderEmail: parsedEmail.fromAddress,
      conversationId: conversation.id,
      createdAt: message.createdAt,
      isExternal: true,
      externalSenderEmail: parsedEmail.fromAddress,
    }
  );

  return { conversationId: conversation.id, messageId: message.id, isNewConversation };
}

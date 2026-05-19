import { Resend } from "resend";
import { prismadb } from "@/lib/prisma";
import { decryptEmailInboxForOrg } from "@/lib/model-encryption";
import type { SmtpSendMode } from "@prisma/client";

interface SendReplyOptions {
  channelId: string;
  conversationId: string;
  organizationId: string;
  content: string;
  agentName: string;
}

interface SendResult {
  sent: boolean;
  provider: SmtpSendMode | null;
}

export async function sendEmailReply(opts: SendReplyOptions): Promise<SendResult> {
  const { channelId, conversationId, organizationId, content, agentName } = opts;

  const [inboxConfig, conversation] = await Promise.all([
    prismadb.emailInboxConfig.findUnique({
      where: { channelId },
    }),
    prismadb.conversation.findUnique({
      where: { id: conversationId },
      select: {
        externalThreadId: true,
        externalSubject: true,
        externalSenderEmail: true,
      },
    }),
  ]);

  if (!inboxConfig || !inboxConfig.isActive) return { sent: false, provider: null };
  if (!conversation?.externalSenderEmail) return { sent: false, provider: null };

  const decrypted = await decryptEmailInboxForOrg(inboxConfig, organizationId);

  const subject = conversation.externalSubject
    ? `Re: ${conversation.externalSubject}`
    : "Re: (no subject)";

  const threadingHeaders: Record<string, string> = {};
  if (conversation.externalThreadId) {
    threadingHeaders["In-Reply-To"] = `<${conversation.externalThreadId}>`;
    threadingHeaders["References"] = `<${conversation.externalThreadId}>`;
  }

  if (inboxConfig.smtpSendVia === "RESEND_CUSTOM_DOMAIN") {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromLine = inboxConfig.fromName
      ? `${inboxConfig.fromName} <${inboxConfig.fromAddress}>`
      : inboxConfig.fromAddress;

    const { error } = await resend.emails.send({
      from: fromLine,
      to: [conversation.externalSenderEmail],
      subject,
      text: content,
      headers: threadingHeaders,
      replyTo: inboxConfig.fromAddress,
    });

    if (error) {
      console.error("[outbound-relay] Resend error:", error);
      return { sent: false, provider: "RESEND_CUSTOM_DOMAIN" };
    }

    return { sent: true, provider: "RESEND_CUSTOM_DOMAIN" };
  }

  if (inboxConfig.smtpSendVia === "SMTP_DIRECT") {
    if (!decrypted.smtpHost || !decrypted.smtpUser || !decrypted.smtpPasswordEncrypted) {
      console.error("[outbound-relay] SMTP_DIRECT selected but credentials incomplete");
      return { sent: false, provider: "SMTP_DIRECT" };
    }

    // nodemailer is a peer dep — import dynamically so the bundle stays lean
    // when SMTP_DIRECT is not in use.
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: decrypted.smtpHost,
      port: decrypted.smtpPort ?? 587,
      secure: (decrypted.smtpPort ?? 587) === 465,
      auth: { user: decrypted.smtpUser, pass: decrypted.smtpPasswordEncrypted },
    });

    await transporter.sendMail({
      from: inboxConfig.fromName
        ? `"${inboxConfig.fromName}" <${inboxConfig.fromAddress}>`
        : inboxConfig.fromAddress,
      to: conversation.externalSenderEmail,
      subject,
      text: content,
      headers: threadingHeaders,
      replyTo: inboxConfig.fromAddress,
    });

    return { sent: true, provider: "SMTP_DIRECT" };
  }

  return { sent: false, provider: null };
}

export async function isEmailConversation(conversationId: string): Promise<boolean> {
  const conv = await prismadb.conversation.findUnique({
    where: { id: conversationId },
    select: { externalThreadId: true },
  });
  return !!conv?.externalThreadId;
}

export async function getEmailChannelForConversation(
  conversationId: string,
  organizationId: string
): Promise<string | null> {
  const conv = await prismadb.conversation.findUnique({
    where: { id: conversationId, organizationId },
    select: { externalSenderEmail: true },
  });
  if (!conv?.externalSenderEmail) return null;

  const emailChannel = await prismadb.channel.findFirst({
    where: { organizationId, source: "EMAIL" },
    select: { id: true },
  });
  return emailChannel?.id ?? null;
}

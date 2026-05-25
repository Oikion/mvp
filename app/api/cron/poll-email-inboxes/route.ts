import { NextResponse } from "next/server";
import { timingSafeEqual, createHmac } from "crypto";
import { prismadb } from "@/lib/prisma";
import { startCronExecution, completeCronExecution, failCronExecution } from "@/lib/cron-execution";
import { decryptEmailInboxForOrg } from "@/lib/model-encryption";
import { pollInbox } from "@/lib/email/imap-poller";
import { ingestEmailMessage } from "@/lib/email/email-to-message";
import { logPiiAccess } from "@/lib/pii-access-log";

// Fixed-length key — HMAC normalizes both sides to 32 bytes before timingSafeEqual,
// preventing the early-exit length oracle present in raw buffer comparison.
const HMAC_KEY = Buffer.alloc(32);
function verifyCronSecret(provided: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!provided || !expected) return false;
  const a = createHmac("sha256", HMAC_KEY).update(`Bearer ${expected}`).digest();
  const b = createHmac("sha256", HMAC_KEY).update(provided).digest();
  return timingSafeEqual(a, b);
}

interface InboxResult {
  channelId: string;
  fromAddress: string;
  status: "ok" | "skipped" | "error";
  processed: number;
  error?: string;
}

async function processInbox(
  inboxId: string,
  organizationId: string
): Promise<InboxResult> {
  const inbox = await prismadb.emailInboxConfig.findUnique({
    where: { id: inboxId },
    include: { channel: { select: { id: true, organizationId: true } } },
  });

  if (!inbox || !inbox.isActive) {
    return { channelId: inboxId, fromAddress: "", status: "skipped", processed: 0 };
  }

  const decrypted = await decryptEmailInboxForOrg(inbox, organizationId);
  // fire-and-forget PII access log — cron-triggered IMAP credential decryption
  logPiiAccess({
    userId: "cron",
    organizationId,
    entityType: "EMAIL_INBOX_CONFIG",
    entityId: inbox.id,
    action: "DECRYPT",
    fields: ["imapHost", "imapUser", "imapPasswordEncrypted", "smtpHost", "smtpUser", "smtpPasswordEncrypted"],
    source: "GET /api/cron/poll-email-inboxes",
  }).catch(() => {});
  if (!decrypted.imapPasswordEncrypted || !decrypted.imapHost || !decrypted.imapUser) {
    return {
      channelId: inbox.channelId,
      fromAddress: inbox.fromAddress,
      status: "error",
      processed: 0,
      error: "Missing IMAP credentials",
    };
  }

  try {
    const result = await pollInbox(
      {
        host: decrypted.imapHost,
        port: inbox.imapPort,
        useTLS: inbox.imapUseTLS,
        user: decrypted.imapUser,
        password: decrypted.imapPasswordEncrypted,
      },
      inbox.lastUidNext
    );

    let processed = 0;
    for (const { parsed } of result.messages) {
      try {
        await ingestEmailMessage(parsed, inbox.channelId, organizationId);
        processed++;
      } catch (err) {
        console.error(
          "[poll-email-inboxes] Failed to ingest message %s: %s",
          parsed.messageId,
          err
        );
      }
    }

    await prismadb.emailInboxConfig.update({
      where: { id: inbox.id },
      data: { lastUidNext: result.newUidNext, lastPolledAt: new Date() },
    });

    return { channelId: inbox.channelId, fromAddress: inbox.fromAddress, status: "ok", processed };
  } catch (err) {
    console.error("[poll-email-inboxes] IMAP error for inbox %s: %s", inbox.id, err);
    return {
      channelId: inbox.channelId,
      fromAddress: inbox.fromAddress,
      status: "error",
      processed: 0,
      error: "IMAP connection failed",
    };
  }
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!verifyCronSecret(authHeader)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cronLogId = await startCronExecution("poll-email-inboxes");

  try {
    const activeInboxes = await prismadb.emailInboxConfig.findMany({
      where: { isActive: true },
      select: { id: true, channel: { select: { organizationId: true } } },
    });

    if (activeInboxes.length === 0) {
      await completeCronExecution(cronLogId, { polled: 0, processed: 0 });
      return NextResponse.json({ polled: 0, results: [] });
    }

    const results = await Promise.allSettled(
      activeInboxes.map(inbox =>
        processInbox(inbox.id, inbox.channel.organizationId)
      )
    );

    const summary = results.map(r => {
      if (r.status === "fulfilled") return r.value;
      console.error("[poll-email-inboxes] Unhandled rejection:", r.reason);
      return { status: "error" as const, error: "Unexpected failure", processed: 0 };
    });

    const totalProcessed = summary.reduce(
      (acc: number, r) => acc + (r.processed ?? 0),
      0
    );

    console.error("[poll-email-inboxes] Polled %d inbox(es), processed %d message(s)", activeInboxes.length, totalProcessed);

    await completeCronExecution(cronLogId, { polled: activeInboxes.length, processed: totalProcessed });
    return NextResponse.json({
      polled: activeInboxes.length,
      processed: totalProcessed,
      results: summary,
    });
  } catch (err) {
    console.error("[poll-email-inboxes] Fatal error:", err);
    await failCronExecution(cronLogId, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

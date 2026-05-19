import { ImapFlow, type FetchMessageObject } from "imapflow";
import { parseRawEmail, type ParsedEmail } from "./email-parser";

export interface ImapCredentials {
  host: string;
  port: number;
  useTLS: boolean;
  user: string;
  password: string;
}

export interface PolledMessage {
  uid: number;
  parsed: ParsedEmail;
}

export interface PollResult {
  messages: PolledMessage[];
  newUidNext: number;
}

export async function pollInbox(
  credentials: ImapCredentials,
  lastUidNext: number | null
): Promise<PollResult> {
  const client = new ImapFlow({
    host: credentials.host,
    port: credentials.port,
    secure: credentials.useTLS,
    auth: { user: credentials.user, pass: credentials.password },
    logger: false,
  });

  await client.connect();

  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const mailbox = client.mailbox;
      if (!mailbox || typeof mailbox === "boolean") {
        return { messages: [], newUidNext: lastUidNext ?? 1 };
      }

      const currentUidNext: number = (mailbox as { uidNext?: number }).uidNext ?? 1;

      // Nothing new since last poll
      if (lastUidNext !== null && currentUidNext <= lastUidNext) {
        return { messages: [], newUidNext: currentUidNext };
      }

      const fetchFrom = lastUidNext ?? 1;
      const uidRange = `${fetchFrom}:*`;

      const messages: PolledMessage[] = [];

      for await (const msg of client.fetch(uidRange, { uid: true, source: true }, { uid: true }) as AsyncIterable<FetchMessageObject>) {
        if (!msg.source) continue;
        // Skip UIDs we already processed
        if (msg.uid < fetchFrom) continue;

        try {
          const parsed = await parseRawEmail(msg.source);
          messages.push({ uid: msg.uid, parsed });
        } catch (err) {
          console.error("[imap-poller] Failed to parse message uid=%d: %s", msg.uid, err);
        }
      }

      return { messages, newUidNext: currentUidNext };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

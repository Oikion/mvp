import { simpleParser, type ParsedMail, type AddressObject } from "mailparser";

export interface ParsedEmail {
  messageId: string;
  inReplyTo: string | null;
  references: string[];
  subject: string;
  fromAddress: string;
  fromName: string | null;
  toAddress: string;
  textBody: string;
  htmlBody: string | null;
  date: Date;
  attachments: Array<{
    filename: string;
    contentType: string;
    size: number;
    content: Buffer;
  }>;
}

function firstAddress(field: AddressObject | AddressObject[] | undefined): { address: string; name: string | null } | null {
  if (!field) return null;
  const obj = Array.isArray(field) ? field[0] : field;
  const addr = obj?.value?.[0];
  if (!addr?.address) return null;
  return { address: addr.address, name: addr.name || null };
}

function normalizeMessageId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return raw.replace(/[<>]/g, "").trim();
}

function parseReferences(raw: string | string[] | null | undefined): string[] {
  if (!raw) return [];
  const str = Array.isArray(raw) ? raw.join(" ") : raw;
  return str
    .split(/\s+/)
    .map(r => r.replace(/[<>]/g, "").trim())
    .filter(Boolean);
}

export async function parseRawEmail(rawBuffer: Buffer): Promise<ParsedEmail> {
  const parsed: ParsedMail = await simpleParser(rawBuffer, { skipTextToHtml: false });

  const from = firstAddress(parsed.from);
  if (!from) {
    throw new Error("[email-parser] Could not extract sender address");
  }

  const to = firstAddress(parsed.to);
  const toAddress = to?.address ?? "";

  const messageId = normalizeMessageId(parsed.messageId);
  if (!messageId) {
    throw new Error("[email-parser] Missing Message-ID header — cannot reliably deduplicate");
  }

  return {
    messageId,
    inReplyTo: normalizeMessageId(parsed.inReplyTo),
    references: parseReferences(parsed.references),
    subject: parsed.subject ?? "(no subject)",
    fromAddress: from.address,
    fromName: from.name,
    toAddress,
    textBody: parsed.text ?? "",
    htmlBody: parsed.html || null,
    date: parsed.date ?? new Date(),
    attachments: (parsed.attachments ?? []).map(att => ({
      filename: att.filename ?? "attachment",
      contentType: att.contentType,
      size: att.size,
      content: att.content,
    })),
  };
}

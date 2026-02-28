/**
 * lib/model-encryption.ts
 *
 * Typed field-level encryption helpers per model.
 * Each helper encrypts/decrypts only the fields present in the input (Partial-safe).
 * JSON fields are serialized to string before encryption (sentinel prefix: value starts
 * with encrypted format iv:auth:ct when isEncrypted returns true).
 *
 * Usage on WRITE: const encrypted = encryptClient(data); await prismadb.clients.create({ data: encrypted });
 * Usage on READ:  const record = await prismadb.clients.findFirst(...); return decryptClient(record);
 */

import { encrypt, decrypt, isEncrypted } from "@/lib/encryption";
import type { Prisma } from "@prisma/client";

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

/** Encrypt a string field, handling null/undefined gracefully */
function encryptField(value: string | null | undefined): string | null | undefined {
  if (value == null) return value;
  if (isEncrypted(value)) return value; // idempotent
  return encrypt(value);
}

/** Decrypt a string field, handling null/undefined gracefully */
function decryptField(value: string | null | undefined): string | null | undefined {
  if (value == null) return value;
  if (!isEncrypted(value)) return value; // legacy plain-text or empty
  return decrypt(value);
}

/** Encrypt a JSON value by serialising to string first */
function encryptJson(
  value: Prisma.JsonValue | null | undefined
): Prisma.JsonValue | null | undefined {
  if (value == null) return value;
  const str = typeof value === "string" ? value : JSON.stringify(value);
  if (isEncrypted(str)) return value; // already encrypted string stored as JSON
  const encrypted = encrypt(str);
  return encrypted as Prisma.JsonValue; // stored as JSON string
}

/** Decrypt a JSON value that was encrypted as a string */
function decryptJson(
  value: Prisma.JsonValue | null | undefined
): Prisma.JsonValue | null | undefined {
  if (value == null) return value;
  if (typeof value === "string" && isEncrypted(value)) {
    const decrypted = decrypt(value);
    try {
      return JSON.parse(decrypted) as Prisma.JsonValue;
    } catch {
      return decrypted as Prisma.JsonValue;
    }
  }
  return value; // legacy unencrypted JSON object
}

// ─────────────────────────────────────────────
// Clients
// ─────────────────────────────────────────────

const CLIENT_ENCRYPTED_STRING_FIELDS = [
  "client_name",
  "primary_email",
  "secondary_email",
  "primary_phone",
  "secondary_phone",
  "afm",
  "vat",
  "id_doc",
  "description",
  "billing_street",
  "billing_city",
  "billing_state",
  "billing_postal_code",
  "billing_country",
  "shipping_street",
  "shipping_city",
  "shipping_state",
  "shipping_postal_code",
  "shipping_country",
] as const;

type ClientStringField = (typeof CLIENT_ENCRYPTED_STRING_FIELDS)[number];
type ClientWithEncryptedFields = Partial<Record<ClientStringField, string | null | undefined>> & {
  communication_notes?: Prisma.JsonValue | null;
};

export function encryptClient<T extends ClientWithEncryptedFields>(data: T): T {
  const result = { ...data } as T & ClientWithEncryptedFields;
  for (const field of CLIENT_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = encryptField(
        result[field] as string | null | undefined
      );
    }
  }
  if ("communication_notes" in result) {
    result.communication_notes = encryptJson(result.communication_notes);
  }
  return result as T;
}

export function decryptClient<T extends ClientWithEncryptedFields>(record: T): T {
  const result = { ...record } as T & ClientWithEncryptedFields;
  for (const field of CLIENT_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = decryptField(
        result[field] as string | null | undefined
      );
    }
  }
  if ("communication_notes" in result) {
    result.communication_notes = decryptJson(result.communication_notes);
  }
  return result as T;
}

// ─────────────────────────────────────────────
// Messages
// ─────────────────────────────────────────────

type MessageWithContent = { content?: string };

export function encryptMessage<T extends MessageWithContent>(data: T): T {
  if (!("content" in data)) return data;
  return { ...data, content: encryptField(data.content) as string };
}

export function decryptMessage<T extends MessageWithContent>(record: T): T {
  if (!("content" in record)) return record;
  return { ...record, content: decryptField(record.content) as string };
}

// ─────────────────────────────────────────────
// CalendarEvent
// ─────────────────────────────────────────────

const CALENDAR_ENCRYPTED_FIELDS = [
  "title",
  "description",
  "location",
  "attendeeEmail",
  "attendeeName",
  "notes",
] as const;

type CalendarStringField = (typeof CALENDAR_ENCRYPTED_FIELDS)[number];
type CalendarWithEncryptedFields = Partial<Record<CalendarStringField, string | null | undefined>>;

export function encryptCalendarEvent<T extends CalendarWithEncryptedFields>(data: T): T {
  const result = { ...data } as T & CalendarWithEncryptedFields;
  for (const field of CALENDAR_ENCRYPTED_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = encryptField(
        result[field] as string | null | undefined
      );
    }
  }
  return result as T;
}

export function decryptCalendarEvent<T extends CalendarWithEncryptedFields>(record: T): T {
  const result = { ...record } as T & CalendarWithEncryptedFields;
  for (const field of CALENDAR_ENCRYPTED_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = decryptField(
        result[field] as string | null | undefined
      );
    }
  }
  return result as T;
}

// ─────────────────────────────────────────────
// AiConversation
// ─────────────────────────────────────────────

type AiConversationWithEncryptedFields = {
  title?: string | null;
  messages?: Prisma.JsonValue | null | unknown;
  context?: Prisma.JsonValue | null | unknown;
};

export function encryptAiConversation<T extends AiConversationWithEncryptedFields>(data: T): T {
  const result = { ...data };
  if ("title" in result && result.title != null) {
    result.title = encryptField(result.title as string) as string | null | undefined;
  }
  if ("messages" in result && result.messages != null) {
    result.messages = encryptJson(result.messages as Prisma.JsonValue);
  }
  if ("context" in result && result.context != null) {
    result.context = encryptJson(result.context as Prisma.JsonValue);
  }
  return result as T;
}

export function decryptAiConversation<T extends AiConversationWithEncryptedFields>(record: T): T {
  const result = { ...record };
  if ("title" in result && result.title != null) {
    result.title = decryptField(result.title as string) as string | null | undefined;
  }
  if ("messages" in result && result.messages != null) {
    result.messages = decryptJson(result.messages as Prisma.JsonValue);
  }
  if ("context" in result && result.context != null) {
    result.context = decryptJson(result.context as Prisma.JsonValue);
  }
  return result as T;
}

// ─────────────────────────────────────────────
// Documents
// ─────────────────────────────────────────────

type DocumentWithEncryptedFields = {
  document_name?: string | null;
  description?: string | null;
};

export function encryptDocument<T extends DocumentWithEncryptedFields>(data: T): T {
  const result = { ...data };
  if ("document_name" in result) {
    result.document_name = encryptField(result.document_name) as string | null | undefined;
  }
  if ("description" in result) {
    result.description = encryptField(result.description) as string | null | undefined;
  }
  return result as T;
}

export function decryptDocument<T extends DocumentWithEncryptedFields>(record: T): T {
  const result = { ...record };
  if ("document_name" in result) {
    result.document_name = decryptField(result.document_name) as string | null | undefined;
  }
  if ("description" in result) {
    result.description = decryptField(result.description) as string | null | undefined;
  }
  return result as T;
}

// ─────────────────────────────────────────────
// Properties (limited — owner-sensitive fields only)
// ─────────────────────────────────────────────

type PropertyWithEncryptedFields = {
  primary_email?: string | null;
  communication_notes?: Prisma.JsonValue | null;
};

export function encryptProperty<T extends PropertyWithEncryptedFields>(data: T): T {
  const result = { ...data };
  if ("primary_email" in result) {
    result.primary_email = encryptField(result.primary_email) as string | null | undefined;
  }
  if ("communication_notes" in result) {
    result.communication_notes = encryptJson(result.communication_notes);
  }
  return result as T;
}

export function decryptProperty<T extends PropertyWithEncryptedFields>(record: T): T {
  const result = { ...record };
  if ("primary_email" in result) {
    result.primary_email = decryptField(result.primary_email) as string | null | undefined;
  }
  if ("communication_notes" in result) {
    result.communication_notes = decryptJson(result.communication_notes);
  }
  return result as T;
}

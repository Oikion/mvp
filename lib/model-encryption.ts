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

import { encrypt, decrypt, encryptWithKey, decryptWithKey, isEncrypted } from "@/lib/encryption";
import { getOrgDek } from "@/lib/key-management";
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
  // Only skip if the raw value is already an encrypted string
  if (typeof value === "string" && isEncrypted(value)) return value;
  const str = typeof value === "string" ? value : JSON.stringify(value);
  return encrypt(str) as Prisma.JsonValue;
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

type MessageWithContent = { content?: string | null };

export function encryptMessage<T extends MessageWithContent>(data: T): T {
  if (!("content" in data)) return data;
  return { ...data, content: encryptField(data.content) };
}

export function decryptMessage<T extends MessageWithContent>(record: T): T {
  if (!("content" in record)) return record;
  return { ...record, content: decryptField(record.content) };
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
  messages?: Prisma.JsonValue | null;
  context?: Prisma.JsonValue | null;
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

// ─────────────────────────────────────────────
// DEK-aware internal helpers (per-org encryption)
// ─────────────────────────────────────────────

function encryptFieldWithKey(value: string | null | undefined, dek: Buffer): string | null | undefined {
  if (value == null) return value;
  if (isEncrypted(value)) return value; // idempotent
  return encryptWithKey(value, dek);
}

function decryptFieldWithKey(value: string | null | undefined, dek: Buffer): string | null | undefined {
  if (value == null) return value;
  if (!isEncrypted(value)) return value;
  return decryptWithKey(value, dek);
}

function encryptJsonWithKey(
  value: Prisma.JsonValue | null | undefined,
  dek: Buffer
): Prisma.JsonValue | null | undefined {
  if (value == null) return value;
  if (typeof value === "string" && isEncrypted(value)) return value;
  const str = typeof value === "string" ? value : JSON.stringify(value);
  return encryptWithKey(str, dek) as Prisma.JsonValue;
}

function decryptJsonWithKey(
  value: Prisma.JsonValue | null | undefined,
  dek: Buffer
): Prisma.JsonValue | null | undefined {
  if (value == null) return value;
  if (typeof value === "string" && isEncrypted(value)) {
    const decrypted = decryptWithKey(value, dek);
    try {
      return JSON.parse(decrypted) as Prisma.JsonValue;
    } catch {
      return decrypted as Prisma.JsonValue;
    }
  }
  return value;
}

// ─────────────────────────────────────────────
// Per-org async helpers
// Each fetches the org DEK once, then applies the same field logic as the
// sync helpers above. Falls back to master key automatically via decryptWithKey.
// ─────────────────────────────────────────────

export async function encryptClientForOrg<T extends ClientWithEncryptedFields>(
  data: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...data } as T & ClientWithEncryptedFields;
  for (const field of CLIENT_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = encryptFieldWithKey(
        result[field] as string | null | undefined,
        dek
      );
    }
  }
  if ("communication_notes" in result) {
    result.communication_notes = encryptJsonWithKey(result.communication_notes, dek);
  }
  return result as T;
}

export async function decryptClientForOrg<T extends ClientWithEncryptedFields>(
  record: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...record } as T & ClientWithEncryptedFields;
  for (const field of CLIENT_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = decryptFieldWithKey(
        result[field] as string | null | undefined,
        dek
      );
    }
  }
  if ("communication_notes" in result) {
    result.communication_notes = decryptJsonWithKey(result.communication_notes, dek);
  }
  return result as T;
}

export async function encryptMessageForOrg<T extends MessageWithContent>(
  data: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  if (!("content" in data)) return data;
  return { ...data, content: encryptFieldWithKey(data.content, dek) };
}

export async function decryptMessageForOrg<T extends MessageWithContent>(
  record: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  if (!("content" in record)) return record;
  return { ...record, content: decryptFieldWithKey(record.content, dek) };
}

export async function encryptCalendarEventForOrg<T extends CalendarWithEncryptedFields>(
  data: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...data } as T & CalendarWithEncryptedFields;
  for (const field of CALENDAR_ENCRYPTED_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = encryptFieldWithKey(
        result[field] as string | null | undefined,
        dek
      );
    }
  }
  return result as T;
}

export async function decryptCalendarEventForOrg<T extends CalendarWithEncryptedFields>(
  record: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...record } as T & CalendarWithEncryptedFields;
  for (const field of CALENDAR_ENCRYPTED_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = decryptFieldWithKey(
        result[field] as string | null | undefined,
        dek
      );
    }
  }
  return result as T;
}

export async function encryptAiConversationForOrg<T extends AiConversationWithEncryptedFields>(
  data: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...data };
  if ("title" in result && result.title != null) {
    result.title = encryptFieldWithKey(result.title as string, dek);
  }
  if ("messages" in result && result.messages != null) {
    result.messages = encryptJsonWithKey(result.messages as Prisma.JsonValue, dek);
  }
  if ("context" in result && result.context != null) {
    result.context = encryptJsonWithKey(result.context as Prisma.JsonValue, dek);
  }
  return result as T;
}

export async function decryptAiConversationForOrg<T extends AiConversationWithEncryptedFields>(
  record: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...record };
  if ("title" in result && result.title != null) {
    result.title = decryptFieldWithKey(result.title as string, dek);
  }
  if ("messages" in result && result.messages != null) {
    result.messages = decryptJsonWithKey(result.messages as Prisma.JsonValue, dek);
  }
  if ("context" in result && result.context != null) {
    result.context = decryptJsonWithKey(result.context as Prisma.JsonValue, dek);
  }
  return result as T;
}

export async function encryptDocumentForOrg<T extends DocumentWithEncryptedFields>(
  data: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...data };
  if ("document_name" in result) {
    result.document_name = encryptFieldWithKey(result.document_name, dek);
  }
  if ("description" in result) {
    result.description = encryptFieldWithKey(result.description, dek);
  }
  return result as T;
}

export async function decryptDocumentForOrg<T extends DocumentWithEncryptedFields>(
  record: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...record };
  if ("document_name" in result) {
    result.document_name = decryptFieldWithKey(result.document_name, dek);
  }
  if ("description" in result) {
    result.description = decryptFieldWithKey(result.description, dek);
  }
  return result as T;
}

export async function encryptPropertyForOrg<T extends PropertyWithEncryptedFields>(
  data: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...data };
  if ("primary_email" in result) {
    result.primary_email = encryptFieldWithKey(result.primary_email, dek);
  }
  if ("communication_notes" in result) {
    result.communication_notes = encryptJsonWithKey(result.communication_notes, dek);
  }
  return result as T;
}

export async function decryptPropertyForOrg<T extends PropertyWithEncryptedFields>(
  record: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...record };
  if ("primary_email" in result) {
    result.primary_email = decryptFieldWithKey(result.primary_email, dek);
  }
  if ("communication_notes" in result) {
    result.communication_notes = decryptJsonWithKey(result.communication_notes, dek);
  }
  return result as T;
}

// ─────────────────────────────────────────────
// PropertyComment (content field)
// Note: PropertyComment has no organizationId — pass the parent property's orgId.
// Structurally identical to Message ({content?: string | null}), so delegates to
// the Message helpers to avoid code duplication.
// ─────────────────────────────────────────────

export async function encryptPropertyCommentForOrg<T extends MessageWithContent>(
  data: T,
  orgId: string
): Promise<T> {
  return encryptMessageForOrg(data, orgId);
}

export async function decryptPropertyCommentForOrg<T extends MessageWithContent>(
  record: T,
  orgId: string
): Promise<T> {
  return decryptMessageForOrg(record, orgId);
}

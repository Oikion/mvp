/**
 * lib/model-encryption.ts
 *
 * Typed field-level encryption helpers per model.
 * Each helper encrypts/decrypts only the fields present in the input (Partial-safe).
 * JSON fields are serialized to string before encryption (sentinel prefix: value starts
 * with encrypted format iv:auth:ct when isEncrypted returns true).
 *
 * All encryption uses per-org DEKs (Data Encryption Keys) via the *ForOrg() functions.
 *
 * Usage on WRITE: const encrypted = await encryptClientForOrg(data, orgId);
 * Usage on READ:  const record = await prismadb.clients.findFirst(...); return decryptClientForOrg(record, orgId);
 */

import { encryptWithKey, decryptWithKey, isEncrypted } from "@/lib/encryption";
import { getOrgDek } from "@/lib/key-management";
import type { Prisma } from "@prisma/client";

// ─────────────────────────────────────────────
// Clients
// ─────────────────────────────────────────────

const CLIENT_ENCRYPTED_STRING_FIELDS = [
  "client_name",
  "full_name",
  "company_name",
  "company_id",
  "primary_email",
  "secondary_email",
  "primary_phone",
  "secondary_phone",
  "office_phone",
  "fax",
  "afm",
  "vat",
  "doy",
  "id_doc",
  "company_gemi",
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

// ─────────────────────────────────────────────
// Messages
// ─────────────────────────────────────────────

type MessageWithContent = { content?: string | null };

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

// ─────────────────────────────────────────────
// Documents
// ─────────────────────────────────────────────

type DocumentWithEncryptedFields = {
  document_name?: string | null;
  description?: string | null;
};

// ─────────────────────────────────────────────
// Properties (limited — owner-sensitive fields only)
// ─────────────────────────────────────────────

type PropertyWithEncryptedFields = {
  primary_email?: string | null;
  communication_notes?: Prisma.JsonValue | null;
};

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
// Mandates
// ─────────────────────────────────────────────

const MANDATE_ENCRYPTED_STRING_FIELDS = [
  "title",
  "notes",
] as const;

type MandateStringField = (typeof MANDATE_ENCRYPTED_STRING_FIELDS)[number];
type MandateWithEncryptedFields = Partial<Record<MandateStringField, string | null | undefined>> & {
  communication_notes?: Prisma.JsonValue | null;
};

export async function encryptMandateForOrg<T extends MandateWithEncryptedFields>(
  data: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...data } as T & MandateWithEncryptedFields;
  for (const field of MANDATE_ENCRYPTED_STRING_FIELDS) {
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

export async function decryptMandateForOrg<T extends MandateWithEncryptedFields>(
  record: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...record } as T & MandateWithEncryptedFields;
  for (const field of MANDATE_ENCRYPTED_STRING_FIELDS) {
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

// ─────────────────────────────────────────────
// MandateComment (content field)
// Delegates to Message helpers (structurally identical)
// ─────────────────────────────────────────────

export async function encryptMandateCommentForOrg<T extends MessageWithContent>(
  data: T,
  orgId: string
): Promise<T> {
  return encryptMessageForOrg(data, orgId);
}

export async function decryptMandateCommentForOrg<T extends MessageWithContent>(
  record: T,
  orgId: string
): Promise<T> {
  return decryptMessageForOrg(record, orgId);
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

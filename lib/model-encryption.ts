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

export function encryptJsonWithKey(
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

// ─────────────────────────────────────────────
// ClientComment (content field)
// Note: ClientComment has no organizationId — pass the parent client's orgId.
// Delegates to Message helpers (same {content?: string | null} shape).
// ─────────────────────────────────────────────

export async function encryptClientCommentForOrg<T extends MessageWithContent>(
  data: T,
  orgId: string
): Promise<T> {
  return encryptMessageForOrg(data, orgId);
}

export async function decryptClientCommentForOrg<T extends MessageWithContent>(
  record: T,
  orgId: string
): Promise<T> {
  return decryptMessageForOrg(record, orgId);
}

// ─────────────────────────────────────────────
// TaskComment (comment field — note: field name is "comment", not "content")
// crm_Accounts_Tasks_Comments uses "comment" as the text field.
// We wrap it into a content-compatible shape for the Message helpers.
// ─────────────────────────────────────────────

type TaskCommentWithComment = { comment?: string | null; [key: string]: any };

export async function encryptTaskCommentForOrg<T extends TaskCommentWithComment>(
  data: T,
  orgId: string
): Promise<T> {
  if (data.comment == null) return data;
  const wrapped = { content: data.comment } as MessageWithContent;
  const encrypted = await encryptMessageForOrg(wrapped, orgId);
  return { ...data, comment: encrypted.content } as T;
}

export async function decryptTaskCommentForOrg<T extends TaskCommentWithComment>(
  record: T,
  orgId: string
): Promise<T> {
  if (record.comment == null) return record;
  const wrapped = { content: record.comment } as MessageWithContent;
  const decrypted = await decryptMessageForOrg(wrapped, orgId);
  return { ...record, comment: decrypted.content } as T;
}

// ─────────────────────────────────────────────
// MyAccount (banking/tax PII)
// ─────────────────────────────────────────────

const MYACCOUNT_ENCRYPTED_STRING_FIELDS = [
  "VAT_number",
  "TAX_number",
  "bank_name",
  "bank_account",
  "bank_code",
  "bank_IBAN",
  "bank_SWIFT",
  "email_accountant",
] as const;

type MyAccountStringField = (typeof MYACCOUNT_ENCRYPTED_STRING_FIELDS)[number];
type MyAccountWithEncryptedFields = Partial<Record<MyAccountStringField, string | null | undefined>>;

export async function encryptMyAccountForOrg<T extends MyAccountWithEncryptedFields>(
  data: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...data } as T & MyAccountWithEncryptedFields;
  for (const field of MYACCOUNT_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = encryptFieldWithKey(
        result[field] as string | null | undefined,
        dek
      );
    }
  }
  return result as T;
}

export async function decryptMyAccountForOrg<T extends MyAccountWithEncryptedFields>(
  record: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...record } as T & MyAccountWithEncryptedFields;
  for (const field of MYACCOUNT_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = decryptFieldWithKey(
        result[field] as string | null | undefined,
        dek
      );
    }
  }
  return result as T;
}

// ─────────────────────────────────────────────
// NewsletterSubscriber (email/name PII)
// ─────────────────────────────────────────────

const NEWSLETTER_ENCRYPTED_STRING_FIELDS = [
  "email",
  "firstName",
  "lastName",
] as const;

type NewsletterStringField = (typeof NEWSLETTER_ENCRYPTED_STRING_FIELDS)[number];
type NewsletterWithEncryptedFields = Partial<Record<NewsletterStringField, string | null | undefined>>;

export async function encryptNewsletterSubscriberForOrg<T extends NewsletterWithEncryptedFields>(
  data: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...data } as T & NewsletterWithEncryptedFields;
  for (const field of NEWSLETTER_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = encryptFieldWithKey(
        result[field] as string | null | undefined,
        dek
      );
    }
  }
  return result as T;
}

export async function decryptNewsletterSubscriberForOrg<T extends NewsletterWithEncryptedFields>(
  record: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...record } as T & NewsletterWithEncryptedFields;
  for (const field of NEWSLETTER_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = decryptFieldWithKey(
        result[field] as string | null | undefined,
        dek
      );
    }
  }
  return result as T;
}

// ─────────────────────────────────────────────
// AgentContactSubmission (public form PII)
// Note: AgentProfile has no organizationId — the org must be resolved from
// the agent's Clerk user → org membership before calling these functions.
// ─────────────────────────────────────────────

const AGENT_CONTACT_ENCRYPTED_STRING_FIELDS = [
  "senderName",
  "senderEmail",
  "notes",
] as const;

type AgentContactStringField = (typeof AGENT_CONTACT_ENCRYPTED_STRING_FIELDS)[number];
type AgentContactWithEncryptedFields = Partial<Record<AgentContactStringField, string | null | undefined>> & {
  formData?: Prisma.JsonValue | null;
};

export async function encryptAgentContactForOrg<T extends AgentContactWithEncryptedFields>(
  data: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...data } as T & AgentContactWithEncryptedFields;
  for (const field of AGENT_CONTACT_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = encryptFieldWithKey(
        result[field] as string | null | undefined,
        dek
      );
    }
  }
  if ("formData" in result) {
    result.formData = encryptJsonWithKey(result.formData, dek);
  }
  return result as T;
}

export async function decryptAgentContactForOrg<T extends AgentContactWithEncryptedFields>(
  record: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...record } as T & AgentContactWithEncryptedFields;
  for (const field of AGENT_CONTACT_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = decryptFieldWithKey(
        result[field] as string | null | undefined,
        dek
      );
    }
  }
  if ("formData" in result) {
    result.formData = decryptJsonWithKey(result.formData, dek);
  }
  return result as T;
}

// ─── Activity ────────────────────────────────────────────────────────────────

const ACTIVITY_ENCRYPTED_STRING_FIELDS = [
  "subject",
  "body",
  "outcome",
] as const;

type ActivityStringField = (typeof ACTIVITY_ENCRYPTED_STRING_FIELDS)[number];

type ActivityWithEncryptedFields = Partial<
  Record<ActivityStringField, string | null | undefined>
>;

export async function encryptActivityForOrg<T extends ActivityWithEncryptedFields>(
  data: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...data } as T & ActivityWithEncryptedFields;
  for (const field of ACTIVITY_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = encryptFieldWithKey(
        result[field] as string | null | undefined,
        dek
      );
    }
  }
  return result as T;
}

export async function decryptActivityForOrg<T extends ActivityWithEncryptedFields>(
  data: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...data } as T & ActivityWithEncryptedFields;
  for (const field of ACTIVITY_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = decryptFieldWithKey(
        result[field] as string | null | undefined,
        dek
      );
    }
  }
  return result as T;
}

// ─── OrgDocumentTemplate ──────────────────────────────────────────────────────

const ORG_DOCUMENT_TEMPLATE_ENCRYPTED_STRING_FIELDS = [
  "name",
] as const;

type OrgDocumentTemplateStringField =
  (typeof ORG_DOCUMENT_TEMPLATE_ENCRYPTED_STRING_FIELDS)[number];

type OrgDocumentTemplateWithEncryptedFields = Partial<
  Record<OrgDocumentTemplateStringField, string | null | undefined>
>;

export async function encryptOrgDocumentTemplateForOrg<
  T extends OrgDocumentTemplateWithEncryptedFields
>(data: T, orgId: string): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...data } as T & OrgDocumentTemplateWithEncryptedFields;
  for (const field of ORG_DOCUMENT_TEMPLATE_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = encryptFieldWithKey(
        result[field] as string | null | undefined,
        dek
      );
    }
  }
  return result as T;
}

export async function decryptOrgDocumentTemplateForOrg<
  T extends OrgDocumentTemplateWithEncryptedFields
>(data: T, orgId: string): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...data } as T & OrgDocumentTemplateWithEncryptedFields;
  for (const field of ORG_DOCUMENT_TEMPLATE_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = decryptFieldWithKey(
        result[field] as string | null | undefined,
        dek
      );
    }
  }
  return result as T;
}

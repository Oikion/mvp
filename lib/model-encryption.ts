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
 * Usage on WRITE: const encrypted = await encryptContactForOrg(data, orgId);
 * Usage on READ:  const record = await prismadb.contact.findFirst(...); return decryptContactForOrg(record, orgId);
 */

import { encryptWithKey, decryptWithKey, decryptWithKeys, isEncrypted } from "@/lib/encryption";
import { getOrgDek, getOrgDeksForDecryption } from "@/lib/key-management";
import type { Prisma } from "@prisma/client";

// ─────────────────────────────────────────────
// Contacts (v2.0 — replaces Clients)
// ─────────────────────────────────────────────

const CONTACT_ENCRYPTED_STRING_FIELDS = [
  "firstName",
  "lastName",
  "displayName",
  "companyName",
  "email",
  "secondaryEmail",
  "primaryPhone",
  "secondaryPhone",
  "officePhone",
  "whatsapp",
  "viber",
  "taxId",
  "doy",
  "vatNumber",
  "companyGemi",
  "companyId",
  "idDocument",
  "notes",
] as const;

type ContactStringField = (typeof CONTACT_ENCRYPTED_STRING_FIELDS)[number];
type ContactWithEncryptedFields = Partial<Record<ContactStringField, string | null | undefined>> & {
  communicationNotes?: Prisma.JsonValue | null;
  addresses?: Prisma.JsonValue | null;
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

function decryptFieldWithKeys(value: string | null | undefined, deks: Buffer[]): string | null | undefined {
  if (value == null) return value;
  if (!isEncrypted(value)) return value;
  try {
    return decryptWithKeys(value, deks);
  } catch {
    console.warn("[model-encryption] decryptFieldWithKeys: could not decrypt field — returning null (orphaned or unrecoverable ciphertext)");
    return null;
  }
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

function decryptJsonWithKeys(
  value: Prisma.JsonValue | null | undefined,
  deks: Buffer[]
): Prisma.JsonValue | null | undefined {
  if (value == null) return value;
  if (typeof value === "string" && isEncrypted(value)) {
    try {
      const decrypted = decryptWithKeys(value, deks);
      try {
        return JSON.parse(decrypted) as Prisma.JsonValue;
      } catch {
        return decrypted as Prisma.JsonValue;
      }
    } catch {
      console.warn("[model-encryption] decryptJsonWithKeys: could not decrypt JSON field — returning null (orphaned or unrecoverable ciphertext)");
      return null;
    }
  }
  return value;
}

// ─────────────────────────────────────────────
// Per-org async helpers
// Each fetches the org DEK once, then applies the same field logic as the
// sync helpers above. Falls back to master key automatically via decryptWithKey.
// ─────────────────────────────────────────────

export async function encryptContactForOrg<T extends ContactWithEncryptedFields>(
  data: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...data } as T & ContactWithEncryptedFields;
  for (const field of CONTACT_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = encryptFieldWithKey(
        result[field] as string | null | undefined,
        dek
      );
    }
  }
  if ("communicationNotes" in result) {
    result.communicationNotes = encryptJsonWithKey(result.communicationNotes, dek);
  }
  if ("addresses" in result) {
    result.addresses = encryptJsonWithKey(result.addresses, dek);
  }
  return result as T;
}

export async function decryptContactForOrg<T extends ContactWithEncryptedFields>(
  record: T,
  orgId: string
): Promise<T> {
  const deks = await getOrgDeksForDecryption(orgId);
  const result = { ...record } as T & ContactWithEncryptedFields;
  for (const field of CONTACT_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = decryptFieldWithKeys(
        result[field] as string | null | undefined,
        deks
      );
    }
  }
  if ("communicationNotes" in result) {
    result.communicationNotes = decryptJsonWithKeys(result.communicationNotes, deks);
  }
  if ("addresses" in result) {
    result.addresses = decryptJsonWithKeys(result.addresses, deks);
  }
  return result as T;
}

// ContactComment (content field) — delegates to Message helpers
export async function encryptContactCommentForOrg<T extends MessageWithContent>(
  data: T,
  orgId: string
): Promise<T> {
  return encryptMessageForOrg(data, orgId);
}

export async function decryptContactCommentForOrg<T extends MessageWithContent>(
  record: T,
  orgId: string
): Promise<T> {
  return decryptMessageForOrg(record, orgId);
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
  const deks = await getOrgDeksForDecryption(orgId);
  if (!("content" in record)) return record;
  return { ...record, content: decryptFieldWithKeys(record.content, deks) };
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
  const deks = await getOrgDeksForDecryption(orgId);
  const result = { ...record } as T & CalendarWithEncryptedFields;
  for (const field of CALENDAR_ENCRYPTED_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = decryptFieldWithKeys(
        result[field] as string | null | undefined,
        deks
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
  const deks = await getOrgDeksForDecryption(orgId);
  const result = { ...record };
  if ("document_name" in result) {
    result.document_name = decryptFieldWithKeys(result.document_name, deks);
  }
  if ("description" in result) {
    result.description = decryptFieldWithKeys(result.description, deks);
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
  const deks = await getOrgDeksForDecryption(orgId);
  const result = { ...record };
  if ("primary_email" in result) {
    result.primary_email = decryptFieldWithKeys(result.primary_email, deks);
  }
  if ("communication_notes" in result) {
    result.communication_notes = decryptJsonWithKeys(result.communication_notes, deks);
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
  const deks = await getOrgDeksForDecryption(orgId);
  const result = { ...record } as T & MandateWithEncryptedFields;
  for (const field of MANDATE_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = decryptFieldWithKeys(
        result[field] as string | null | undefined,
        deks
      );
    }
  }
  if ("communication_notes" in result) {
    result.communication_notes = decryptJsonWithKeys(result.communication_notes, deks);
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
// Requests (v2.0 — replaces Mandates)
// ─────────────────────────────────────────────

const REQUEST_ENCRYPTED_STRING_FIELDS = [
  "title",
  "notes",
  "locationDisplayName",
] as const;

type RequestStringField = (typeof REQUEST_ENCRYPTED_STRING_FIELDS)[number];
type RequestWithEncryptedFields = Partial<Record<RequestStringField, string | null | undefined>> & {
  communicationNotes?: Prisma.JsonValue | null;
  areasOfInterest?: Prisma.JsonValue | null;
};

export async function encryptRequestForOrg<T extends RequestWithEncryptedFields>(
  data: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...data } as T & RequestWithEncryptedFields;
  for (const field of REQUEST_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = encryptFieldWithKey(
        result[field] as string | null | undefined,
        dek
      );
    }
  }
  if ("communicationNotes" in result) {
    result.communicationNotes = encryptJsonWithKey(result.communicationNotes, dek);
  }
  if ("areasOfInterest" in result) {
    result.areasOfInterest = encryptJsonWithKey(result.areasOfInterest, dek);
  }
  return result as T;
}

export async function decryptRequestForOrg<T extends RequestWithEncryptedFields>(
  record: T,
  orgId: string
): Promise<T> {
  const deks = await getOrgDeksForDecryption(orgId);
  const result = { ...record } as T & RequestWithEncryptedFields;
  for (const field of REQUEST_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = decryptFieldWithKeys(
        result[field] as string | null | undefined,
        deks
      );
    }
  }
  if ("communicationNotes" in result) {
    result.communicationNotes = decryptJsonWithKeys(result.communicationNotes, deks);
  }
  if ("areasOfInterest" in result) {
    result.areasOfInterest = decryptJsonWithKeys(result.areasOfInterest, deks);
  }
  return result as T;
}

// RequestComment (content field) — delegates to Message helpers
export async function encryptRequestCommentForOrg<T extends MessageWithContent>(
  data: T,
  orgId: string
): Promise<T> {
  return encryptMessageForOrg(data, orgId);
}

export async function decryptRequestCommentForOrg<T extends MessageWithContent>(
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
  const deks = await getOrgDeksForDecryption(orgId);
  const result = { ...record } as T & MyAccountWithEncryptedFields;
  for (const field of MYACCOUNT_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = decryptFieldWithKeys(
        result[field] as string | null | undefined,
        deks
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
  const deks = await getOrgDeksForDecryption(orgId);
  const result = { ...record } as T & NewsletterWithEncryptedFields;
  for (const field of NEWSLETTER_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = decryptFieldWithKeys(
        result[field] as string | null | undefined,
        deks
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
  const deks = await getOrgDeksForDecryption(orgId);
  const result = { ...record } as T & AgentContactWithEncryptedFields;
  for (const field of AGENT_CONTACT_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = decryptFieldWithKeys(
        result[field] as string | null | undefined,
        deks
      );
    }
  }
  if ("formData" in result) {
    result.formData = decryptJsonWithKeys(result.formData, deks);
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
  record: T,
  orgId: string
): Promise<T> {
  const dek = await getOrgDek(orgId);
  const result = { ...record } as T & ActivityWithEncryptedFields;
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
  record: T,
  orgId: string
): Promise<T> {
  const deks = await getOrgDeksForDecryption(orgId);
  const result = { ...record } as T & ActivityWithEncryptedFields;
  for (const field of ACTIVITY_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = decryptFieldWithKeys(
        result[field] as string | null | undefined,
        deks
      );
    }
  }
  return result as T;
}

// ─── OrgDocumentTemplate ──────────────────────────────────────────────────────

// NOTE: `body` (TipTap JSON) and `placeholders` are intentionally NOT included here.
// Template bodies are agency-owned contractual assets, not contact PII, and are
// excluded from per-org DEK encryption to preserve content searchability/indexing.
// Only display names (name/nameEl/nameEn) are encrypted as they may contain
// client-identifying information in some naming conventions.
const ORG_DOCUMENT_TEMPLATE_ENCRYPTED_STRING_FIELDS = [
  "name",
  "nameEl",
  "nameEn",
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
>(record: T, orgId: string): Promise<T> {
  const deks = await getOrgDeksForDecryption(orgId);
  const result = { ...record } as T & OrgDocumentTemplateWithEncryptedFields;
  for (const field of ORG_DOCUMENT_TEMPLATE_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = decryptFieldWithKeys(
        result[field] as string | null | undefined,
        deks
      );
    }
  }
  return result as T;
}

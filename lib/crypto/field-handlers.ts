/**
 * Field Encryption Handlers for E2EE
 * 
 * Provides model-specific encryption/decryption functions for sensitive PII fields.
 * These are used by server actions to encrypt data before writing to DB
 * and decrypt data after reading from DB.
 */

import { encryptField, decryptField, isEncrypted } from "./encryption";

// =============================================================================
// Clients Model
// =============================================================================

const CLIENT_SENSITIVE_FIELDS = [
  "client_name",
  "primary_email",
  "secondary_email",
  "primary_phone",
  "office_phone",
  "fax",
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
  "communication_notes",
  "description",
  "afm",
  "vat",
  "doy",
  "id_doc",
] as const;

export type ClientSensitiveField = (typeof CLIENT_SENSITIVE_FIELDS)[number];

export async function encryptClientFields<T extends Record<string, unknown>>(
  client: T,
  omk: CryptoKey
): Promise<T> {
  const result = { ...client };
  
  for (const field of CLIENT_SENSITIVE_FIELDS) {
    const value = client[field];
    if (typeof value === "string" && value && !isEncrypted(value)) {
      result[field as keyof T] = (await encryptField(value, omk)) as T[keyof T];
    }
  }
  
  return result;
}

export async function decryptClientFields<T extends Record<string, unknown>>(
  client: T,
  omk: CryptoKey
): Promise<T> {
  const result = { ...client };
  
  for (const field of CLIENT_SENSITIVE_FIELDS) {
    const value = client[field];
    if (typeof value === "string" && isEncrypted(value)) {
      result[field as keyof T] = (await decryptField(value, omk)) as T[keyof T];
    }
  }
  
  return result;
}

// =============================================================================
// Client_Contacts Model
// =============================================================================

const CLIENT_CONTACT_SENSITIVE_FIELDS = [
  "email",
  "personal_email",
  "office_phone",
  "mobile_phone",
  "contact_first_name",
  "contact_last_name",
  "birthday",
  "description",
] as const;

export async function encryptClientContactFields<T extends Record<string, unknown>>(
  contact: T,
  omk: CryptoKey
): Promise<T> {
  const result = { ...contact };
  
  for (const field of CLIENT_CONTACT_SENSITIVE_FIELDS) {
    const value = contact[field];
    if (typeof value === "string" && value && !isEncrypted(value)) {
      result[field as keyof T] = (await encryptField(value, omk)) as T[keyof T];
    }
  }
  
  return result;
}

export async function decryptClientContactFields<T extends Record<string, unknown>>(
  contact: T,
  omk: CryptoKey
): Promise<T> {
  const result = { ...contact };
  
  for (const field of CLIENT_CONTACT_SENSITIVE_FIELDS) {
    const value = contact[field];
    if (typeof value === "string" && isEncrypted(value)) {
      result[field as keyof T] = (await decryptField(value, omk)) as T[keyof T];
    }
  }
  
  return result;
}

// =============================================================================
// Properties Model
// =============================================================================

const PROPERTY_SENSITIVE_FIELDS = [
  "primary_email",
  "communication_notes",
  "address_street",
  "address_city",
  "address_state",
  "address_zip",
  "postal_code",
] as const;

export async function encryptPropertyFields<T extends Record<string, unknown>>(
  property: T,
  omk: CryptoKey
): Promise<T> {
  const result = { ...property };
  
  for (const field of PROPERTY_SENSITIVE_FIELDS) {
    const value = property[field];
    if (typeof value === "string" && value && !isEncrypted(value)) {
      result[field as keyof T] = (await encryptField(value, omk)) as T[keyof T];
    }
  }
  
  return result;
}

export async function decryptPropertyFields<T extends Record<string, unknown>>(
  property: T,
  omk: CryptoKey
): Promise<T> {
  const result = { ...property };
  
  for (const field of PROPERTY_SENSITIVE_FIELDS) {
    const value = property[field];
    if (typeof value === "string" && isEncrypted(value)) {
      result[field as keyof T] = (await decryptField(value, omk)) as T[keyof T];
    }
  }
  
  return result;
}

// =============================================================================
// Property_Contacts Model
// =============================================================================

const PROPERTY_CONTACT_SENSITIVE_FIELDS = [
  "email",
  "phone",
  "contact_first_name",
  "contact_last_name",
  "description",
] as const;

export async function encryptPropertyContactFields<T extends Record<string, unknown>>(
  contact: T,
  omk: CryptoKey
): Promise<T> {
  const result = { ...contact };
  
  for (const field of PROPERTY_CONTACT_SENSITIVE_FIELDS) {
    const value = contact[field];
    if (typeof value === "string" && value && !isEncrypted(value)) {
      result[field as keyof T] = (await encryptField(value, omk)) as T[keyof T];
    }
  }
  
  return result;
}

export async function decryptPropertyContactFields<T extends Record<string, unknown>>(
  contact: T,
  omk: CryptoKey
): Promise<T> {
  const result = { ...contact };
  
  for (const field of PROPERTY_CONTACT_SENSITIVE_FIELDS) {
    const value = contact[field];
    if (typeof value === "string" && isEncrypted(value)) {
      result[field as keyof T] = (await decryptField(value, omk)) as T[keyof T];
    }
  }
  
  return result;
}

// =============================================================================
// CalendarEvent Model
// =============================================================================

const CALENDAR_EVENT_SENSITIVE_FIELDS = [
  "attendeeEmail",
  "attendeeName",
  "location",
  "notes",
] as const;

export async function encryptCalendarEventFields<T extends Record<string, unknown>>(
  event: T,
  omk: CryptoKey
): Promise<T> {
  const result = { ...event };
  
  for (const field of CALENDAR_EVENT_SENSITIVE_FIELDS) {
    const value = event[field];
    if (typeof value === "string" && value && !isEncrypted(value)) {
      result[field as keyof T] = (await encryptField(value, omk)) as T[keyof T];
    }
  }
  
  return result;
}

export async function decryptCalendarEventFields<T extends Record<string, unknown>>(
  event: T,
  omk: CryptoKey
): Promise<T> {
  const result = { ...event };
  
  for (const field of CALENDAR_EVENT_SENSITIVE_FIELDS) {
    const value = event[field];
    if (typeof value === "string" && isEncrypted(value)) {
      result[field as keyof T] = (await decryptField(value, omk)) as T[keyof T];
    }
  }
  
  return result;
}

// =============================================================================
// Message Model
// =============================================================================

const MESSAGE_SENSITIVE_FIELDS = ["content"] as const;

export async function encryptMessageFields<T extends Record<string, unknown>>(
  message: T,
  omk: CryptoKey
): Promise<T> {
  const result = { ...message };
  
  for (const field of MESSAGE_SENSITIVE_FIELDS) {
    const value = message[field];
    if (typeof value === "string" && value && !isEncrypted(value)) {
      result[field as keyof T] = (await encryptField(value, omk)) as T[keyof T];
    }
  }
  
  return result;
}

export async function decryptMessageFields<T extends Record<string, unknown>>(
  message: T,
  omk: CryptoKey
): Promise<T> {
  const result = { ...message };
  
  for (const field of MESSAGE_SENSITIVE_FIELDS) {
    const value = message[field];
    if (typeof value === "string" && isEncrypted(value)) {
      result[field as keyof T] = (await decryptField(value, omk)) as T[keyof T];
    }
  }
  
  return result;
}

// =============================================================================
// Deal Model
// =============================================================================

const DEAL_SENSITIVE_FIELDS = ["notes", "title"] as const;

export async function encryptDealFields<T extends Record<string, unknown>>(
  deal: T,
  omk: CryptoKey
): Promise<T> {
  const result = { ...deal };
  
  for (const field of DEAL_SENSITIVE_FIELDS) {
    const value = deal[field];
    if (typeof value === "string" && value && !isEncrypted(value)) {
      result[field as keyof T] = (await encryptField(value, omk)) as T[keyof T];
    }
  }
  
  return result;
}

export async function decryptDealFields<T extends Record<string, unknown>>(
  deal: T,
  omk: CryptoKey
): Promise<T> {
  const result = { ...deal };
  
  for (const field of DEAL_SENSITIVE_FIELDS) {
    const value = deal[field];
    if (typeof value === "string" && isEncrypted(value)) {
      result[field as keyof T] = (await decryptField(value, omk)) as T[keyof T];
    }
  }
  
  return result;
}

// =============================================================================
// Comment Models (ClientComment, PropertyComment, crm_Accounts_Tasks_Comments)
// =============================================================================

const COMMENT_SENSITIVE_FIELDS = ["content", "comment"] as const;

export async function encryptCommentFields<T extends Record<string, unknown>>(
  comment: T,
  omk: CryptoKey
): Promise<T> {
  const result = { ...comment };
  
  for (const field of COMMENT_SENSITIVE_FIELDS) {
    const value = comment[field];
    if (typeof value === "string" && value && !isEncrypted(value)) {
      result[field as keyof T] = (await encryptField(value, omk)) as T[keyof T];
    }
  }
  
  return result;
}

export async function decryptCommentFields<T extends Record<string, unknown>>(
  comment: T,
  omk: CryptoKey
): Promise<T> {
  const result = { ...comment };
  
  for (const field of COMMENT_SENSITIVE_FIELDS) {
    const value = comment[field];
    if (typeof value === "string" && isEncrypted(value)) {
      result[field as keyof T] = (await decryptField(value, omk)) as T[keyof T];
    }
  }
  
  return result;
}

// =============================================================================
// Batch Processing Utilities
// =============================================================================

export async function encryptClientsBatch<T extends Record<string, unknown>>(
  clients: T[],
  omk: CryptoKey
): Promise<T[]> {
  return Promise.all(clients.map((client) => encryptClientFields(client, omk)));
}

export async function decryptClientsBatch<T extends Record<string, unknown>>(
  clients: T[],
  omk: CryptoKey
): Promise<T[]> {
  return Promise.all(clients.map((client) => decryptClientFields(client, omk)));
}

export async function encryptPropertiesBatch<T extends Record<string, unknown>>(
  properties: T[],
  omk: CryptoKey
): Promise<T[]> {
  return Promise.all(properties.map((property) => encryptPropertyFields(property, omk)));
}

export async function decryptPropertiesBatch<T extends Record<string, unknown>>(
  properties: T[],
  omk: CryptoKey
): Promise<T[]> {
  return Promise.all(properties.map((property) => decryptPropertyFields(property, omk)));
}

// =============================================================================
// Field Detection Utility
// =============================================================================

/**
 * Check if an object has any encrypted fields
 */
export function hasEncryptedFields(obj: Record<string, unknown>): boolean {
  for (const value of Object.values(obj)) {
    if (typeof value === "string" && isEncrypted(value)) {
      return true;
    }
  }
  return false;
}

/**
 * Get list of encrypted field names in an object
 */
export function getEncryptedFieldNames(obj: Record<string, unknown>): string[] {
  const encryptedFields: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string" && isEncrypted(value)) {
      encryptedFields.push(key);
    }
  }
  return encryptedFields;
}

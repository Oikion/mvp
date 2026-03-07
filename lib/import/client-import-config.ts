/**
 * lib/import/client-import-config.ts
 *
 * Import configuration for client records.
 * Consumed by the unified import engine at lib/import/engine.ts.
 * Defines validation, encryption, and transformation for database insertion.
 */

import type { ImportEntityConfig } from "./engine";
import { clientImportSchema, type ClientImportData } from "./client-import-schema";
import { normalizeClientEnums } from "./enum-normalizer";
import { encryptWithKey, isEncrypted } from "@/lib/encryption";

/**
 * The 23 string fields that must be encrypted, matching
 * CLIENT_ENCRYPTED_STRING_FIELDS in lib/model-encryption.ts.
 */
const ENCRYPTED_STRING_FIELDS = [
  "client_name",
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

export const clientImportConfig: ImportEntityConfig<ClientImportData> = {
  prismaModel: "clients",
  entityIdType: "Clients",

  // Cast needed: .default(false) on boolean fields makes ZodObject input type
  // diverge from output type, but ImportEntityConfig expects ZodSchema<Output>.
  importSchema: clientImportSchema as unknown as ImportEntityConfig<ClientImportData>["importSchema"],
  normalizeEnums: normalizeClientEnums,

  encryptWithDek(
    data: Record<string, unknown>,
    dek: Buffer
  ): Record<string, unknown> {
    const encrypted: Record<string, unknown> = {};

    for (const field of ENCRYPTED_STRING_FIELDS) {
      const value = data[field];
      if (typeof value === "string" && value !== "" && !isEncrypted(value)) {
        encrypted[field] = encryptWithKey(value, dek);
      }
    }

    return encrypted;
  },

  toPrismaData(
    item: ClientImportData,
    encryptedFields: Record<string, unknown>,
    friendlyId: string,
    userId: string,
    orgId: string
  ): Record<string, unknown> {
    /** Prefer the encrypted value if present, otherwise fall back to the raw item value. */
    const e = (field: keyof ClientImportData) =>
      (encryptedFields[field] as string | undefined) ?? item[field] ?? null;

    return {
      friendlyId,
      createdBy: userId,
      updatedBy: userId,
      organizationId: orgId,

      // Core / contact (encrypted)
      client_name: e("client_name"),
      primary_email: e("primary_email") || null,
      primary_phone: e("primary_phone") || null,
      office_phone: e("office_phone") || null,
      secondary_phone: e("secondary_phone") || null,
      secondary_email: e("secondary_email") || null,

      // Classification
      client_type: item.client_type || null,
      client_status: item.client_status || "LEAD",
      person_type: item.person_type || null,
      intent: item.intent || null,

      // Company details
      company_name: item.company_name || null,
      company_id: item.company_id || null,
      vat: e("vat") || null,
      website: item.website || null,
      fax: e("fax") || null,

      // Greece-specific (encrypted)
      afm: e("afm") || null,
      doy: e("doy") || null,
      id_doc: e("id_doc") || null,
      company_gemi: e("company_gemi") || null,

      // Billing address (encrypted)
      billing_street: e("billing_street") || null,
      billing_city: e("billing_city") || null,
      billing_state: e("billing_state") || null,
      billing_postal_code: e("billing_postal_code") || null,
      billing_country: e("billing_country") || null,

      // Preferences
      purpose: item.purpose || null,
      budget_min: item.budget_min ?? null,
      budget_max: item.budget_max ?? null,
      timeline: item.timeline || null,

      // Financing
      financing_type: item.financing_type || null,
      preapproval_bank: item.preapproval_bank || null,
      needs_mortgage_help: item.needs_mortgage_help || false,

      // Lead source & consent
      lead_source: item.lead_source || null,
      gdpr_consent: item.gdpr_consent || false,
      allow_marketing: item.allow_marketing || false,

      // Additional
      description: e("description") || null,
      member_of: item.member_of || null,

      // Always insert as a non-draft
      draft_status: false,
    };
  },
};

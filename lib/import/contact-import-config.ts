/**
 * lib/import/contact-import-config.ts
 *
 * Import configuration for contact records.
 * Consumed by the unified import engine at lib/import/engine.ts.
 * Defines validation, encryption, and transformation for database insertion.
 */

import type { ImportEntityConfig } from "./types";
import { contactImportSchema, type ContactImportData } from "./contact-import-schema";
import { normalizeContactEnums } from "./enum-normalizer";
import { encryptWithKey, isEncrypted } from "@/lib/encryption";
import { encryptJsonWithKey } from "@/lib/model-encryption";

/**
 * The encrypted string fields for the Contact model.
 * Note: fax, billing_state, and shipping_state are intentionally omitted
 * as they are not present on the Contact model.
 */
const ENCRYPTED_STRING_FIELDS = [
  "contact_name",
  "company_name",
  "company_id",
  "primary_email",
  "secondary_email",
  "primary_phone",
  "secondary_phone",
  "office_phone",
  "afm",
  "vat",
  "doy",
  "id_doc",
  "company_gemi",
  "description",
  "billing_street",
  "billing_city",
  "billing_postal_code",
  "billing_country",
  "shipping_street",
  "shipping_city",
  "shipping_postal_code",
  "shipping_country",
] as const;

export const contactImportConfig: ImportEntityConfig<ContactImportData> = {
  prismaModel: "contact",
  entityIdType: "Contacts",

  // Cast needed: .default(false) on boolean fields makes ZodObject input type
  // diverge from output type, but ImportEntityConfig expects ZodSchema<Output>.
  importSchema: contactImportSchema as unknown as ImportEntityConfig<ContactImportData>["importSchema"],
  normalizeEnums: normalizeContactEnums,

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

    if (data.communication_notes != null) {
      encrypted.communication_notes = encryptJsonWithKey(data.communication_notes, dek);
    }

    return encrypted;
  },

  toPrismaData(
    item: ContactImportData,
    encrypted: Record<string, string | null>,
    friendlyId: string,
    userId: string,
    orgId: string,
  ): Record<string, unknown> {
    const e = (key: string) => encrypted[key] ?? null;

    // Build addresses Json array from billing/shipping fields
    const addresses: Array<Record<string, string | null>> = [];
    if (e("billing_street") || item.billing_city) {
      addresses.push({
        type: "billing",
        street: e("billing_street"),
        city: e("billing_city"),
        postalCode: e("billing_postal_code"),
        country: e("billing_country"),
      });
    }
    if (e("shipping_street") || item.shipping_city) {
      addresses.push({
        type: "shipping",
        street: e("shipping_street"),
        city: e("shipping_city"),
        postalCode: e("shipping_postal_code"),
        country: e("shipping_country"),
      });
    }

    return {
      friendlyId,
      organizationId: orgId,
      createdBy: userId,
      updatedBy: userId,

      // Identity — firstName/lastName not in ContactImportData CSV schema
      displayName: e("contact_name") ?? item.contact_name ?? "",
      firstName: null,
      lastName: null,
      isCompany: item.person_type === "COMPANY",
      companyName: e("company_name"),
      companyId: e("company_id"),

      // Contact info
      email: e("primary_email"),
      secondaryEmail: e("secondary_email"),
      primaryPhone: e("primary_phone"),
      secondaryPhone: e("secondary_phone"),
      officePhone: e("office_phone"),

      // Tax / legal
      taxId: e("afm"),
      vatNumber: e("vat"),
      doy: e("doy"),
      idDocument: e("id_doc"),
      companyGemi: e("company_gemi"),

      // Classification
      // contact_type is a single CSV value; ContactCategory is an array on the model
      category: item.contact_type ? [item.contact_type] : [],
      status: item.contact_status ?? "LEAD",
      source: item.lead_source ?? null,

      // Address Json
      addresses: addresses.length > 0 ? addresses : null,

      // Notes / consent
      notes: e("description"),
      gdprConsentGiven: item.gdpr_consent ?? false,
      allowMarketing: item.allow_marketing ?? false,

      // Visibility
      visibility: item.visibility ?? "PRIVATE",

      // Dropped fields (no equivalent on Contact model):
      // fax, website, member_of → silently omitted
    };
  },
};

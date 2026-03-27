/**
 * lib/import/mandate-import-config.ts
 *
 * Import configuration for mandate records.
 * Consumed by the unified import engine at lib/import/engine.ts.
 * Defines validation, encryption, and transformation for database insertion.
 */

import type { ImportEntityConfig } from "./engine";
import {
  mandateImportSchema,
  type MandateImportData,
} from "./mandate-import-schema";
import { normalizeMandateEnums } from "./enum-normalizer";
import { encryptWithKey, isEncrypted } from "@/lib/encryption";
import { encryptJsonWithKey } from "@/lib/model-encryption";
import { coerceDate } from "./zod-helpers";

/**
 * The 2 string fields that must be encrypted, matching
 * MANDATE_ENCRYPTED_STRING_FIELDS in lib/model-encryption.ts.
 */
const ENCRYPTED_STRING_FIELDS = ["title", "notes"] as const;

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function toDateTime(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value;
  // Use coerceDate to handle DD/MM/YYYY and other European formats
  const isoStr = coerceDate(value);
  if (!isoStr) return null;
  const date = new Date(isoStr);
  return Number.isNaN(date.getTime()) ? null : date;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const mandateImportConfig: ImportEntityConfig<MandateImportData> = {
  prismaModel: "mandate",
  entityIdType: "Mandates",

  // Cast needed: .default(false) on boolean fields makes ZodObject input type
  // diverge from output type, but ImportEntityConfig expects ZodSchema<Output>.
  importSchema:
    mandateImportSchema as unknown as ImportEntityConfig<MandateImportData>["importSchema"],
  normalizeEnums: normalizeMandateEnums,

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
    item: MandateImportData,
    encryptedFields: Record<string, unknown>,
    friendlyId: string,
    userId: string,
    orgId: string
  ): Record<string, unknown> {
    return {
      friendlyId,
      createdBy: userId,
      updatedBy: userId,
      organizationId: orgId,

      // Core (encrypted)
      title:
        (encryptedFields.title as string | undefined) ?? item.title,

      // Enums
      transaction_type: item.transaction_type || null,
      property_type: item.property_type || null,
      property_purpose: item.property_purpose || null,
      status: item.status || "DRAFT",
      urgency: item.urgency || "MEDIUM",
      timeline: item.timeline || null,

      // Budget
      budget_min: toNumber(item.budget_min),
      budget_max: toNumber(item.budget_max),

      // Size
      size_min_sqm: toNumber(item.size_min_sqm),
      size_max_sqm: toNumber(item.size_max_sqm),
      plot_size_min_sqm: toNumber(item.plot_size_min_sqm),
      plot_size_max_sqm: toNumber(item.plot_size_max_sqm),

      // Rooms
      bedrooms_min: toNumber(item.bedrooms_min),
      bedrooms_max: toNumber(item.bedrooms_max),
      bathrooms_min: toNumber(item.bathrooms_min),
      bathrooms_max: toNumber(item.bathrooms_max),

      // Floor / year
      floor_min: toNumber(item.floor_min),
      floor_max: toNumber(item.floor_max),
      year_built_min: toNumber(item.year_built_min),
      year_built_max: toNumber(item.year_built_max),

      // Array enums
      condition: item.condition || [],
      heating_type: item.heating_type || [],

      // Building enums
      energy_cert_min: item.energy_cert_min || null,
      furnished: item.furnished || null,

      // Booleans
      ground_floor_only: item.ground_floor_only || false,
      elevator: item.elevator ?? null,
      parking: item.parking ?? null,
      pets_allowed: item.pets_allowed ?? null,
      inside_city_plan: item.inside_city_plan ?? null,
      legalization_ok: item.legalization_ok || false,

      // Location
      municipality: item.municipality || null,
      region: item.region || null,

      // JSON arrays
      areas_of_interest: item.areas_of_interest || null,
      amenities: item.amenities || null,

      // Notes (encrypted)
      notes:
        (encryptedFields.notes as string | undefined) ?? (item.notes || null),

      // DateTime
      expires_at: toDateTime(item.expires_at),

      // Visibility (falls back to PRIVATE if not provided)
      visibility: item.visibility || "PRIVATE",

      // Always insert as non-draft
      draft_status: false,
    };
  },
};

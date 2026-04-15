/**
 * lib/import/request-import-config.ts
 *
 * Import configuration for request records.
 * Consumed by the unified import engine at lib/import/unified-engine.ts.
 * Defines validation, encryption, and transformation for database insertion.
 */

import type { ImportEntityConfig } from "./types";
import {
  requestImportSchema,
  type RequestImportData,
} from "./request-import-schema";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — normalizeRequestEnums will be added in Task 5
import { normalizeRequestEnums } from "./enum-normalizer";
import { encryptWithKey, isEncrypted } from "@/lib/encryption";
import { encryptJsonWithKey } from "@/lib/model-encryption";
import { coerceDate } from "./zod-helpers";

/**
 * Importable string fields that must be encrypted, matching the string subset
 * of REQUEST_ENCRYPTED_STRING_FIELDS in lib/model-encryption.ts.
 * Note: "locationDisplayName" is omitted because it has no CSV source field.
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

export const requestImportConfig: ImportEntityConfig<RequestImportData> = {
  prismaModel: "request",
  entityIdType: "Requests",

  // Cast needed: .default(false) on boolean fields makes ZodObject input type
  // diverge from output type, but ImportEntityConfig expects ZodSchema<Output>.
  importSchema:
    requestImportSchema as unknown as ImportEntityConfig<RequestImportData>["importSchema"],
  normalizeEnums: normalizeRequestEnums,

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
      // Stored as camelCase (communicationNotes) in the Request Prisma model
      encrypted.communicationNotes = encryptJsonWithKey(data.communication_notes, dek);
    }

    if (data.areas_of_interest != null) {
      // areasOfInterest is encrypted by encryptRequestForOrg — must match here
      encrypted.areasOfInterest = encryptJsonWithKey(data.areas_of_interest, dek);
    }

    return encrypted;
  },

  toPrismaData(
    item: RequestImportData,
    encryptedFields: Record<string, unknown>,
    friendlyId: string,
    userId: string,
    orgId: string
  ): Record<string, unknown> {
    // Safe accessor for encrypted string fields
    const e = (key: string): string | null => {
      const v = encryptedFields[key];
      return typeof v === "string" ? v : null;
    };

    return {
      friendlyId,
      createdBy: userId,
      updatedBy: userId,
      organizationId: orgId,

      // Core (encrypted string, nullable)
      title: e("title") ?? item.title ?? null,

      // Required enum — fallback to "BUY" (requestType has no DB default)
      requestType: item.transaction_type ?? "BUY",

      // propertyTypes is PropertyType[] array — wrap single CSV value
      propertyTypes: item.property_type ? [item.property_type] : [],

      // Enums
      propertyCategory: item.property_purpose || null,
      // RequestStatus has no DRAFT value — default to ACTIVE
      status: item.status || "ACTIVE",
      urgency: item.urgency || "MEDIUM",
      timeline: item.timeline || null,

      // Budget
      budgetMin: toNumber(item.budget_min),
      budgetMax: toNumber(item.budget_max),

      // Size (surfaceMin/Max map from size_min/max_sqm)
      surfaceMin: toNumber(item.size_min_sqm),
      surfaceMax: toNumber(item.size_max_sqm),
      plotSizeMin: toNumber(item.plot_size_min_sqm),
      plotSizeMax: toNumber(item.plot_size_max_sqm),

      // Rooms
      bedroomsMin: toNumber(item.bedrooms_min),
      bedroomsMax: toNumber(item.bedrooms_max),
      bathroomsMin: toNumber(item.bathrooms_min),
      bathroomsMax: toNumber(item.bathrooms_max),

      // Floor / construction year
      floorMin: toNumber(item.floor_min),
      floorMax: toNumber(item.floor_max),
      constructionYearMin: toNumber(item.year_built_min),
      constructionYearMax: toNumber(item.year_built_max),

      // Array enums
      conditionPreference: item.condition || [],
      heatingTypes: item.heating_type || [],

      // Building enums
      energyClassMin: item.energy_cert_min || null,
      furnished: item.furnished || null,

      // Booleans
      groundFloorOnly: item.ground_floor_only || false,
      requiresElevator: item.elevator ?? null,
      requiresParking: item.parking ?? null,
      petFriendly: item.pets_allowed ?? null,
      insideCityPlan: item.inside_city_plan ?? null,
      legalizationOk: item.legalization_ok || false,

      // Location
      municipality: item.municipality || null,
      region: item.region || null,

      // JSON arrays — areasOfInterest is encrypted (matches encryptRequestForOrg)
      areasOfInterest: encryptedFields.areasOfInterest ?? null,
      amenities: item.amenities || null,

      // Notes (encrypted string, nullable)
      notes: e("notes") ?? (item.notes || null),

      // communicationNotes (encrypted JSON) — stored as camelCase in DB
      communicationNotes: encryptedFields.communicationNotes ?? null,

      // DateTime
      expiresAt: toDateTime(item.expires_at),

      // Visibility (falls back to PRIVATE if not provided)
      visibility: item.visibility || "PRIVATE",

      // Always insert as non-draft
      draftStatus: false,
    };
  },
};

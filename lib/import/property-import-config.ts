import type { ImportEntityConfig } from "./engine";
import {
  propertyImportSchema,
  type PropertyImportData,
} from "./property-import-schema";
import { normalizePropertyEnums } from "./enum-normalizer";
import { encryptWithKey, isEncrypted } from "@/lib/encryption";
import { encryptJsonWithKey } from "@/lib/model-encryption";
import { coerceDate } from "./zod-helpers";

// ---------------------------------------------------------------------------
// Local helpers (not exported)
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

export const propertyImportConfig: ImportEntityConfig<PropertyImportData> = {
  prismaModel: "properties",
  entityIdType: "Properties",
  importSchema: propertyImportSchema as unknown as ImportEntityConfig<PropertyImportData>["importSchema"],
  normalizeEnums: normalizePropertyEnums,

  encryptWithDek(
    data: Record<string, unknown>,
    dek: Buffer
  ): Record<string, unknown> {
    const encrypted: Record<string, unknown> = {};

    // Properties have LIMITED encryption — only primary_email and communication_notes
    const email = data.primary_email;
    if (
      typeof email === "string" &&
      email.length > 0 &&
      !isEncrypted(email)
    ) {
      encrypted.primary_email = encryptWithKey(email, dek);
    }

    if (data.communication_notes != null) {
      encrypted.communication_notes = encryptJsonWithKey(data.communication_notes, dek);
    }

    return encrypted;
  },

  toPrismaData(
    item: PropertyImportData,
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

      // Core
      property_name: item.property_name,
      primary_email:
        (encryptedFields.primary_email as string) ||
        item.primary_email ||
        null,

      // Classification
      property_type: item.property_type || null,
      property_status: item.property_status || "ACTIVE",
      transaction_type: item.transaction_type || null,

      // Address
      address_street: item.address_street || null,
      address_city: item.address_city || null,
      address_state: item.address_state || null,
      address_zip: item.address_zip || null,
      municipality: item.municipality || null,
      area: item.area || null,
      postal_code: item.postal_code || null,
      region: item.region || null,
      regional_unit: item.regional_unit || null,

      // Pricing
      price: toNumber(item.price),
      price_type: item.price_type || null,

      // Property details
      bedrooms: toNumber(item.bedrooms),
      bathrooms: toNumber(item.bathrooms),
      square_feet: toNumber(item.square_feet),
      lot_size: toNumber(item.lot_size),
      year_built: toNumber(item.year_built),
      floor: item.floor || null,
      floors_total: toNumber(item.floors_total),

      // Greece-specific measurements
      size_net_sqm: toNumber(item.size_net_sqm),
      size_gross_sqm: toNumber(item.size_gross_sqm),
      plot_size_sqm: toNumber(item.plot_size_sqm),

      // Building details
      heating_type: item.heating_type || null,
      energy_cert_class: item.energy_cert_class || null,
      condition: item.condition || null,
      renovated_year: toNumber(item.renovated_year),
      elevator: item.elevator || false,
      furnished: item.furnished || null,

      // Legal / Registration
      building_permit_no: item.building_permit_no || null,
      building_permit_year: toNumber(item.building_permit_year),
      land_registry_kaek: item.land_registry_kaek || null,
      land_registry_office: item.land_registry_office || null,
      building_block_ot: item.building_block_ot || null,
      legalization_status: item.legalization_status || null,
      inside_city_plan: item.inside_city_plan || false,

      // Land-specific
      build_coefficient: toNumber(item.build_coefficient),
      coverage_ratio: toNumber(item.coverage_ratio),
      frontage_m: toNumber(item.frontage_m),
      frontage_type: item.frontage_type || null,
      objective_zone: item.objective_zone || null,

      // Management
      etaireia_diaxeirisis: item.etaireia_diaxeirisis || null,
      monthly_common_charges: toNumber(item.monthly_common_charges),

      // Rental-specific
      available_from: toDateTime(item.available_from),
      accepts_pets: item.accepts_pets || false,
      min_lease_months: toNumber(item.min_lease_months),

      // Visibility
      is_exclusive: item.is_exclusive || false,
      visibility: item.visibility || "PRIVATE",
      address_privacy_level: item.address_privacy_level || null,

      // Additional
      description: item.description || null,

      // Always false for imports (not a draft)
      draft_status: false,
    };
  },
};

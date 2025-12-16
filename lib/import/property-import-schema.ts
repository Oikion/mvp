import { z } from "zod";

// Enum values matching Prisma schema
export const PropertyTypeEnum = z.enum([
  "RESIDENTIAL",
  "COMMERCIAL",
  "LAND",
  "RENTAL",
  "VACATION",
  "APARTMENT",
  "HOUSE",
  "MAISONETTE",
  "WAREHOUSE",
  "PARKING",
  "PLOT",
  "FARM",
  "INDUSTRIAL",
  "OTHER",
]);

export const PropertyStatusEnum = z.enum([
  "ACTIVE",
  "PENDING",
  "SOLD",
  "OFF_MARKET",
  "WITHDRAWN",
]);

export const TransactionTypeEnum = z.enum([
  "SALE",
  "RENTAL",
  "SHORT_TERM",
  "EXCHANGE",
]);

export const HeatingTypeEnum = z.enum([
  "AUTONOMOUS",
  "CENTRAL",
  "NATURAL_GAS",
  "HEAT_PUMP",
  "ELECTRIC",
  "NONE",
]);

export const EnergyCertClassEnum = z.enum([
  "A_PLUS",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "IN_PROGRESS",
]);

export const PropertyConditionEnum = z.enum([
  "EXCELLENT",
  "VERY_GOOD",
  "GOOD",
  "NEEDS_RENOVATION",
]);

export const FurnishedStatusEnum = z.enum([
  "NO",
  "PARTIALLY",
  "FULLY",
]);

export const PriceTypeEnum = z.enum([
  "RENTAL",
  "SALE",
  "PER_ACRE",
  "PER_SQM",
]);

export const PortalVisibilityEnum = z.enum([
  "PRIVATE",
  "SELECTED",
  "PUBLIC",
]);

export const AddressPrivacyLevelEnum = z.enum([
  "EXACT",
  "PARTIAL",
  "HIDDEN",
]);

export const LegalizationStatusEnum = z.enum([
  "LEGALIZED",
  "IN_PROGRESS",
  "UNDECLARED",
]);

/**
 * Property CSV Import Schema
 * Matches the fields from NewPropertyForm.tsx and the Prisma Properties model
 */
export const propertyImportSchema = z.object({
  // Core required field
  property_name: z.string().min(1, "Property name is required"),

  // Classification
  property_type: PropertyTypeEnum.optional().nullable(),
  property_status: PropertyStatusEnum.optional().nullable(),
  transaction_type: TransactionTypeEnum.optional().nullable(),

  // Address (coerce to string to handle numeric postal codes from CSV)
  address_street: z.coerce.string().optional().or(z.literal("")),
  address_city: z.coerce.string().optional().or(z.literal("")),
  address_state: z.coerce.string().optional().or(z.literal("")),
  address_zip: z.coerce.string().optional().or(z.literal("")),
  municipality: z.coerce.string().optional().or(z.literal("")),
  area: z.coerce.string().optional().or(z.literal("")),
  postal_code: z.coerce.string().optional().or(z.literal("")),

  // Pricing
  price: z.coerce.number().int().positive().optional().nullable(),
  price_type: PriceTypeEnum.optional().nullable(),

  // Property details
  bedrooms: z.coerce.number().int().min(0).optional().nullable(),
  bathrooms: z.coerce.number().min(0).optional().nullable(),
  square_feet: z.coerce.number().int().min(0).optional().nullable(),
  lot_size: z.coerce.number().min(0).optional().nullable(),
  year_built: z.coerce.number().int().optional().nullable(),
  floor: z.coerce.string().optional().or(z.literal("")),
  floors_total: z.coerce.number().int().min(0).optional().nullable(),

  // Greece-specific measurements
  size_net_sqm: z.coerce.number().positive().optional().nullable(),
  size_gross_sqm: z.coerce.number().positive().optional().nullable(),
  plot_size_sqm: z.coerce.number().positive().optional().nullable(),

  // Building details
  heating_type: HeatingTypeEnum.optional().nullable(),
  energy_cert_class: EnergyCertClassEnum.optional().nullable(),
  condition: PropertyConditionEnum.optional().nullable(),
  renovated_year: z.coerce.number().int().optional().nullable(),
  elevator: z.coerce.boolean().optional().default(false),
  furnished: FurnishedStatusEnum.optional().nullable(),

  // Legal/Registration (coerce to string to handle numeric values from CSV)
  building_permit_no: z.coerce.string().optional().or(z.literal("")),
  building_permit_year: z.coerce.number().int().optional().nullable(),
  land_registry_kaek: z.coerce.string().optional().or(z.literal("")),
  legalization_status: LegalizationStatusEnum.optional().nullable(),
  inside_city_plan: z.coerce.boolean().optional().default(false),

  // Land-specific
  build_coefficient: z.coerce.number().positive().optional().nullable(),
  coverage_ratio: z.coerce.number().positive().optional().nullable(),
  frontage_m: z.coerce.number().positive().optional().nullable(),

  // Management
  etaireia_diaxeirisis: z.coerce.string().optional().or(z.literal("")),
  monthly_common_charges: z.coerce.number().positive().optional().nullable(),

  // Rental-specific
  available_from: z.coerce.string().optional().or(z.literal("")), // Will be parsed to Date
  accepts_pets: z.coerce.boolean().optional().default(false),
  min_lease_months: z.coerce.number().int().min(0).optional().nullable(),

  // Visibility
  is_exclusive: z.coerce.boolean().optional().default(false),
  portal_visibility: PortalVisibilityEnum.optional().nullable(),
  address_privacy_level: AddressPrivacyLevelEnum.optional().nullable(),

  // Additional
  description: z.coerce.string().optional().or(z.literal("")),
  primary_email: z.coerce.string().email().optional().or(z.literal("")),
});

export type PropertyImportData = z.infer<typeof propertyImportSchema>;

/**
 * Field definitions for the import wizard UI
 * Maps CSV column names to schema fields with display labels
 */
export const propertyImportFieldDefinitions = [
  // Required
  { key: "property_name", required: true, group: "basic" },

  // Classification
  { key: "property_type", required: false, group: "classification" },
  { key: "property_status", required: false, group: "classification" },
  { key: "transaction_type", required: false, group: "classification" },

  // Address
  { key: "address_street", required: false, group: "address" },
  { key: "address_city", required: false, group: "address" },
  { key: "address_state", required: false, group: "address" },
  { key: "address_zip", required: false, group: "address" },
  { key: "municipality", required: false, group: "address" },
  { key: "area", required: false, group: "address" },
  { key: "postal_code", required: false, group: "address" },

  // Pricing
  { key: "price", required: false, group: "pricing" },
  { key: "price_type", required: false, group: "pricing" },

  // Property details
  { key: "bedrooms", required: false, group: "details" },
  { key: "bathrooms", required: false, group: "details" },
  { key: "square_feet", required: false, group: "details" },
  { key: "lot_size", required: false, group: "details" },
  { key: "year_built", required: false, group: "details" },
  { key: "floor", required: false, group: "details" },
  { key: "floors_total", required: false, group: "details" },

  // Greece-specific measurements
  { key: "size_net_sqm", required: false, group: "measurements" },
  { key: "size_gross_sqm", required: false, group: "measurements" },
  { key: "plot_size_sqm", required: false, group: "measurements" },

  // Building details
  { key: "heating_type", required: false, group: "building" },
  { key: "energy_cert_class", required: false, group: "building" },
  { key: "condition", required: false, group: "building" },
  { key: "renovated_year", required: false, group: "building" },
  { key: "elevator", required: false, group: "building" },
  { key: "furnished", required: false, group: "building" },

  // Legal
  { key: "building_permit_no", required: false, group: "legal" },
  { key: "building_permit_year", required: false, group: "legal" },
  { key: "land_registry_kaek", required: false, group: "legal" },
  { key: "legalization_status", required: false, group: "legal" },
  { key: "inside_city_plan", required: false, group: "legal" },

  // Land
  { key: "build_coefficient", required: false, group: "land" },
  { key: "coverage_ratio", required: false, group: "land" },
  { key: "frontage_m", required: false, group: "land" },

  // Management
  { key: "etaireia_diaxeirisis", required: false, group: "management" },
  { key: "monthly_common_charges", required: false, group: "management" },

  // Rental
  { key: "available_from", required: false, group: "rental" },
  { key: "accepts_pets", required: false, group: "rental" },
  { key: "min_lease_months", required: false, group: "rental" },

  // Visibility
  { key: "is_exclusive", required: false, group: "visibility" },
  { key: "portal_visibility", required: false, group: "visibility" },
  { key: "address_privacy_level", required: false, group: "visibility" },

  // Other
  { key: "description", required: false, group: "other" },
  { key: "primary_email", required: false, group: "other" },
] as const;

export type PropertyImportFieldKey = (typeof propertyImportFieldDefinitions)[number]["key"];



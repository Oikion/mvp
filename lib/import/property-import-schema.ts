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
  // User-provided ID (optional - will auto-generate if not provided)
  id: z.coerce.string().optional().or(z.literal("")),

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
 * Field definition type with aliases for fuzzy matching
 */
export interface PropertyFieldDefinition {
  key: string;
  required: boolean;
  group: string;
  aliases: string[];
  description?: string;
}

/**
 * Field definitions for the import wizard UI
 * Maps CSV column names to schema fields with display labels and aliases for auto-matching
 */
export const propertyImportFieldDefinitions: readonly PropertyFieldDefinition[] = [
  // ID (optional - for importing existing records)
  { 
    key: "id", 
    required: false, 
    group: "basic", 
    aliases: ["property_id", "prop_id", "listing_id", "ref", "reference", "ref_no", "reference_number", "mls_id", "code"],
    description: "Unique identifier for the property (auto-generated if not provided)"
  },

  // Required
  { 
    key: "property_name", 
    required: true, 
    group: "basic", 
    aliases: ["name", "title", "listing_name", "listing_title", "property_title", "headline"],
    description: "Name or title of the property listing"
  },

  // Classification
  { 
    key: "property_type", 
    required: false, 
    group: "classification", 
    aliases: ["type", "prop_type", "listing_type", "category", "property_category"],
    description: "Type of property (e.g., APARTMENT, HOUSE, LAND)"
  },
  { 
    key: "property_status", 
    required: false, 
    group: "classification", 
    aliases: ["status", "listing_status", "prop_status", "state"],
    description: "Current status (e.g., ACTIVE, PENDING, SOLD)"
  },
  { 
    key: "transaction_type", 
    required: false, 
    group: "classification", 
    aliases: ["transaction", "deal_type", "listing_type", "sale_rent", "offer_type"],
    description: "Transaction type (SALE, RENTAL, SHORT_TERM)"
  },

  // Address
  { 
    key: "address_street", 
    required: false, 
    group: "address", 
    aliases: ["street", "street_address", "address", "address_line", "address_1", "road"],
    description: "Street address"
  },
  { 
    key: "address_city", 
    required: false, 
    group: "address", 
    aliases: ["city", "town", "locality"],
    description: "City or town"
  },
  { 
    key: "address_state", 
    required: false, 
    group: "address", 
    aliases: ["state", "region", "prefecture", "nomos", "province"],
    description: "State, region, or prefecture"
  },
  { 
    key: "address_zip", 
    required: false, 
    group: "address", 
    aliases: ["zip", "zip_code", "zipcode", "postcode", "postal"],
    description: "ZIP or postal code"
  },
  { 
    key: "municipality", 
    required: false, 
    group: "address", 
    aliases: ["dimos", "municipality_name", "local_authority"],
    description: "Municipality (Dimos)"
  },
  { 
    key: "area", 
    required: false, 
    group: "address", 
    aliases: ["neighborhood", "district", "perioxi", "location", "suburb"],
    description: "Area or neighborhood"
  },
  { 
    key: "postal_code", 
    required: false, 
    group: "address", 
    aliases: ["postcode", "post_code", "tk", "tachydromikos_kodikas"],
    description: "Postal code (TK)"
  },

  // Pricing
  { 
    key: "price", 
    required: false, 
    group: "pricing", 
    aliases: ["asking_price", "list_price", "amount", "cost", "timi", "price_eur", "euro"],
    description: "Listing price in EUR"
  },
  { 
    key: "price_type", 
    required: false, 
    group: "pricing", 
    aliases: ["pricing_type", "price_unit", "price_basis"],
    description: "Price type (SALE, RENTAL, PER_SQM)"
  },

  // Property details
  { 
    key: "bedrooms", 
    required: false, 
    group: "details", 
    aliases: ["beds", "bed", "num_bedrooms", "bedroom_count", "rooms", "ypnodomatia"],
    description: "Number of bedrooms"
  },
  { 
    key: "bathrooms", 
    required: false, 
    group: "details", 
    aliases: ["baths", "bath", "num_bathrooms", "bathroom_count", "wc", "mpania"],
    description: "Number of bathrooms"
  },
  { 
    key: "square_feet", 
    required: false, 
    group: "details", 
    aliases: ["sqft", "sq_ft", "square_footage", "size_sqft", "area_sqft"],
    description: "Size in square feet"
  },
  { 
    key: "lot_size", 
    required: false, 
    group: "details", 
    aliases: ["lot", "land_size", "plot", "land_area"],
    description: "Lot or land size"
  },
  { 
    key: "year_built", 
    required: false, 
    group: "details", 
    aliases: ["built", "construction_year", "year_constructed", "built_year", "etos_kataskevis"],
    description: "Year the property was built"
  },
  { 
    key: "floor", 
    required: false, 
    group: "details", 
    aliases: ["level", "storey", "orofos", "floor_number"],
    description: "Floor level"
  },
  { 
    key: "floors_total", 
    required: false, 
    group: "details", 
    aliases: ["total_floors", "num_floors", "building_floors", "stories", "orofoi"],
    description: "Total number of floors in building"
  },

  // Greece-specific measurements
  { 
    key: "size_net_sqm", 
    required: false, 
    group: "measurements", 
    aliases: ["net_sqm", "net_size", "net_area", "emvadon_katharo", "katharo_emvadon", "sqm_net"],
    description: "Net size in square meters"
  },
  { 
    key: "size_gross_sqm", 
    required: false, 
    group: "measurements", 
    aliases: ["gross_sqm", "gross_size", "gross_area", "emvadon_mikto", "mikto_emvadon", "sqm_gross", "sqm", "tetragonika"],
    description: "Gross size in square meters"
  },
  { 
    key: "plot_size_sqm", 
    required: false, 
    group: "measurements", 
    aliases: ["plot_sqm", "land_sqm", "oikopedo", "oikopedo_sqm", "plot_area"],
    description: "Plot size in square meters"
  },

  // Building details
  { 
    key: "heating_type", 
    required: false, 
    group: "building", 
    aliases: ["heating", "heat_type", "thermansi", "heating_system"],
    description: "Heating type (AUTONOMOUS, CENTRAL, etc.)"
  },
  { 
    key: "energy_cert_class", 
    required: false, 
    group: "building", 
    aliases: ["energy_class", "energy_certificate", "pea", "energy_rating", "energeiaki_klasi"],
    description: "Energy certificate class (A+, A, B, etc.)"
  },
  { 
    key: "condition", 
    required: false, 
    group: "building", 
    aliases: ["property_condition", "state", "katastasi"],
    description: "Property condition (EXCELLENT, GOOD, etc.)"
  },
  { 
    key: "renovated_year", 
    required: false, 
    group: "building", 
    aliases: ["renovation_year", "year_renovated", "anakainisi_etos"],
    description: "Year of last renovation"
  },
  { 
    key: "elevator", 
    required: false, 
    group: "building", 
    aliases: ["lift", "has_elevator", "has_lift", "asanser"],
    description: "Has elevator (true/false)"
  },
  { 
    key: "furnished", 
    required: false, 
    group: "building", 
    aliases: ["furnishing", "is_furnished", "furniture", "epiplomeno"],
    description: "Furnished status (NO, PARTIALLY, FULLY)"
  },

  // Legal
  { 
    key: "building_permit_no", 
    required: false, 
    group: "legal", 
    aliases: ["permit_no", "permit_number", "oikodomiki_adeia", "building_permit"],
    description: "Building permit number"
  },
  { 
    key: "building_permit_year", 
    required: false, 
    group: "legal", 
    aliases: ["permit_year", "oikodomiki_adeia_etos"],
    description: "Building permit year"
  },
  { 
    key: "land_registry_kaek", 
    required: false, 
    group: "legal", 
    aliases: ["kaek", "cadastral_code", "ktimatologio"],
    description: "KAEK (Land Registry code)"
  },
  { 
    key: "legalization_status", 
    required: false, 
    group: "legal", 
    aliases: ["legalization", "legal_status", "taktopoiisi"],
    description: "Legalization status"
  },
  { 
    key: "inside_city_plan", 
    required: false, 
    group: "legal", 
    aliases: ["city_plan", "in_city_plan", "entos_schediou"],
    description: "Inside city plan (true/false)"
  },

  // Land
  { 
    key: "build_coefficient", 
    required: false, 
    group: "land", 
    aliases: ["building_coefficient", "syntelestis_domisis", "sd"],
    description: "Building coefficient (SD)"
  },
  { 
    key: "coverage_ratio", 
    required: false, 
    group: "land", 
    aliases: ["coverage", "syntelestis_kalipsis", "sk"],
    description: "Coverage ratio (SK)"
  },
  { 
    key: "frontage_m", 
    required: false, 
    group: "land", 
    aliases: ["frontage", "prosopsi", "front_meters"],
    description: "Frontage in meters"
  },

  // Management
  { 
    key: "etaireia_diaxeirisis", 
    required: false, 
    group: "management", 
    aliases: ["management_company", "property_manager", "diaxeirisi"],
    description: "Property management company"
  },
  { 
    key: "monthly_common_charges", 
    required: false, 
    group: "management", 
    aliases: ["common_charges", "koina", "koinoxrista", "monthly_fees"],
    description: "Monthly common charges (EUR)"
  },

  // Rental
  { 
    key: "available_from", 
    required: false, 
    group: "rental", 
    aliases: ["availability_date", "available_date", "move_in_date", "diathesimo_apo"],
    description: "Available from date"
  },
  { 
    key: "accepts_pets", 
    required: false, 
    group: "rental", 
    aliases: ["pets_allowed", "pets", "allows_pets", "katikia_zoa"],
    description: "Accepts pets (true/false)"
  },
  { 
    key: "min_lease_months", 
    required: false, 
    group: "rental", 
    aliases: ["minimum_lease", "min_lease", "lease_term", "elachisti_misthosi"],
    description: "Minimum lease duration in months"
  },

  // Visibility
  { 
    key: "is_exclusive", 
    required: false, 
    group: "visibility", 
    aliases: ["exclusive", "exclusive_listing", "apokleistiki"],
    description: "Exclusive listing (true/false)"
  },
  { 
    key: "portal_visibility", 
    required: false, 
    group: "visibility", 
    aliases: ["visibility", "publish_status", "oratotita"],
    description: "Portal visibility (PRIVATE, SELECTED, PUBLIC)"
  },
  { 
    key: "address_privacy_level", 
    required: false, 
    group: "visibility", 
    aliases: ["address_privacy", "location_privacy", "privacy_level"],
    description: "Address privacy level (EXACT, PARTIAL, HIDDEN)"
  },

  // Other
  { 
    key: "description", 
    required: false, 
    group: "other", 
    aliases: ["desc", "details", "notes", "perigrafi", "property_description"],
    description: "Property description"
  },
  { 
    key: "primary_email", 
    required: false, 
    group: "other", 
    aliases: ["email", "contact_email", "agent_email"],
    description: "Contact email address"
  },
] as const;

export type PropertyImportFieldKey = (typeof propertyImportFieldDefinitions)[number]["key"];









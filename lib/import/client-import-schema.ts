import { z } from "zod";

// Enum values matching Prisma schema
export const ClientTypeEnum = z.enum([
  "BUYER",
  "SELLER",
  "RENTER",
  "INVESTOR",
  "REFERRAL_PARTNER",
]);

export const ClientStatusEnum = z.enum([
  "LEAD",
  "ACTIVE",
  "INACTIVE",
  "CONVERTED",
  "LOST",
]);

export const PersonTypeEnum = z.enum([
  "INDIVIDUAL",
  "COMPANY",
  "INVESTOR",
  "BROKER",
]);

export const ClientIntentEnum = z.enum([
  "BUY",
  "RENT",
  "SELL",
  "LEASE",
  "INVEST",
]);

export const PropertyPurposeEnum = z.enum([
  "RESIDENTIAL",
  "COMMERCIAL",
  "LAND",
  "PARKING",
  "OTHER",
]);

export const TimelineEnum = z.enum([
  "IMMEDIATE",
  "ONE_THREE_MONTHS",
  "THREE_SIX_MONTHS",
  "SIX_PLUS_MONTHS",
]);

export const FinancingTypeEnum = z.enum([
  "CASH",
  "MORTGAGE",
  "PREAPPROVAL_PENDING",
]);

export const LeadSourceEnum = z.enum([
  "REFERRAL",
  "WEB",
  "PORTAL",
  "WALK_IN",
  "SOCIAL",
]);

/**
 * Client CSV Import Schema
 * Matches the fields from NewAccountForm.tsx and the Prisma Clients model
 */
export const clientImportSchema = z.object({
  // User-provided ID (optional - will auto-generate if not provided)
  id: z.coerce.string().optional().or(z.literal("")),

  // Core required field
  client_name: z.coerce.string().min(1, "Client name is required"),

  // Contact information - use coerce.string() to handle numeric phone values from CSV
  primary_email: z.coerce
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  office_phone: z.coerce.string().optional().or(z.literal("")),
  primary_phone: z.coerce.string().optional().or(z.literal("")),
  secondary_phone: z.coerce.string().optional().or(z.literal("")),
  secondary_email: z.coerce
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),

  // Client classification
  client_type: ClientTypeEnum.optional().nullable(),
  client_status: ClientStatusEnum.optional().nullable(),
  person_type: PersonTypeEnum.optional().nullable(),
  intent: ClientIntentEnum.optional().nullable(),

  // Company details - coerce to handle numeric IDs from CSV
  company_id: z.coerce.string().optional().or(z.literal("")),
  company_name: z.coerce.string().optional().or(z.literal("")),
  vat: z.coerce.string().optional().or(z.literal("")),
  website: z
    .union([z.coerce.string().url("Invalid URL"), z.literal(""), z.undefined()])
    .optional(),
  fax: z.coerce.string().optional().or(z.literal("")),

  // Greece-specific fields - coerce to handle numeric values from CSV
  afm: z.coerce.string().optional().or(z.literal("")), // Greek tax ID (9 digits)
  doy: z.coerce.string().optional().or(z.literal("")), // Greek tax office
  id_doc: z.coerce.string().optional().or(z.literal("")), // ID/Passport
  company_gemi: z.coerce.string().optional().or(z.literal("")), // Greek business registry

  // Billing address - coerce to handle numeric postal codes from CSV
  billing_street: z.coerce.string().optional().or(z.literal("")),
  billing_city: z.coerce.string().optional().or(z.literal("")),
  billing_state: z.coerce.string().optional().or(z.literal("")),
  billing_postal_code: z.coerce.string().optional().or(z.literal("")),
  billing_country: z.coerce.string().optional().or(z.literal("")),

  // Property preferences
  purpose: PropertyPurposeEnum.optional().nullable(),
  budget_min: z.coerce.number().positive().optional().nullable(),
  budget_max: z.coerce.number().positive().optional().nullable(),
  timeline: TimelineEnum.optional().nullable(),

  // Financing
  financing_type: FinancingTypeEnum.optional().nullable(),
  preapproval_bank: z.coerce.string().optional().or(z.literal("")),
  needs_mortgage_help: z.coerce.boolean().optional().default(false),

  // Lead source and consent
  lead_source: LeadSourceEnum.optional().nullable(),
  gdpr_consent: z.coerce.boolean().optional().default(false),
  allow_marketing: z.coerce.boolean().optional().default(false),

  // Additional
  description: z.coerce.string().optional().or(z.literal("")),
  member_of: z.coerce.string().optional().or(z.literal("")),
});

export type ClientImportData = z.infer<typeof clientImportSchema>;

/**
 * Field definition type with aliases for fuzzy matching
 */
export interface ClientFieldDefinition {
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
export const clientImportFieldDefinitions: readonly ClientFieldDefinition[] = [
  // ID (optional - for importing existing records)
  { 
    key: "id", 
    required: false, 
    group: "basic", 
    aliases: ["client_id", "customer_id", "contact_id", "ref", "reference", "ref_no", "reference_number", "account_id", "code"],
    description: "Unique identifier for the client (auto-generated if not provided)"
  },

  // Required
  { 
    key: "client_name", 
    required: true, 
    group: "basic", 
    aliases: ["name", "full_name", "customer_name", "contact_name", "account_name", "onoma", "onomateponimo"],
    description: "Full name of the client"
  },

  // Contact
  { 
    key: "primary_email", 
    required: false, 
    group: "contact", 
    aliases: ["email", "main_email", "email_address", "contact_email"],
    description: "Primary email address"
  },
  { 
    key: "primary_phone", 
    required: false, 
    group: "contact", 
    aliases: ["phone", "mobile", "cell", "tilefono", "kinito", "phone_number", "mobile_phone"],
    description: "Primary phone number"
  },
  { 
    key: "office_phone", 
    required: false, 
    group: "contact", 
    aliases: ["work_phone", "business_phone", "tilefono_grafeiou"],
    description: "Office phone number"
  },
  { 
    key: "secondary_phone", 
    required: false, 
    group: "contact", 
    aliases: ["alt_phone", "other_phone", "phone_2", "alternative_phone"],
    description: "Secondary phone number"
  },
  { 
    key: "secondary_email", 
    required: false, 
    group: "contact", 
    aliases: ["alt_email", "other_email", "email_2", "alternative_email"],
    description: "Secondary email address"
  },

  // Classification
  { 
    key: "client_type", 
    required: false, 
    group: "classification", 
    aliases: ["type", "customer_type", "contact_type", "typos_pelati"],
    description: "Client type (BUYER, SELLER, RENTER, INVESTOR)"
  },
  { 
    key: "client_status", 
    required: false, 
    group: "classification", 
    aliases: ["status", "customer_status", "account_status", "katastasi"],
    description: "Client status (LEAD, ACTIVE, INACTIVE, etc.)"
  },
  { 
    key: "person_type", 
    required: false, 
    group: "classification", 
    aliases: ["entity_type", "customer_category", "typos_prosopou"],
    description: "Person type (INDIVIDUAL, COMPANY, etc.)"
  },
  { 
    key: "intent", 
    required: false, 
    group: "classification", 
    aliases: ["interest", "looking_for", "prothesi", "purpose"],
    description: "Client intent (BUY, RENT, SELL, LEASE, INVEST)"
  },

  // Company
  { 
    key: "company_name", 
    required: false, 
    group: "company", 
    aliases: ["business_name", "organization", "company", "eponymia", "etaireia"],
    description: "Company or business name"
  },
  { 
    key: "company_id", 
    required: false, 
    group: "company", 
    aliases: ["business_id", "organization_id", "corp_id"],
    description: "Company registration ID"
  },
  { 
    key: "vat", 
    required: false, 
    group: "company", 
    aliases: ["vat_number", "vat_id", "tax_id", "fpa"],
    description: "VAT number"
  },
  { 
    key: "website", 
    required: false, 
    group: "company", 
    aliases: ["web", "url", "site", "homepage", "istotopos"],
    description: "Website URL"
  },
  { 
    key: "fax", 
    required: false, 
    group: "company", 
    aliases: ["fax_number", "facsimile"],
    description: "Fax number"
  },

  // Greece-specific
  { 
    key: "afm", 
    required: false, 
    group: "greece", 
    aliases: ["tax_id", "tin", "arithmos_forologikou_mitroou", "afm_number"],
    description: "AFM (Greek Tax ID - 9 digits)"
  },
  { 
    key: "doy", 
    required: false, 
    group: "greece", 
    aliases: ["tax_office", "eforia", "dimosia_oikonomiki_ypiresia"],
    description: "DOY (Greek Tax Office)"
  },
  { 
    key: "id_doc", 
    required: false, 
    group: "greece", 
    aliases: ["id_number", "passport", "tautotita", "diasvatirio", "identity"],
    description: "ID card or passport number"
  },
  { 
    key: "company_gemi", 
    required: false, 
    group: "greece", 
    aliases: ["gemi", "gemi_number", "geniko_emporiko_mitroo"],
    description: "GEMI number (Greek business registry)"
  },

  // Address
  { 
    key: "billing_street", 
    required: false, 
    group: "address", 
    aliases: ["street", "address", "street_address", "address_line", "odos", "dieuthinsi"],
    description: "Street address"
  },
  { 
    key: "billing_city", 
    required: false, 
    group: "address", 
    aliases: ["city", "town", "poli"],
    description: "City"
  },
  { 
    key: "billing_state", 
    required: false, 
    group: "address", 
    aliases: ["state", "region", "prefecture", "nomos", "perifereia"],
    description: "State or region"
  },
  { 
    key: "billing_postal_code", 
    required: false, 
    group: "address", 
    aliases: ["postal_code", "zip", "zip_code", "postcode", "tk"],
    description: "Postal code"
  },
  { 
    key: "billing_country", 
    required: false, 
    group: "address", 
    aliases: ["country", "chora"],
    description: "Country"
  },

  // Preferences
  { 
    key: "purpose", 
    required: false, 
    group: "preferences", 
    aliases: ["property_purpose", "looking_for", "property_type_interest"],
    description: "Property purpose interest (RESIDENTIAL, COMMERCIAL, etc.)"
  },
  { 
    key: "budget_min", 
    required: false, 
    group: "preferences", 
    aliases: ["min_budget", "minimum_budget", "budget_from", "elachisto_budget"],
    description: "Minimum budget (EUR)"
  },
  { 
    key: "budget_max", 
    required: false, 
    group: "preferences", 
    aliases: ["max_budget", "maximum_budget", "budget_to", "megisto_budget"],
    description: "Maximum budget (EUR)"
  },
  { 
    key: "timeline", 
    required: false, 
    group: "preferences", 
    aliases: ["timeframe", "purchase_timeline", "when", "chronodiagranna"],
    description: "Purchase/rental timeline"
  },

  // Financing
  { 
    key: "financing_type", 
    required: false, 
    group: "financing", 
    aliases: ["payment_method", "financing", "finance_type", "tropos_plironis"],
    description: "Financing type (CASH, MORTGAGE, etc.)"
  },
  { 
    key: "preapproval_bank", 
    required: false, 
    group: "financing", 
    aliases: ["bank", "mortgage_bank", "trapeza"],
    description: "Pre-approval bank name"
  },
  { 
    key: "needs_mortgage_help", 
    required: false, 
    group: "financing", 
    aliases: ["mortgage_help", "needs_financing_help", "voitheia_daniou"],
    description: "Needs mortgage assistance (true/false)"
  },

  // Other
  { 
    key: "lead_source", 
    required: false, 
    group: "other", 
    aliases: ["source", "how_found", "referral_source", "pigi_epafis"],
    description: "Lead source (REFERRAL, WEB, PORTAL, etc.)"
  },
  { 
    key: "gdpr_consent", 
    required: false, 
    group: "other", 
    aliases: ["data_consent", "privacy_consent", "singkatatesi_gdpr"],
    description: "GDPR consent given (true/false)"
  },
  { 
    key: "allow_marketing", 
    required: false, 
    group: "other", 
    aliases: ["marketing_consent", "newsletter", "epitrepetai_marketing"],
    description: "Allow marketing communications (true/false)"
  },
  { 
    key: "description", 
    required: false, 
    group: "other", 
    aliases: ["notes", "comments", "remarks", "perigrafi", "simeioseis"],
    description: "Additional notes or description"
  },
  { 
    key: "member_of", 
    required: false, 
    group: "other", 
    aliases: ["group", "segment", "melos"],
    description: "Group or segment membership"
  },
] as const;

export type ClientImportFieldKey = (typeof clientImportFieldDefinitions)[number]["key"];









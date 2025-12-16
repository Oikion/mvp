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
 * Field definitions for the import wizard UI
 * Maps CSV column names to schema fields with display labels
 */
export const clientImportFieldDefinitions = [
  // Required
  { key: "client_name", required: true, group: "basic" },

  // Contact
  { key: "primary_email", required: false, group: "contact" },
  { key: "primary_phone", required: false, group: "contact" },
  { key: "office_phone", required: false, group: "contact" },
  { key: "secondary_phone", required: false, group: "contact" },
  { key: "secondary_email", required: false, group: "contact" },

  // Classification
  { key: "client_type", required: false, group: "classification" },
  { key: "client_status", required: false, group: "classification" },
  { key: "person_type", required: false, group: "classification" },
  { key: "intent", required: false, group: "classification" },

  // Company
  { key: "company_name", required: false, group: "company" },
  { key: "company_id", required: false, group: "company" },
  { key: "vat", required: false, group: "company" },
  { key: "website", required: false, group: "company" },
  { key: "fax", required: false, group: "company" },

  // Greece-specific
  { key: "afm", required: false, group: "greece" },
  { key: "doy", required: false, group: "greece" },
  { key: "id_doc", required: false, group: "greece" },
  { key: "company_gemi", required: false, group: "greece" },

  // Address
  { key: "billing_street", required: false, group: "address" },
  { key: "billing_city", required: false, group: "address" },
  { key: "billing_state", required: false, group: "address" },
  { key: "billing_postal_code", required: false, group: "address" },
  { key: "billing_country", required: false, group: "address" },

  // Preferences
  { key: "purpose", required: false, group: "preferences" },
  { key: "budget_min", required: false, group: "preferences" },
  { key: "budget_max", required: false, group: "preferences" },
  { key: "timeline", required: false, group: "preferences" },

  // Financing
  { key: "financing_type", required: false, group: "financing" },
  { key: "preapproval_bank", required: false, group: "financing" },
  { key: "needs_mortgage_help", required: false, group: "financing" },

  // Other
  { key: "lead_source", required: false, group: "other" },
  { key: "gdpr_consent", required: false, group: "other" },
  { key: "allow_marketing", required: false, group: "other" },
  { key: "description", required: false, group: "other" },
  { key: "member_of", required: false, group: "other" },
] as const;

export type ClientImportFieldKey = (typeof clientImportFieldDefinitions)[number]["key"];



import { z } from "zod";

import {
  PropertyTypeEnum,
  TransactionTypeEnum,
  HeatingTypeEnum,
  EnergyCertClassEnum,
  PropertyConditionEnum,
  FurnishedStatusEnum,
} from "./property-import-schema";

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

// Enum values matching Prisma schema
export const MandateStatusEnum = z.enum([
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "FULFILLED",
  "EXPIRED",
  "CANCELLED",
]);

export const MandateUrgencyEnum = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

/**
 * Mandate CSV Import Schema
 * Matches the fields from the Prisma Mandates model
 */
export const mandateImportSchema = z.object({
  // User-provided ID (optional - will auto-generate if not provided)
  id: z.coerce.string().optional().or(z.literal("")),

  // Core required field
  title: z.coerce.string().min(1, "Title is required"),

  // Enums (all optional, nullable)
  transaction_type: TransactionTypeEnum.optional().nullable(),
  property_type: PropertyTypeEnum.optional().nullable(),
  property_purpose: PropertyPurposeEnum.optional().nullable(),
  status: MandateStatusEnum.optional().nullable(),
  urgency: MandateUrgencyEnum.optional().nullable(),
  timeline: TimelineEnum.optional().nullable(),
  energy_cert_min: EnergyCertClassEnum.optional().nullable(),
  furnished: FurnishedStatusEnum.optional().nullable(),

  // Array enums (arrive pre-split from normalizer)
  condition: z.array(PropertyConditionEnum).optional().nullable(),
  heating_type: z.array(HeatingTypeEnum).optional().nullable(),

  // Range numerics (all optional, nullable, coerced)
  budget_min: z.coerce.number().positive().optional().nullable(),
  budget_max: z.coerce.number().positive().optional().nullable(),
  size_min_sqm: z.coerce.number().positive().optional().nullable(),
  size_max_sqm: z.coerce.number().positive().optional().nullable(),
  plot_size_min_sqm: z.coerce.number().positive().optional().nullable(),
  plot_size_max_sqm: z.coerce.number().positive().optional().nullable(),
  bedrooms_min: z.coerce.number().int().min(0).optional().nullable(),
  bedrooms_max: z.coerce.number().int().min(0).optional().nullable(),
  bathrooms_min: z.coerce.number().min(0).optional().nullable(),
  bathrooms_max: z.coerce.number().min(0).optional().nullable(),
  floor_min: z.coerce.number().int().optional().nullable(),
  floor_max: z.coerce.number().int().optional().nullable(),
  year_built_min: z.coerce.number().int().optional().nullable(),
  year_built_max: z.coerce.number().int().optional().nullable(),

  // Booleans
  ground_floor_only: z.coerce.boolean().optional().default(false),
  elevator: z.coerce.boolean().optional().nullable(),
  parking: z.coerce.boolean().optional().nullable(),
  pets_allowed: z.coerce.boolean().optional().nullable(),
  inside_city_plan: z.coerce.boolean().optional().nullable(),
  legalization_ok: z.coerce.boolean().optional().default(false),

  // JSON arrays (arrive pre-split)
  areas_of_interest: z.array(z.string()).optional().nullable(),
  amenities: z.array(z.string()).optional().nullable(),

  // Strings
  municipality: z.coerce.string().optional().or(z.literal("")),
  region: z.coerce.string().optional().or(z.literal("")),
  notes: z.coerce.string().optional().or(z.literal("")),

  // DateTime
  expires_at: z.coerce.string().optional().or(z.literal("")),
});

export type MandateImportData = z.infer<typeof mandateImportSchema>;

/**
 * Field definition type with aliases for fuzzy matching
 */
export interface MandateFieldDefinition {
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
export const mandateImportFieldDefinitions: readonly MandateFieldDefinition[] = [
  // basic group
  {
    key: "id",
    required: false,
    group: "basic",
    aliases: ["mandate_id", "ref", "reference", "code", "entoli_id"],
    description: "Mandate ID (auto-generated if not provided)",
  },
  {
    key: "title",
    required: true,
    group: "basic",
    aliases: ["name", "mandate_name", "titlos", "onoma_entolis", "subject"],
    description: "Mandate title",
  },
  {
    key: "transaction_type",
    required: false,
    group: "basic",
    aliases: ["transaction", "deal_type", "typos_synallagis"],
    description: "Transaction type (SALE, RENTAL, etc.)",
  },
  {
    key: "property_type",
    required: false,
    group: "basic",
    aliases: ["type", "prop_type", "typos_akinitiou"],
    description: "Property type",
  },
  {
    key: "property_purpose",
    required: false,
    group: "basic",
    aliases: ["purpose", "skopos"],
    description: "Property purpose (RESIDENTIAL, COMMERCIAL, etc.)",
  },
  {
    key: "status",
    required: false,
    group: "basic",
    aliases: ["mandate_status", "katastasi"],
    description: "Status (DRAFT, ACTIVE, etc.)",
  },
  {
    key: "urgency",
    required: false,
    group: "basic",
    aliases: ["priority", "epeigousa", "proteraiotita"],
    description: "Urgency level",
  },
  {
    key: "timeline",
    required: false,
    group: "basic",
    aliases: ["timeframe", "chronodiagramma"],
    description: "Timeline",
  },

  // budget group
  {
    key: "budget_min",
    required: false,
    group: "budget",
    aliases: ["min_budget", "elachisto_budget", "minimum_budget", "budget_from"],
    description: "Minimum budget (EUR)",
  },
  {
    key: "budget_max",
    required: false,
    group: "budget",
    aliases: ["max_budget", "megisto_budget", "maximum_budget", "budget_to"],
    description: "Maximum budget (EUR)",
  },

  // size group
  {
    key: "size_min_sqm",
    required: false,
    group: "size",
    aliases: ["min_size", "min_sqm", "elachisto_emvadon"],
    description: "Min size (sq.m.)",
  },
  {
    key: "size_max_sqm",
    required: false,
    group: "size",
    aliases: ["max_size", "max_sqm", "megisto_emvadon"],
    description: "Max size (sq.m.)",
  },
  {
    key: "plot_size_min_sqm",
    required: false,
    group: "size",
    aliases: ["min_plot", "min_oikopedo"],
    description: "Min plot size (sq.m.)",
  },
  {
    key: "plot_size_max_sqm",
    required: false,
    group: "size",
    aliases: ["max_plot", "max_oikopedo"],
    description: "Max plot size (sq.m.)",
  },

  // rooms group
  {
    key: "bedrooms_min",
    required: false,
    group: "rooms",
    aliases: ["min_bedrooms", "min_beds", "elachista_ypnodomatia"],
    description: "Min bedrooms",
  },
  {
    key: "bedrooms_max",
    required: false,
    group: "rooms",
    aliases: ["max_bedrooms", "max_beds", "megista_ypnodomatia"],
    description: "Max bedrooms",
  },
  {
    key: "bathrooms_min",
    required: false,
    group: "rooms",
    aliases: ["min_bathrooms", "min_baths", "elachista_mpania"],
    description: "Min bathrooms",
  },
  {
    key: "bathrooms_max",
    required: false,
    group: "rooms",
    aliases: ["max_bathrooms", "max_baths", "megista_mpania"],
    description: "Max bathrooms",
  },
  {
    key: "floor_min",
    required: false,
    group: "rooms",
    aliases: ["min_floor", "elachistos_orofos"],
    description: "Min floor",
  },
  {
    key: "floor_max",
    required: false,
    group: "rooms",
    aliases: ["max_floor", "megistos_orofos"],
    description: "Max floor",
  },
  {
    key: "year_built_min",
    required: false,
    group: "rooms",
    aliases: ["min_year", "apo_etos"],
    description: "Min year built",
  },
  {
    key: "year_built_max",
    required: false,
    group: "rooms",
    aliases: ["max_year", "eos_etos"],
    description: "Max year built",
  },

  // building group
  {
    key: "condition",
    required: false,
    group: "building",
    aliases: ["katastasi", "property_condition", "state"],
    description: "Condition (comma-separated: EXCELLENT,GOOD)",
  },
  {
    key: "heating_type",
    required: false,
    group: "building",
    aliases: ["thermansi", "heating", "heat_type"],
    description: "Heating type (comma-separated: AUTONOMOUS,CENTRAL)",
  },
  {
    key: "energy_cert_min",
    required: false,
    group: "building",
    aliases: ["energy_class", "pea", "energeiaki_klasi"],
    description: "Min energy certificate class",
  },
  {
    key: "furnished",
    required: false,
    group: "building",
    aliases: ["epiplomeno", "furnishing"],
    description: "Furnished status",
  },

  // features group
  {
    key: "ground_floor_only",
    required: false,
    group: "features",
    aliases: ["isogeo", "ground_floor"],
    description: "Ground floor only (true/false)",
  },
  {
    key: "elevator",
    required: false,
    group: "features",
    aliases: ["asanser", "lift"],
    description: "Elevator required (true/false)",
  },
  {
    key: "parking",
    required: false,
    group: "features",
    aliases: ["parking_required", "thesis_stathmeysis"],
    description: "Parking required (true/false)",
  },
  {
    key: "pets_allowed",
    required: false,
    group: "features",
    aliases: ["pets", "katoikidia", "accepts_pets"],
    description: "Pets allowed (true/false)",
  },
  {
    key: "inside_city_plan",
    required: false,
    group: "features",
    aliases: ["entos_schediou", "city_plan"],
    description: "Inside city plan (true/false)",
  },
  {
    key: "legalization_ok",
    required: false,
    group: "features",
    aliases: ["taktopoiisi_ok", "legalization"],
    description: "Legalization OK (true/false)",
  },

  // location group
  {
    key: "municipality",
    required: false,
    group: "location",
    aliases: ["dimos", "municipality_name"],
    description: "Municipality",
  },
  {
    key: "region",
    required: false,
    group: "location",
    aliases: ["perifereia", "prefecture"],
    description: "Region",
  },
  {
    key: "areas_of_interest",
    required: false,
    group: "location",
    aliases: ["areas", "perioxes", "locations", "neighborhoods"],
    description: "Areas of interest (comma-separated)",
  },

  // other group
  {
    key: "amenities",
    required: false,
    group: "other",
    aliases: ["paroxes", "features", "extras"],
    description: "Amenities (comma-separated)",
  },
  {
    key: "notes",
    required: false,
    group: "other",
    aliases: ["simeioseis", "comments", "description", "perigrafi"],
    description: "Notes",
  },
  {
    key: "expires_at",
    required: false,
    group: "other",
    aliases: ["expiry", "expiration", "lixi", "imerominia_lixis"],
    description: "Expiration date",
  },
] as const;

export type MandateImportFieldKey = (typeof mandateImportFieldDefinitions)[number]["key"];

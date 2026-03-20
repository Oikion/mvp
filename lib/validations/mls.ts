import { z } from "zod";
import {
  PropertyType as PrismaPropertyType,
  PropertyStatus as PrismaPropertyStatus,
  TransactionType as PrismaTransactionType,
  HeatingType,
  EnergyCertClass,
  PropertyCondition,
  FurnishedStatus,
  ItemVisibility,
  AddressPrivacyLevel,
  FrontageType,
  PriceType,
} from "@prisma/client";

/**
 * Zod schemas for MLS (Property) input validation
 * Prevents mass assignment attacks and ensures data integrity
 *
 * IMPORTANT: All enum schemas use z.nativeEnum() derived from @prisma/client.
 * This ensures validation stays in sync with the database schema automatically.
 * After any Prisma schema change, run `prisma generate` — TypeScript will catch drift.
 */

// =============================================================================
// Enum Schemas — derived from @prisma/client
// =============================================================================

export const propertyTypeSchema = z.nativeEnum(PrismaPropertyType);
export const propertyStatusSchema = z.nativeEnum(PrismaPropertyStatus);
export const transactionTypeSchema = z.nativeEnum(PrismaTransactionType);
export const heatingTypeSchema = z.nativeEnum(HeatingType);
export const energyCertClassSchema = z.nativeEnum(EnergyCertClass);
export const propertyConditionSchema = z.nativeEnum(PropertyCondition);
export const furnishedStatusSchema = z.nativeEnum(FurnishedStatus);
export const itemVisibilitySchema = z.nativeEnum(ItemVisibility);
export const addressPrivacyLevelSchema = z.nativeEnum(AddressPrivacyLevel);
export const frontageTypeSchema = z.nativeEnum(FrontageType);
export const priceTypeSchema = z.nativeEnum(PriceType);

// =============================================================================
// Helper Types
// =============================================================================

// Property types that require plot_size_sqm
const LAND_PROPERTY_TYPES = ["LAND", "PLOT", "FARM"] as const;


// Current year for date validation
const CURRENT_YEAR = new Date().getFullYear();

// =============================================================================
// Base Property Fields Schema
// =============================================================================

/**
 * Base schema for property fields
 * Used internally - use createPropertySchema for actual validation
 */
const propertyFieldsSchema = z.object({
  // Basic info
  property_name: z.string().min(1, "Property name is required").max(255),
  property_type: propertyTypeSchema.optional(),
  property_status: propertyStatusSchema.optional(),
  transaction_type: transactionTypeSchema.optional(),
  
  // Price information
  price: z.number().int().min(0).optional().nullable(),
  price_type: priceTypeSchema.optional(),
  listPrice: z.number().int().min(0).optional().nullable(),
  salePrice: z.number().int().min(0).optional().nullable(),
  
  // Area measurements (at least one required for most property types)
  size_net_sqm: z.number().min(0).optional().nullable(),
  size_gross_sqm: z.number().min(0).optional().nullable(),
  plot_size_sqm: z.number().min(0).optional().nullable(),
  lot_size: z.number().min(0).optional().nullable(),
  
  // Property details
  bedrooms: z.number().int().min(0).optional().nullable(),
  bathrooms: z.number().min(0).optional().nullable(),
  floor: z.string().max(50).optional(),
  floors_total: z.number().int().min(0).optional().nullable(),
  year_built: z.number().int().min(1800).max(CURRENT_YEAR + 5).optional().nullable(),
  renovated_year: z.number().int().min(1800).max(CURRENT_YEAR + 5).optional().nullable(),
  
  // Features and amenities
  condition: propertyConditionSchema.optional(),
  heating_type: heatingTypeSchema.optional(),
  energy_cert_class: energyCertClassSchema.optional(),
  furnished: furnishedStatusSchema.optional(),
  elevator: z.boolean().optional(),
  accessibility: z.string().max(255).optional(),
  accepts_pets: z.boolean().optional(),
  amenities: z.array(z.string()).optional(),
  orientation: z.array(z.string()).optional(),
  
  // Address
  address_street: z.string().max(255).optional(),
  address_city: z.string().max(100).optional(),
  address_state: z.string().max(100).optional(),
  address_zip: z.string().max(20).optional(),
  postal_code: z.string().max(20).optional(),
  municipality: z.string().max(100).optional(),
  area: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  regional_unit: z.string().max(100).optional(),
  address_privacy_level: addressPrivacyLevelSchema.optional(),
  
  // Legal information
  land_registry_kaek: z.string().regex(/^\d{5,14}$/, "KAEK must be 5-14 digits").optional().or(z.literal("")),
  land_registry_office: z.string().max(200).optional(),
  building_block_ot: z.string().max(50).optional(),
  building_permit_no: z.string().max(100).optional(),
  building_permit_year: z.number().int().min(1800).max(CURRENT_YEAR + 5).optional().nullable(),
  legalization_status: z.string().max(50).optional(),
  inside_city_plan: z.boolean().optional(),
  build_coefficient: z.number().min(0).optional().nullable(),
  coverage_ratio: z.number().min(0).max(100).optional().nullable(),
  frontage_m: z.number().min(0).optional().nullable(),
  frontage_type: frontageTypeSchema.optional(),
  objective_zone: z.string().max(20).optional(),
  
  // Management
  etaireia_diaxeirisis: z.string().max(255).optional(),
  monthly_common_charges: z.number().min(0).optional().nullable(),
  
  // Rental specific
  available_from: z.string().datetime().optional().or(z.literal("")),
  min_lease_months: z.number().int().min(0).optional().nullable(),
  
  // Status and visibility
  is_exclusive: z.boolean().optional(),
  visibility: itemVisibilitySchema.optional(),
  draft_status: z.boolean().optional(),
  
  // Dates
  saleDate: z.string().datetime().optional().or(z.literal("")),
  contractDate: z.string().datetime().optional().or(z.literal("")),
  
  // Description
  description: z.string().optional(),
  
  // Assignment
  assigned_to: z.string().min(1).optional().nullable(),
  
  // Primary email for contact
  primary_email: z.string().email().optional().or(z.literal("")),
}).strict();

// =============================================================================
// Create Property Schema with Business Rules
// =============================================================================

/**
 * Schema for creating a new property
 * Validates all allowed fields and applies business rules
 * 
 * Business Rules Applied:
 * - MLS-001: Price must be positive (except EXCHANGE transactions)
 * - MLS-002: At least one area measurement required
 * - MLS-003: Transaction type determines required fields
 * - MLS-005: Date consistency (renovated_year >= year_built)
 * - MLS-006: Property type specific requirements
 * - MLS-009: Net size cannot exceed gross size
 */
export const createPropertySchema = propertyFieldsSchema
  // MLS-001: Price must be positive for SALE, RENTAL, SHORT_TERM
  .refine(
    (data) => {
      // Price not required for EXCHANGE transactions
      if (data.transaction_type === "EXCHANGE") {
        return true;
      }
      // Price is required and must be positive for other transaction types
      if (data.transaction_type) {
        // Allow null/undefined for drafts, but if set must be positive
        if (data.price !== null && data.price !== undefined) {
          return data.price > 0;
        }
        // If not a draft, price should be set
        if (!data.draft_status) {
          return data.price != null && data.price > 0;
        }
      }
      return true;
    },
    {
      message: "Price is required and must be greater than zero for this transaction type",
      path: ["price"],
    }
  )
  // MLS-002: At least one area measurement required (for non-draft properties)
  .refine(
    (data) => {
      // Skip validation for drafts
      if (data.draft_status) {
        return true;
      }
      // At least one area measurement should be provided
      const hasArea = 
        (data.size_net_sqm != null && data.size_net_sqm > 0) ||
        (data.size_gross_sqm != null && data.size_gross_sqm > 0) ||
        (data.plot_size_sqm != null && data.plot_size_sqm > 0) ||
        (data.lot_size != null && data.lot_size > 0);
      return hasArea;
    },
    {
      message: "At least one area measurement is required (square feet, net sqm, gross sqm, or plot size)",
      path: ["size_net_sqm"],
    }
  )
  // MLS-005: Date consistency - renovated_year must be >= year_built
  .refine(
    (data) => {
      if (data.year_built != null && data.renovated_year != null) {
        return data.renovated_year >= data.year_built;
      }
      return true;
    },
    {
      message: "Renovation year cannot be before construction year",
      path: ["renovated_year"],
    }
  )
  // MLS-005: Date consistency - building_permit_year must be <= year_built
  .refine(
    (data) => {
      if (data.year_built != null && data.building_permit_year != null) {
        return data.building_permit_year <= data.year_built;
      }
      return true;
    },
    {
      message: "Building permit year should be before or equal to construction year",
      path: ["building_permit_year"],
    }
  )
  // MLS-006: Land properties require plot_size_sqm
  .refine(
    (data) => {
      // Skip for drafts
      if (data.draft_status) {
        return true;
      }
      // Land types must have plot_size_sqm
      if (data.property_type && LAND_PROPERTY_TYPES.includes(data.property_type as typeof LAND_PROPERTY_TYPES[number])) {
        return data.plot_size_sqm != null && data.plot_size_sqm > 0;
      }
      return true;
    },
    {
      message: "Land properties require plot size to be specified",
      path: ["plot_size_sqm"],
    }
  )
  // MLS-009: Net size cannot exceed gross size
  .refine(
    (data) => {
      if (data.size_net_sqm != null && data.size_gross_sqm != null) {
        return data.size_net_sqm <= data.size_gross_sqm;
      }
      return true;
    },
    {
      message: "Net size cannot exceed gross size",
      path: ["size_net_sqm"],
    }
  )
  // Greek postal code format validation (5 digits if provided)
  .refine(
    (data) => {
      const postalCode = data.postal_code || data.address_zip;
      if (postalCode && postalCode.length > 0) {
        // Greek postal codes are 5 digits
        return /^\d{5}$/.test(postalCode);
      }
      return true;
    },
    {
      message: "Greek postal code must be exactly 5 digits",
      path: ["postal_code"],
    }
  );

// =============================================================================
// Update Property Schema
// =============================================================================

/**
 * Schema for updating an existing property
 * All fields optional except id
 * 
 * Note: Some business rules are relaxed for partial updates.
 * Status transitions should be validated separately in the action layer.
 */
export const updatePropertySchema = z.object({
  id: z.string().min(1, "Property ID is required"),
}).merge(propertyFieldsSchema.partial())
  .strict() // Must be called before .refine() - Zod 3.x requirement
  // MLS-005: Date consistency (if both provided in update)
  .refine(
    (data) => {
      if (data.year_built != null && data.renovated_year != null) {
        return data.renovated_year >= data.year_built;
      }
      return true;
    },
    {
      message: "Renovation year cannot be before construction year",
      path: ["renovated_year"],
    }
  )
  // MLS-009: Net size cannot exceed gross size (if both provided in update)
  .refine(
    (data) => {
      if (data.size_net_sqm != null && data.size_gross_sqm != null) {
        return data.size_net_sqm <= data.size_gross_sqm;
      }
      return true;
    },
    {
      message: "Net size cannot exceed gross size",
    }
  );

// =============================================================================
// Property Query Schema
// =============================================================================

/**
 * Schema for property search/filter parameters
 */
export const propertyQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(100)).optional(),
  status: propertyStatusSchema.optional(),
  property_type: propertyTypeSchema.optional(),
  transaction_type: transactionTypeSchema.optional(),
  search: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  min_price: z.string().regex(/^\d+$/).transform(Number).optional(),
  max_price: z.string().regex(/^\d+$/).transform(Number).optional(),
  min_sqm: z.string().regex(/^\d+$/).transform(Number).optional(),
  max_sqm: z.string().regex(/^\d+$/).transform(Number).optional(),
  bedrooms: z.string().regex(/^\d+$/).transform(Number).optional(),
  visibility: itemVisibilitySchema.optional(),
});

// =============================================================================
// Portal Publishing Validation
// =============================================================================

/**
 * Validates that a property meets minimum requirements for public publishing
 * Used before setting visibility to PUBLIC
 * 
 * Business Rule MLS-008: Portal publishing readiness check
 */
export function validatePublishingReadiness(data: z.infer<typeof propertyFieldsSchema>): {
  ready: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required for publishing
  if (!data.property_name || data.property_name.length === 0) {
    errors.push("Property name is required");
  }
  
  if (!data.property_type) {
    errors.push("Property type is required");
  }
  
  if (!data.transaction_type) {
    errors.push("Transaction type is required");
  }
  
  // Price required (except EXCHANGE)
  if (data.transaction_type !== "EXCHANGE") {
    if (data.price == null || data.price <= 0) {
      errors.push("Price is required and must be greater than zero");
    }
  }
  
  // Area required
  const hasArea = 
    (data.size_net_sqm != null && data.size_net_sqm > 0) ||
    (data.size_gross_sqm != null && data.size_gross_sqm > 0) ||
    (data.plot_size_sqm != null && data.plot_size_sqm > 0);
  
  if (!hasArea) {
    errors.push("At least one area measurement is required");
  }
  
  // Recommended fields (warnings)
  if (!data.description || data.description.length === 0) {
    warnings.push("Description is recommended for better listing visibility");
  }
  
  if (!data.address_city && !data.municipality) {
    warnings.push("Location information (city or municipality) is recommended");
  }
  
  return {
    ready: errors.length === 0,
    errors,
    warnings,
  };
}

// =============================================================================
// Form Schemas — shared between creation wizards and edit forms
// =============================================================================

/**
 * Single source of truth for property form field constraints.
 * Both NewPropertyWizard and EditPropertyForm import from here so they
 * can never drift apart. assigned_to uses .nullable() because the DB
 * stores null when no agent was set at creation time.
 */
export const propertyFormSchema = z.object({
  property_name: z.string().min(1, "Property name is required"),
  property_type: propertyTypeSchema.optional(),
  property_type_other: z.string().optional(),
  transaction_type: transactionTypeSchema.optional(),
  property_status: propertyStatusSchema.optional(),
  is_exclusive: z.boolean().optional().default(false),
  country: z.string().optional().default("GR"),
  municipality: z.string().optional(),
  area: z.string().optional(),
  postal_code: z.string().optional(),
  address_privacy_level: addressPrivacyLevelSchema.optional(),
  address_street: z.string().optional(),
  region: z.string().max(100).optional(),
  regional_unit: z.string().max(100).optional(),
  objective_zone: z.string().max(20).optional(),
  size_net_sqm: z.coerce.number().optional(),
  size_gross_sqm: z.coerce.number().optional(),
  floor: z.string().optional(),
  floors_total: z.coerce.number().optional(),
  plot_size_sqm: z.coerce.number().optional(),
  inside_city_plan: z.boolean().optional(),
  build_coefficient: z.coerce.number().optional(),
  frontage_m: z.coerce.number().optional(),
  frontage_type: frontageTypeSchema.optional(),
  bedrooms: z.coerce.number().optional(),
  bathrooms: z.coerce.number().optional(),
  heating_type: heatingTypeSchema.optional(),
  energy_cert_class: energyCertClassSchema.optional(),
  year_built: z.coerce.number().optional(),
  renovated_year: z.coerce.number().optional(),
  condition: propertyConditionSchema.optional(),
  elevator: z.boolean().optional(),
  building_permit_no: z.string().optional().or(z.literal("")),
  building_permit_year: z.coerce.number().optional(),
  land_registry_kaek: z.string().optional().or(z.literal("")),
  land_registry_office: z.string().max(200).optional(),
  building_block_ot: z.string().max(50).optional(),
  legalization_status: z.enum(["LEGALIZED", "IN_PROGRESS", "UNDECLARED"]).optional(),
  etaireia_diaxeirisis: z.string().optional().or(z.literal("")),
  monthly_common_charges: z.coerce.number().optional(),
  amenities: z.array(z.string()).optional().default([]),
  orientation: z.array(z.string()).optional().default([]),
  furnished: furnishedStatusSchema.optional(),
  accessibility: z.string().optional().or(z.literal("")),
  price: z.coerce.number().optional(),
  price_type: priceTypeSchema.optional(),
  available_from: z.string().optional(),
  accepts_pets: z.boolean().optional(),
  min_lease_months: z.coerce.number().optional(),
  virtual_tour_url: z.string().url().optional().or(z.literal("")),
  visibility: itemVisibilitySchema.optional(),
  assigned_to: z.string().optional().nullable(),
  description: z.string().optional(),
});

export const propertyEditFormSchema = propertyFormSchema.extend({
  id: z.string().min(1, "Property ID is required"),
});

export type PropertyFormValues = z.infer<typeof propertyFormSchema>;
export type PropertyEditFormValues = z.infer<typeof propertyEditFormSchema>;

// =============================================================================
// Type Exports
// =============================================================================

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type PropertyQueryParams = z.infer<typeof propertyQuerySchema>;
export type PropertyType = z.infer<typeof propertyTypeSchema>;
export type PropertyStatus = z.infer<typeof propertyStatusSchema>;
export type TransactionType = z.infer<typeof transactionTypeSchema>;

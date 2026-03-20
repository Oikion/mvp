import { z } from "zod";
import {
  MandateStatus,
  MandateUrgency,
  Timeline,
  PropertyPurpose,
  ItemVisibility,
} from "@prisma/client";

import {
  propertyTypeSchema,
  transactionTypeSchema,
  propertyConditionSchema,
  heatingTypeSchema,
  energyCertClassSchema,
  furnishedStatusSchema,
} from "./mls";

/**
 * Zod schemas for Mandate input validation
 * Prevents mass assignment attacks and ensures data integrity
 *
 * IMPORTANT: All enum schemas use z.nativeEnum() derived from @prisma/client.
 * This ensures validation stays in sync with the database schema automatically.
 * After any Prisma schema change, run `prisma generate` — TypeScript will catch drift.
 */

// =============================================================================
// Enum Schemas — derived from @prisma/client
// =============================================================================

export const mandateStatusSchema = z.nativeEnum(MandateStatus);
export const mandateUrgencySchema = z.nativeEnum(MandateUrgency);
export const timelineSchema = z.nativeEnum(Timeline);
export const propertyPurposeSchema = z.nativeEnum(PropertyPurpose);
export const itemVisibilitySchema = z.nativeEnum(ItemVisibility);

// =============================================================================
// Base Mandate Fields Schema
// =============================================================================

/**
 * Base schema for mandate fields
 * Used internally - use createMandateSchema for actual validation
 */
// Helper: nullable coerced number — prevents z.coerce.number() from turning
// null into 0.  z.null() is checked first so null never reaches Number().
const nullableNum = (constraints?: { min?: number; int?: boolean }) => {
  let num = z.coerce.number();
  if (constraints?.int) num = num.int();
  if (constraints?.min !== undefined) num = num.min(constraints.min);
  return z.union([z.null(), num]).optional();
};

const mandateFieldsSchema = z.object({
  // Basic info
  title: z.string().min(1, "Title is required").max(200),
  transaction_type: transactionTypeSchema,
  property_type: propertyTypeSchema.optional().nullable(),
  property_purpose: propertyPurposeSchema.optional().nullable(),

  // Location preferences
  areas_of_interest: z.array(z.string()).optional(),
  municipality: z.string().max(100).optional().nullable(),
  region: z.string().max(100).optional().nullable(),

  // Size criteria
  size_min_sqm: nullableNum({ min: 0 }),
  size_max_sqm: nullableNum({ min: 0 }),
  plot_size_min_sqm: nullableNum({ min: 0 }),
  plot_size_max_sqm: nullableNum({ min: 0 }),

  // Budget criteria
  budget_min: nullableNum({ min: 0 }),
  budget_max: nullableNum({ min: 0 }),

  // Room criteria
  bedrooms_min: nullableNum({ int: true, min: 0 }),
  bedrooms_max: nullableNum({ int: true, min: 0 }),
  bathrooms_min: nullableNum({ int: true, min: 0 }),
  bathrooms_max: nullableNum({ int: true, min: 0 }),

  // Floor criteria
  floor_min: nullableNum({ int: true }),
  floor_max: nullableNum({ int: true }),
  ground_floor_only: z.boolean().optional(),

  // Property features
  condition: z.array(propertyConditionSchema).optional(),
  year_built_min: nullableNum({ int: true, min: 1800 }),
  year_built_max: nullableNum({ int: true }),
  heating_type: z.array(heatingTypeSchema).optional(),
  energy_cert_min: energyCertClassSchema.optional().nullable(),
  furnished: furnishedStatusSchema.optional().nullable(),
  elevator: z.boolean().optional(),
  parking: z.boolean().optional(),
  pets_allowed: z.boolean().optional(),
  amenities: z.array(z.string()).optional(),

  // Legal preferences
  inside_city_plan: z.boolean().optional(),
  legalization_ok: z.boolean().optional(),

  // Status and management
  status: mandateStatusSchema.optional().nullable(),
  urgency: mandateUrgencySchema.optional().nullable(),
  timeline: timelineSchema.optional().nullable(),
  expires_at: z.union([z.null(), z.coerce.date()]).optional(),
  notes: z.string().max(5000).optional().nullable(),
  communication_notes: z.any().optional(),

  // Relationships
  assigned_to: z.string().min(1).optional().nullable(),

  // Visibility
  visibility: itemVisibilitySchema.optional(),

  // Draft flag
  draft_status: z.boolean().optional(),
});

// =============================================================================
// Create Mandate Schema with Business Rules
// =============================================================================

/**
 * Schema for creating a new mandate
 * Validates all allowed fields and applies business rules
 *
 * Business Rules Applied:
 * - MND-001: budget_min <= budget_max when both provided
 * - MND-002: size_min_sqm <= size_max_sqm when both provided
 * - MND-003: bedrooms_min <= bedrooms_max when both provided
 * - MND-004: floor_min <= floor_max when both provided
 * - MND-005: year_built_min <= year_built_max when both provided
 */
export const createMandateSchema = mandateFieldsSchema
  // MND-001: Budget range consistency
  .refine(
    (data) => {
      if (data.draft_status) return true;
      if (data.budget_min != null && data.budget_max != null) {
        return data.budget_min <= data.budget_max;
      }
      return true;
    },
    {
      message: "Minimum budget cannot exceed maximum budget",
      path: ["budget_min"],
    }
  )
  // MND-002: Size range consistency
  .refine(
    (data) => {
      if (data.draft_status) return true;
      if (data.size_min_sqm != null && data.size_max_sqm != null) {
        return data.size_min_sqm <= data.size_max_sqm;
      }
      return true;
    },
    {
      message: "Minimum size cannot exceed maximum size",
      path: ["size_min_sqm"],
    }
  )
  // MND-003: Bedrooms range consistency
  .refine(
    (data) => {
      if (data.draft_status) return true;
      if (data.bedrooms_min != null && data.bedrooms_max != null) {
        return data.bedrooms_min <= data.bedrooms_max;
      }
      return true;
    },
    {
      message: "Minimum bedrooms cannot exceed maximum bedrooms",
      path: ["bedrooms_min"],
    }
  )
  // MND-004: Floor range consistency
  .refine(
    (data) => {
      if (data.draft_status) return true;
      if (data.floor_min != null && data.floor_max != null) {
        return data.floor_min <= data.floor_max;
      }
      return true;
    },
    {
      message: "Minimum floor cannot exceed maximum floor",
      path: ["floor_min"],
    }
  )
  // MND-005: Year built range consistency
  .refine(
    (data) => {
      if (data.draft_status) return true;
      if (data.year_built_min != null && data.year_built_max != null) {
        return data.year_built_min <= data.year_built_max;
      }
      return true;
    },
    {
      message: "Minimum year built cannot exceed maximum year built",
      path: ["year_built_min"],
    }
  );

// =============================================================================
// Update Mandate Schema
// =============================================================================

/**
 * Schema for updating an existing mandate
 * All fields optional except id
 *
 * Note: Some business rules are relaxed for partial updates.
 * Status transitions should be validated separately in the action layer.
 */
export const updateMandateSchema = z
  .object({
    id: z.string().min(1, "Mandate ID is required"),
  })
  .merge(mandateFieldsSchema.partial())
  // MND-001: Budget range consistency (if both provided in update)
  .refine(
    (data) => {
      if (data.draft_status) return true;
      if (data.budget_min != null && data.budget_max != null) {
        return data.budget_min <= data.budget_max;
      }
      return true;
    },
    {
      message: "Minimum budget cannot exceed maximum budget",
      path: ["budget_min"],
    }
  )
  // MND-002: Size range consistency (if both provided in update)
  .refine(
    (data) => {
      if (data.draft_status) return true;
      if (data.size_min_sqm != null && data.size_max_sqm != null) {
        return data.size_min_sqm <= data.size_max_sqm;
      }
      return true;
    },
    {
      message: "Minimum size cannot exceed maximum size",
      path: ["size_min_sqm"],
    }
  )
  // MND-003: Bedrooms range consistency (if both provided in update)
  .refine(
    (data) => {
      if (data.draft_status) return true;
      if (data.bedrooms_min != null && data.bedrooms_max != null) {
        return data.bedrooms_min <= data.bedrooms_max;
      }
      return true;
    },
    {
      message: "Minimum bedrooms cannot exceed maximum bedrooms",
      path: ["bedrooms_min"],
    }
  )
  // MND-004: Floor range consistency (if both provided in update)
  .refine(
    (data) => {
      if (data.draft_status) return true;
      if (data.floor_min != null && data.floor_max != null) {
        return data.floor_min <= data.floor_max;
      }
      return true;
    },
    {
      message: "Minimum floor cannot exceed maximum floor",
      path: ["floor_min"],
    }
  )
  // MND-005: Year built range consistency (if both provided in update)
  .refine(
    (data) => {
      if (data.draft_status) return true;
      if (data.year_built_min != null && data.year_built_max != null) {
        return data.year_built_min <= data.year_built_max;
      }
      return true;
    },
    {
      message: "Minimum year built cannot exceed maximum year built",
      path: ["year_built_min"],
    }
  );

// =============================================================================
// Mandate Query Schema
// =============================================================================

/**
 * Schema for mandate search/filter parameters
 */
export const mandateQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  status: z.string().optional(), // Comma-separated statuses
  search: z.string().optional(),
  minimal: z.enum(["true", "false"]).optional(),
  linked: z.enum(["true", "false"]).optional(), // Filter by has/no client
});

// =============================================================================
// Type Exports
// =============================================================================

export type CreateMandateInput = z.infer<typeof createMandateSchema>;
export type UpdateMandateInput = z.infer<typeof updateMandateSchema>;
export type MandateQueryParams = z.infer<typeof mandateQuerySchema>;

// =============================================================================
// Form Schemas — shared between creation wizards and edit forms
// =============================================================================

/**
 * Single source of truth for mandate form field constraints.
 * Both NewMandateWizard and EditMandateForm import from here.
 * assigned_to uses .nullable() because the DB stores null when no agent was set.
 * property_type uses .nullable() because it is optional in the DB.
 */
export const mandateFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  transaction_type: transactionTypeSchema,
  property_type: propertyTypeSchema.optional().nullable(),
  property_purpose: propertyPurposeSchema.optional().nullable(),
  status: mandateStatusSchema.optional().nullable(),
  urgency: mandateUrgencySchema.optional().nullable(),
  areas_of_interest: z.array(z.string()).optional().default([]),
  municipality: z.string().max(100).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  size_min_sqm: z.coerce.number().min(0).optional().nullable(),
  size_max_sqm: z.coerce.number().min(0).optional().nullable(),
  plot_size_min_sqm: z.coerce.number().min(0).optional().nullable(),
  plot_size_max_sqm: z.coerce.number().min(0).optional().nullable(),
  bedrooms_min: z.coerce.number().int().min(0).optional().nullable(),
  bedrooms_max: z.coerce.number().int().min(0).optional().nullable(),
  bathrooms_min: z.coerce.number().int().min(0).optional().nullable(),
  bathrooms_max: z.coerce.number().int().min(0).optional().nullable(),
  floor_min: z.coerce.number().int().optional().nullable(),
  floor_max: z.coerce.number().int().optional().nullable(),
  ground_floor_only: z.boolean().optional().default(false),
  budget_min: z.coerce.number().min(0).optional().nullable(),
  budget_max: z.coerce.number().min(0).optional().nullable(),
  timeline: timelineSchema.optional().nullable(),
  year_built_min: z.coerce.number().int().min(1800).optional().nullable(),
  year_built_max: z.coerce.number().int().optional().nullable(),
  condition: z.array(z.string()).optional().default([]),
  heating_type: z.array(z.string()).optional().default([]),
  energy_cert_min: energyCertClassSchema.optional().nullable(),
  furnished: furnishedStatusSchema.optional().nullable(),
  elevator: z.boolean().optional().default(false),
  parking: z.boolean().optional().default(false),
  pets_allowed: z.boolean().optional().default(false),
  amenities: z.array(z.string()).optional().default([]),
  inside_city_plan: z.boolean().optional().default(false),
  legalization_ok: z.boolean().optional().default(false),
  assigned_to: z.string().optional().nullable(),
  clientId: z.string().optional(),
  notes: z.string().max(5000).optional().nullable(),
  expires_at: z.string().optional().nullable(),
});

export const mandateEditFormSchema = mandateFormSchema.extend({
  id: z.string().min(1, "Mandate ID is required"),
});

export type MandateFormValues = z.infer<typeof mandateFormSchema>;
export type MandateEditFormValues = z.infer<typeof mandateEditFormSchema>;

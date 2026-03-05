import { z } from "zod";

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
 * IMPORTANT: These enum values must match the Prisma schema exactly.
 * See prisma/schema.prisma for the source of truth.
 */

// =============================================================================
// Enum Schemas - Match Prisma exactly
// =============================================================================

// Mandate status - matches Prisma MandateStatus enum
export const mandateStatusSchema = z.enum([
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "FULFILLED",
  "EXPIRED",
  "CANCELLED",
]);

// Mandate urgency - matches Prisma MandateUrgency enum
export const mandateUrgencySchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

// Timeline - matches Prisma Timeline enum
export const timelineSchema = z.enum([
  "IMMEDIATE",
  "ONE_THREE_MONTHS",
  "THREE_SIX_MONTHS",
  "SIX_PLUS_MONTHS",
]);

// Property purpose - matches Prisma PropertyPurpose enum
export const propertyPurposeSchema = z.enum([
  "RESIDENTIAL",
  "COMMERCIAL",
  "LAND",
  "PARKING",
  "OTHER",
]);

// =============================================================================
// Base Mandate Fields Schema
// =============================================================================

/**
 * Base schema for mandate fields
 * Used internally - use createMandateSchema for actual validation
 */
const mandateFieldsSchema = z.object({
  // Basic info
  title: z.string().min(1, "Title is required").max(200),
  transaction_type: transactionTypeSchema.optional(),
  property_type: propertyTypeSchema.optional(),
  property_purpose: propertyPurposeSchema.optional(),

  // Location preferences
  areas_of_interest: z.array(z.string()).optional(),
  municipality: z.string().max(100).optional(),
  region: z.string().max(100).optional(),

  // Size criteria
  size_min_sqm: z.coerce.number().min(0).optional(),
  size_max_sqm: z.coerce.number().min(0).optional(),
  plot_size_min_sqm: z.coerce.number().min(0).optional(),
  plot_size_max_sqm: z.coerce.number().min(0).optional(),

  // Budget criteria
  budget_min: z.coerce.number().min(0).optional(),
  budget_max: z.coerce.number().min(0).optional(),

  // Room criteria
  bedrooms_min: z.coerce.number().int().min(0).optional(),
  bedrooms_max: z.coerce.number().int().min(0).optional(),
  bathrooms_min: z.coerce.number().int().min(0).optional(),
  bathrooms_max: z.coerce.number().int().min(0).optional(),

  // Floor criteria
  floor_min: z.coerce.number().int().optional(),
  floor_max: z.coerce.number().int().optional(),
  ground_floor_only: z.boolean().optional(),

  // Property features
  condition: z.array(propertyConditionSchema).optional(),
  year_built_min: z.coerce.number().int().min(1800).optional(),
  year_built_max: z.coerce.number().int().optional(),
  heating_type: z.array(heatingTypeSchema).optional(),
  energy_cert_min: energyCertClassSchema.optional(),
  furnished: furnishedStatusSchema.optional(),
  elevator: z.boolean().optional(),
  parking: z.boolean().optional(),
  pets_allowed: z.boolean().optional(),
  amenities: z.array(z.string()).optional(),

  // Legal preferences
  inside_city_plan: z.boolean().optional(),
  legalization_ok: z.boolean().optional(),

  // Status and management
  status: mandateStatusSchema.optional(),
  urgency: mandateUrgencySchema.optional(),
  timeline: timelineSchema.optional(),
  expires_at: z.coerce.date().optional(),
  notes: z.string().max(5000).optional(),
  communication_notes: z.any().optional(),

  // Relationships
  clientId: z.string().optional(),
  assigned_to: z.string().uuid().optional(),

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

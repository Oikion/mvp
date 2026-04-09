import { z } from "zod";
import {
  RequestType,
  RequestStatus,
  RequestUrgency,
  ClosureReason,
  FinancingStatus,
  PropertyPurpose,
  Timeline,
  ItemVisibility,
} from "@prisma/client";

import {
  propertyTypeSchema,
  propertyConditionSchema,
  heatingTypeSchema,
  energyCertClassSchema,
  furnishedStatusSchema,
} from "./mls";

/**
 * Zod schemas for Request input validation (v2.0 — replaces Mandates)
 *
 * IMPORTANT: All enum schemas use z.nativeEnum() derived from @prisma/client.
 * This ensures validation stays in sync with the database schema automatically.
 */

// =============================================================================
// Enum Schemas
// =============================================================================

export const requestTypeSchema = z.nativeEnum(RequestType);
export const requestStatusSchema = z.nativeEnum(RequestStatus);
export const requestUrgencySchema = z.nativeEnum(RequestUrgency);
export const closureReasonSchema = z.nativeEnum(ClosureReason);
export const financingStatusSchema = z.nativeEnum(FinancingStatus);
export const propertyPurposeSchema = z.nativeEnum(PropertyPurpose);
export const timelineSchema = z.nativeEnum(Timeline);
export const itemVisibilitySchema = z.nativeEnum(ItemVisibility);

// =============================================================================
// Helpers
// =============================================================================

// Nullable coerced number — prevents z.coerce.number() from turning null→0
const nullableNum = (constraints?: { min?: number; int?: boolean }) => {
  let num = z.coerce.number();
  if (constraints?.int) num = num.int();
  if (constraints?.min !== undefined) num = num.min(constraints.min);
  return z.union([z.null(), num]).optional();
};

// =============================================================================
// Base Request Fields Schema
// =============================================================================

const requestFieldsSchema = z.object({
  // Identification
  // Required at the schema level so client forms must provide a title, even
  // though the DB column (`requests.title`) is nullable for legacy rows.
  title: z.string().trim().min(1, "Title is required").max(200),

  // Classification
  requestType: requestTypeSchema,
  propertyCategory: propertyPurposeSchema.optional().nullable(),
  propertyTypes: z.array(propertyTypeSchema).optional().default([]),
  status: requestStatusSchema.optional().default("ACTIVE"),
  urgency: requestUrgencySchema.optional().nullable(),
  closureReason: closureReasonSchema.optional().nullable(),

  // Budget
  budgetMin: nullableNum({ min: 0 }),
  budgetMax: nullableNum({ min: 0 }),

  // Size criteria
  surfaceMin: nullableNum({ min: 0 }),
  surfaceMax: nullableNum({ min: 0 }),
  plotSizeMin: nullableNum({ min: 0 }),
  plotSizeMax: nullableNum({ min: 0 }),

  // Room criteria
  bedroomsMin: nullableNum({ int: true, min: 0 }),
  bedroomsMax: nullableNum({ int: true, min: 0 }),
  bathroomsMin: nullableNum({ int: true, min: 0 }),
  bathroomsMax: nullableNum({ int: true, min: 0 }),

  // Floor criteria
  floorMin: nullableNum({ int: true }),
  floorMax: nullableNum({ int: true }),
  groundFloorOnly: z.boolean().optional().default(false),

  // Construction
  constructionYearMin: nullableNum({ int: true, min: 1800 }),
  constructionYearMax: nullableNum({ int: true }),

  // Features
  conditionPreference: z.array(propertyConditionSchema).optional().default([]),
  heatingTypes: z.array(heatingTypeSchema).optional().default([]),
  energyClassMin: energyCertClassSchema.optional().nullable(),
  furnished: furnishedStatusSchema.optional().nullable(),
  requiresElevator: z.boolean().optional().nullable(),
  requiresParking: z.boolean().optional().nullable(),
  requiresStorage: z.boolean().optional().nullable(),
  requiresGarden: z.boolean().optional().nullable(),
  petFriendly: z.boolean().optional().nullable(),
  requiresAC: z.boolean().optional().nullable(),
  insideCityPlan: z.boolean().optional().nullable(),
  legalizationOk: z.boolean().optional().nullable(),
  amenities: z.array(z.string()).optional(),
  viewTypes: z.array(z.string()).optional().default([]),
  orientationPref: z.array(z.string()).optional().default([]),
  balconyMinSqm: nullableNum({ min: 0 }),

  // Location
  locationDisplayName: z.string().max(300).optional().nullable(),
  areasOfInterest: z.any().optional(), // JSON
  municipality: z.string().max(100).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  centerLatitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  centerLongitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  radiusKm: z.coerce.number().min(0).max(500).optional().nullable(),

  // Investment context
  isInvestmentPurpose: z.boolean().optional().nullable(),
  expectedYieldPct: nullableNum({ min: 0 }),
  goldenVisaEligible: z.boolean().optional().nullable(),
  financingStatus: financingStatusSchema.optional().nullable(),
  auctionInterest: z.boolean().optional().nullable(),

  // Timeline
  timeline: timelineSchema.optional().nullable(),
  expiresAt: z.union([z.null(), z.coerce.date()]).optional(),

  // Notes (encrypted)
  notes: z.string().max(5000).optional().nullable(),
  communicationNotes: z.any().optional(),

  // Assignment
  assignedAgentId: z.string().min(1).optional().nullable(),

  // Visibility & draft
  visibility: itemVisibilitySchema.optional(),
  draftStatus: z.boolean().optional().default(false),
}).strict();

// =============================================================================
// Create Request Schema — with range consistency business rules
// =============================================================================

export const createRequestSchema = requestFieldsSchema
  // REQ-001: Budget range
  .refine(
    (data) => {
      if (data.draftStatus) return true;
      if (data.budgetMin != null && data.budgetMax != null) {
        return data.budgetMin <= data.budgetMax;
      }
      return true;
    },
    { message: "Minimum budget cannot exceed maximum budget", path: ["budgetMin"] }
  )
  // REQ-002: Surface range
  .refine(
    (data) => {
      if (data.draftStatus) return true;
      if (data.surfaceMin != null && data.surfaceMax != null) {
        return data.surfaceMin <= data.surfaceMax;
      }
      return true;
    },
    { message: "Minimum surface cannot exceed maximum surface", path: ["surfaceMin"] }
  )
  // REQ-003: Bedrooms range
  .refine(
    (data) => {
      if (data.draftStatus) return true;
      if (data.bedroomsMin != null && data.bedroomsMax != null) {
        return data.bedroomsMin <= data.bedroomsMax;
      }
      return true;
    },
    { message: "Minimum bedrooms cannot exceed maximum bedrooms", path: ["bedroomsMin"] }
  )
  // REQ-004: Floor range
  .refine(
    (data) => {
      if (data.draftStatus) return true;
      if (data.floorMin != null && data.floorMax != null) {
        return data.floorMin <= data.floorMax;
      }
      return true;
    },
    { message: "Minimum floor cannot exceed maximum floor", path: ["floorMin"] }
  )
  // REQ-005: Construction year range
  .refine(
    (data) => {
      if (data.draftStatus) return true;
      if (data.constructionYearMin != null && data.constructionYearMax != null) {
        return data.constructionYearMin <= data.constructionYearMax;
      }
      return true;
    },
    { message: "Minimum year cannot exceed maximum year", path: ["constructionYearMin"] }
  )
  // REQ-006: Plot size range
  .refine(
    (data) => {
      if (data.draftStatus) return true;
      if (data.plotSizeMin != null && data.plotSizeMax != null) {
        return data.plotSizeMin <= data.plotSizeMax;
      }
      return true;
    },
    { message: "Minimum plot size cannot exceed maximum plot size", path: ["plotSizeMin"] }
  )
  // REQ-007: Bathrooms range
  .refine(
    (data) => {
      if (data.draftStatus) return true;
      if (data.bathroomsMin != null && data.bathroomsMax != null) {
        return data.bathroomsMin <= data.bathroomsMax;
      }
      return true;
    },
    { message: "Minimum bathrooms cannot exceed maximum bathrooms", path: ["bathroomsMin"] }
  );

// =============================================================================
// Update Request Schema — partial, with same business rules
// =============================================================================

export const updateRequestSchema = requestFieldsSchema.partial()
  .refine(
    (data) => {
      if (data.budgetMin != null && data.budgetMax != null) return data.budgetMin <= data.budgetMax;
      return true;
    },
    { message: "Minimum budget cannot exceed maximum budget", path: ["budgetMin"] }
  )
  .refine(
    (data) => {
      if (data.surfaceMin != null && data.surfaceMax != null) return data.surfaceMin <= data.surfaceMax;
      return true;
    },
    { message: "Minimum surface cannot exceed maximum surface", path: ["surfaceMin"] }
  )
  .refine(
    (data) => {
      if (data.bedroomsMin != null && data.bedroomsMax != null) return data.bedroomsMin <= data.bedroomsMax;
      return true;
    },
    { message: "Minimum bedrooms cannot exceed maximum bedrooms", path: ["bedroomsMin"] }
  )
  .refine(
    (data) => {
      if (data.floorMin != null && data.floorMax != null) return data.floorMin <= data.floorMax;
      return true;
    },
    { message: "Minimum floor cannot exceed maximum floor", path: ["floorMin"] }
  )
  .refine(
    (data) => {
      if (data.constructionYearMin != null && data.constructionYearMax != null) return data.constructionYearMin <= data.constructionYearMax;
      return true;
    },
    { message: "Minimum year cannot exceed maximum year", path: ["constructionYearMin"] }
  )
  .refine(
    (data) => {
      if (data.plotSizeMin != null && data.plotSizeMax != null) return data.plotSizeMin <= data.plotSizeMax;
      return true;
    },
    { message: "Minimum plot size cannot exceed maximum plot size", path: ["plotSizeMin"] }
  )
  .refine(
    (data) => {
      if (data.bathroomsMin != null && data.bathroomsMax != null) return data.bathroomsMin <= data.bathroomsMax;
      return true;
    },
    { message: "Minimum bathrooms cannot exceed maximum bathrooms", path: ["bathroomsMin"] }
  );

// =============================================================================
// Query Schema (for API GET requests)
// =============================================================================

export const requestQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  status: z.string().optional(), // Comma-separated RequestStatus values
  requestType: z.string().optional(), // BUY or RENT
  search: z.string().optional(),
  minimal: z.enum(["true", "false"]).optional(),
});

// =============================================================================
// Form Schema (for UI wizard — flat fields before transform)
// =============================================================================

export const requestFormSchema = z.object({
  // Title — required at the UI level so users can't advance past step 1
  // without naming the request. Mirrors the server-side requirement in
  // `createRequestSchema` / `requestFieldsSchema`.
  title: z.string().trim().min(1, "Title is required").max(200),

  // Optional contact link (can be linked later via RequestContact join table)
  contactId: z.string().optional(),

  // Classification
  requestType: requestTypeSchema,
  propertyCategory: propertyPurposeSchema.optional().nullable(),
  propertyTypes: z.array(propertyTypeSchema).optional().default([]),
  urgency: requestUrgencySchema.optional().nullable(),

  // Budget
  budgetMin: z.union([z.literal(""), z.coerce.number().min(0)]).optional(),
  budgetMax: z.union([z.literal(""), z.coerce.number().min(0)]).optional(),

  // Size
  surfaceMin: z.union([z.literal(""), z.coerce.number().min(0)]).optional(),
  surfaceMax: z.union([z.literal(""), z.coerce.number().min(0)]).optional(),
  plotSizeMin: z.union([z.literal(""), z.coerce.number().min(0)]).optional(),
  plotSizeMax: z.union([z.literal(""), z.coerce.number().min(0)]).optional(),

  // Rooms
  bedroomsMin: z.union([z.literal(""), z.coerce.number().int().min(0)]).optional(),
  bedroomsMax: z.union([z.literal(""), z.coerce.number().int().min(0)]).optional(),
  bathroomsMin: z.union([z.literal(""), z.coerce.number().int().min(0)]).optional(),
  bathroomsMax: z.union([z.literal(""), z.coerce.number().int().min(0)]).optional(),

  // Floors
  floorMin: z.union([z.literal(""), z.coerce.number().int()]).optional(),
  floorMax: z.union([z.literal(""), z.coerce.number().int()]).optional(),
  groundFloorOnly: z.boolean().optional().default(false),

  // Construction
  constructionYearMin: z.union([z.literal(""), z.coerce.number().int().min(1800)]).optional(),
  constructionYearMax: z.union([z.literal(""), z.coerce.number().int()]).optional(),

  // Features
  conditionPreference: z.array(propertyConditionSchema).optional().default([]),
  heatingTypes: z.array(heatingTypeSchema).optional().default([]),
  energyClassMin: energyCertClassSchema.optional().nullable(),
  furnished: furnishedStatusSchema.optional().nullable(),
  requiresElevator: z.boolean().optional().nullable(),
  requiresParking: z.boolean().optional().nullable(),
  requiresStorage: z.boolean().optional().nullable(),
  requiresGarden: z.boolean().optional().nullable(),
  petFriendly: z.boolean().optional().nullable(),
  requiresAC: z.boolean().optional().nullable(),
  insideCityPlan: z.boolean().optional().nullable(),
  legalizationOk: z.boolean().optional().nullable(),
  viewTypes: z.array(z.string()).optional().default([]),
  orientationPref: z.array(z.string()).optional().default([]),

  // Location
  locationDisplayName: z.string().max(300).optional(),
  municipality: z.string().max(100).optional(),
  region: z.string().max(100).optional(),

  // Investment
  isInvestmentPurpose: z.boolean().optional().nullable(),
  goldenVisaEligible: z.boolean().optional().nullable(),
  financingStatus: financingStatusSchema.optional().nullable(),
  auctionInterest: z.boolean().optional().nullable(),

  // Timeline
  timeline: timelineSchema.optional().nullable(),

  // Assignment
  assignedAgentId: z.string().optional().nullable(),

  // Notes
  notes: z.string().max(5000).optional(),
});

// =============================================================================
// Type exports
// =============================================================================

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;
export type RequestQueryParams = z.infer<typeof requestQuerySchema>;
export type RequestFormValues = z.infer<typeof requestFormSchema>;

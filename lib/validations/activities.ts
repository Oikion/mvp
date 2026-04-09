import { z } from "zod";

/**
 * Zod schemas for Activity input validation (Phase 4)
 *
 * NOTE: These schemas use z.enum() with inline values rather than z.nativeEnum()
 * from @prisma/client because the ActivityKind, ActivityDirection, and
 * ActivityParentType enums are defined in the schema but the Prisma client has
 * not yet been regenerated. Once `prisma generate` is run after the Phase 4
 * migration, these can be replaced with z.nativeEnum(ActivityKind) etc.
 */

// =============================================================================
// Enum Schemas
// =============================================================================

export const activityKindSchema = z.enum([
  "EMAIL",
  "CALL",
  "MEETING",
  "NOTE",
  "TASK",
  "SHOWING",
  "DOCUMENT",
  "OTHER",
]);

export const activityDirectionSchema = z.enum([
  "INBOUND",
  "OUTBOUND",
  "INTERNAL",
]);

export const activityParentTypeSchema = z.enum([
  "CONTACT",
  "REQUEST",
  "DEAL",
  "PROPERTY",
  "SHOWING",
]);

// =============================================================================
// Create Activity Schema
// =============================================================================

export const createActivitySchema = z
  .object({
    organizationId: z.string().min(1),

    // Parent entity (required)
    parentType: activityParentTypeSchema,
    parentId: z.string().min(1),

    // Classification
    kind: activityKindSchema,
    direction: activityDirectionSchema.optional().default("INTERNAL"),

    // Optional contact link (separate from parent)
    contactId: z.string().optional(),

    // Assignment
    assignedTo: z.string().optional(),

    // Content
    subject: z.string().max(500).optional(),
    body: z.string().optional(),
    outcome: z.string().optional(),

    // Timing
    occurredAt: z.coerce.date().optional(),

    // Duration
    durationMinutes: z.coerce.number().int().min(0).optional(),
  })
  .strict();

// =============================================================================
// Update Activity Schema — partial, minus organizationId
// =============================================================================

export const updateActivitySchema = createActivitySchema
  .omit({ organizationId: true })
  .partial();

// =============================================================================
// List Activities Schema — query parameters
// =============================================================================

export const listActivitiesSchema = z.object({
  organizationId: z.string().min(1),
  parentType: activityParentTypeSchema.optional(),
  parentId: z.string().optional(),
  contactId: z.string().optional(),
  assignedTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// =============================================================================
// Type exports
// =============================================================================

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
export type ListActivitiesInput = z.infer<typeof listActivitiesSchema>;

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
  // System-generated kinds (Activity Log v2)
  "CREATED",
  "UPDATED",
  "LINKED",
  "UNLINKED",
  "STAGE_CHANGED",
  "CALENDAR_EVENT_ADDED",
  "CALENDAR_EVENT_REMOVED",
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

    // Assignment
    assignedToUserId: z.string().optional(),

    // Content
    subject: z.string().max(500).optional(),
    body: z.string().optional(),
    outcome: z.string().optional(),

    // Timing
    scheduledAt: z.coerce.date().optional(),
    occurredAt: z.coerce.date().optional(),

    // Duration
    durationMin: z.coerce.number().int().min(0).optional(),

    // Rich linking (optional)
    relatedDocumentId: z.string().optional(),            // UUID (Documents model uses UUID, not CUID)
    relatedContactId: z.string().uuid().optional(),     // UUID (Contact model uses UUID, not CUID)
    relatedPropertyId: z.string().optional(),           // UUID (Properties model uses UUID, not CUID)
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

export const listActivitiesSchema = z
  .object({
    organizationId: z.string().min(1),
    parentType: activityParentTypeSchema.optional(),
    parentId: z.string().optional(),
    assignedToUserId: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

// =============================================================================
// Type exports
// =============================================================================

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
export type ListActivitiesInput = z.infer<typeof listActivitiesSchema>;

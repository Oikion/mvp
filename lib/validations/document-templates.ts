import { z } from "zod";

/**
 * Zod schemas for OrgDocumentTemplate input validation (Phase 4).
 *
 * NOTE: DocTemplateCategory is defined as a local const enum rather than
 * z.nativeEnum(@prisma/client) so that these schemas can be imported in test
 * environments where `prisma generate` has not yet been run. The values are
 * kept in sync with prisma/schema.prisma manually — update both if the enum
 * changes.
 */

// =============================================================================
// Enum Schema
// =============================================================================

const DOC_TEMPLATE_CATEGORIES = [
  "LISTING_AGREEMENT",
  "BUYER_AGREEMENT",
  "OFFER",
  "COUNTER_OFFER",
  "PURCHASE_CONTRACT",
  "TRANSFER_DEED",
  "POWER_OF_ATTORNEY",
  "NDA",
  "GENERAL",
] as const;

export type DocTemplateCategoryValue = (typeof DOC_TEMPLATE_CATEGORIES)[number];

export const docTemplateCategorySchema = z.enum(DOC_TEMPLATE_CATEGORIES);

// =============================================================================
// Create OrgDocumentTemplate Schema
// =============================================================================

export const createOrgDocumentTemplateSchema = z
  .object({
    organizationId: z.string().min(1, "organizationId is required"),
    baseTemplateId: z.string().cuid().optional(),
    name: z.string().min(1, "Name is required").max(255),
    nameEl: z.string().max(255).optional(),
    nameEn: z.string().max(255).optional(),
    category: docTemplateCategorySchema.default("GENERAL"),
    body: z.record(z.unknown()),
    placeholders: z.array(z.unknown()).default([]),
    isPublished: z.boolean().default(false),
    version: z.coerce.number().int().min(1).default(1),
  })
  .strict();

// =============================================================================
// Update OrgDocumentTemplate Schema — partial of Create minus organizationId
// =============================================================================

export const updateOrgDocumentTemplateSchema = z
  .object({
    baseTemplateId: z.string().cuid().optional(),
    name: z.string().min(1, "Name is required").max(255).optional(),
    nameEl: z.string().max(255).optional(),
    nameEn: z.string().max(255).optional(),
    category: docTemplateCategorySchema.optional(),
    body: z.record(z.unknown()).optional(),
    placeholders: z.array(z.unknown()).optional(),
    isPublished: z.boolean().optional(),
    version: z.coerce.number().int().min(1).optional(),
  })
  .strict();

// =============================================================================
// Publish OrgDocumentTemplate Schema
// =============================================================================

export const publishOrgDocumentTemplateSchema = z
  .object({
    organizationId: z.string().min(1, "organizationId is required"),
    id: z.string().min(1, "id is required"),
  })
  .strict();

// =============================================================================
// Clone OrgDocumentTemplate Schema
// =============================================================================

export const cloneOrgDocumentTemplateSchema = z
  .object({
    organizationId: z.string().min(1, "organizationId is required"),
    id: z.string().min(1, "id is required"),
    name: z.string().min(1).max(255).optional(),
  })
  .strict();

// =============================================================================
// List OrgDocumentTemplates Schema (query params)
// =============================================================================

export const listOrgDocumentTemplatesSchema = z
  .object({
    organizationId: z.string().min(1, "organizationId is required"),
    category: docTemplateCategorySchema.optional(),
    isPublished: z.boolean().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

// =============================================================================
// Alias schemas aligned with plan naming (used by server actions / route handlers)
// =============================================================================

/**
 * Action-layer create schema — derived from createOrgDocumentTemplateSchema
 * with organizationId omitted (extracted from auth context instead).
 * Retains isPublished, version, and baseTemplateId from the org-level schema.
 */
export const createDocumentTemplateSchema =
  createOrgDocumentTemplateSchema.omit({ organizationId: true });

/**
 * Action-layer update schema — derived from updateOrgDocumentTemplateSchema
 * (organizationId is not present on the update schema; version and
 * baseTemplateId are preserved from the org-level shape).
 */
export const updateDocumentTemplateSchema = updateOrgDocumentTemplateSchema;

// =============================================================================
// Type Exports
// =============================================================================

export type CreateOrgDocumentTemplateInput = z.infer<
  typeof createOrgDocumentTemplateSchema
>;
export type UpdateOrgDocumentTemplateInput = z.infer<
  typeof updateOrgDocumentTemplateSchema
>;
export type PublishOrgDocumentTemplateInput = z.infer<
  typeof publishOrgDocumentTemplateSchema
>;
export type CloneOrgDocumentTemplateInput = z.infer<
  typeof cloneOrgDocumentTemplateSchema
>;
export type ListOrgDocumentTemplatesInput = z.infer<
  typeof listOrgDocumentTemplatesSchema
>;
export type CreateDocumentTemplateInput = z.infer<
  typeof createDocumentTemplateSchema
>;
export type UpdateDocumentTemplateInput = z.infer<
  typeof updateDocumentTemplateSchema
>;
// Note: The above types are intentionally re-derived via z.infer so that they
// stay in sync automatically when the org-level schemas change.

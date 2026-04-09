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

export const publishOrgDocumentTemplateSchema = z.object({
  organizationId: z.string().min(1, "organizationId is required"),
  id: z.string().min(1, "id is required"),
});

// =============================================================================
// Clone OrgDocumentTemplate Schema
// =============================================================================

export const cloneOrgDocumentTemplateSchema = z.object({
  organizationId: z.string().min(1, "organizationId is required"),
  id: z.string().min(1, "id is required"),
  name: z.string().min(1).max(255).optional(),
});

// =============================================================================
// List OrgDocumentTemplates Schema (query params)
// =============================================================================

export const listOrgDocumentTemplatesSchema = z.object({
  organizationId: z.string().min(1, "organizationId is required"),
  category: docTemplateCategorySchema.optional(),
  isPublished: z.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// =============================================================================
// Alias schemas aligned with plan naming (used by server actions / route handlers)
// =============================================================================

/** Alias for action-layer code that omits organizationId (extracted from auth context). */
export const createDocumentTemplateSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(255),
    nameEl: z.string().max(255).optional(),
    nameEn: z.string().max(255).optional(),
    category: docTemplateCategorySchema.default("GENERAL"),
    body: z.record(z.unknown()),
    placeholders: z.array(z.unknown()).default([]),
    baseTemplateId: z.string().cuid().optional(),
  })
  .strict();

export const updateDocumentTemplateSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(255).optional(),
    nameEl: z.string().max(255).optional(),
    nameEn: z.string().max(255).optional(),
    category: docTemplateCategorySchema.optional(),
    body: z.record(z.unknown()).optional(),
    placeholders: z.array(z.unknown()).optional(),
    isPublished: z.boolean().optional(),
  })
  .strict();

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

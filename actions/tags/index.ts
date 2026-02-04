"use server";

import type {
  Tag,
  EntityType,
  CreateTagInput,
  UpdateTagInput,
  TagEntityInput,
  BulkTagInput,
} from "@/types/tags";

// Re-export types for consumers
export type { Tag, EntityType, CreateTagInput, UpdateTagInput, TagEntityInput, BulkTagInput };

// ============================================
// Tag Operations - Stubbed (Tag models not yet in schema)
// ============================================

const FEATURE_NOT_AVAILABLE = "Tags feature is not yet available. The required database models have not been created.";

/**
 * Get all tags for the current organization
 */
export async function getTags(_options?: { category?: string; search?: string }) {
  return { success: false, error: FEATURE_NOT_AVAILABLE, data: [] as Tag[] };
}

/**
 * Create a new tag
 */
export async function createTag(_input: CreateTagInput) {
  return { success: false, error: FEATURE_NOT_AVAILABLE };
}

/**
 * Update a tag
 */
export async function updateTag(_input: UpdateTagInput) {
  return { success: false, error: FEATURE_NOT_AVAILABLE };
}

/**
 * Delete a tag
 */
export async function deleteTag(_tagId: string) {
  return { success: false, error: FEATURE_NOT_AVAILABLE };
}

/**
 * Get tags for a specific entity
 */
export async function getEntityTags(_entityId: string, _entityType: EntityType) {
  return { success: false, error: FEATURE_NOT_AVAILABLE, data: [] as Tag[] };
}

/**
 * Tag an entity
 */
export async function tagEntity(_input: TagEntityInput) {
  return { success: false, error: FEATURE_NOT_AVAILABLE };
}

/**
 * Untag an entity
 */
export async function untagEntity(_input: TagEntityInput) {
  return { success: false, error: FEATURE_NOT_AVAILABLE };
}

/**
 * Bulk update tags for an entity (replace all)
 */
export async function bulkUpdateEntityTags(_input: BulkTagInput) {
  return { success: false, error: FEATURE_NOT_AVAILABLE };
}

/**
 * Get unique categories for tags
 */
export async function getTagCategories() {
  return { success: false, error: FEATURE_NOT_AVAILABLE, data: [] as string[] };
}

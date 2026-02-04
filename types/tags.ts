// ============================================
// Tag Types - Single Source of Truth
// ============================================

export type EntityType = "property" | "client" | "document" | "event" | "user" | "task" | "deal";

export interface Tag {
  id: string;
  name: string;
  color: string;
  category: string | null;
  description: string | null;
  createdAt?: string;
  updatedAt?: string;
  usageCount?: number;
}

export interface CreateTagInput {
  name: string;
  color?: string;
  category?: string;
  description?: string;
}

export interface UpdateTagInput {
  id: string;
  name?: string;
  color?: string;
  category?: string | null;
  description?: string | null;
}

export interface TagEntityInput {
  tagId: string;
  entityId: string;
  entityType: EntityType;
}

export interface BulkTagInput {
  tagIds: string[];
  entityId: string;
  entityType: EntityType;
}

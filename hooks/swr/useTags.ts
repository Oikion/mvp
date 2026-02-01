import useSWR, { mutate } from "swr";
import { useCallback } from "react";

// ============================================
// Types
// ============================================

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

export type EntityType = "property" | "client" | "document" | "event" | "user" | "task" | "deal";

interface UseTagsOptions {
  category?: string;
  search?: string;
  enabled?: boolean;
}

interface UseEntityTagsOptions {
  enabled?: boolean;
}

// ============================================
// Fetchers
// ============================================

async function tagsFetcher(url: string): Promise<Tag[]> {
  const res = await fetch(url);

  if (res.status === 429) {
    console.warn("Rate limited, returning empty array");
    return [];
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch tags: ${res.status}`);
  }

  return res.json();
}

async function entityTagsFetcher(url: string): Promise<Tag[]> {
  const res = await fetch(url);

  if (res.status === 429) {
    console.warn("Rate limited, returning empty array");
    return [];
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch entity tags: ${res.status}`);
  }

  return res.json();
}

// ============================================
// Cache Key Builders
// ============================================

export function getTagsKey(options?: UseTagsOptions): string | null {
  if (options?.enabled === false) return null;

  const params = new URLSearchParams();
  if (options?.category) params.set("category", options.category);
  if (options?.search) params.set("search", options.search);

  const queryString = params.toString();
  return `/api/tags${queryString ? `?${queryString}` : ""}`;
}

export function getEntityTagsKey(
  entityType: EntityType,
  entityId: string | null | undefined,
  options?: UseEntityTagsOptions
): string | null {
  if (options?.enabled === false || !entityId) return null;
  return `/api/tags/entities/${entityType}/${entityId}`;
}

// ============================================
// Hooks
// ============================================

/**
 * Hook to fetch all tags for the current organization
 */
export function useTags(options: UseTagsOptions = {}) {
  const { enabled = true, ...queryOptions } = options;

  const key = getTagsKey({ ...queryOptions, enabled });

  const { data, error, isLoading, isValidating, mutate: mutateLocal } = useSWR<Tag[]>(
    key,
    tagsFetcher,
    {
      dedupingInterval: 30000, // 30 seconds
      revalidateOnFocus: false,
    }
  );

  return {
    tags: data ?? [],
    isLoading,
    isValidating,
    error,
    mutate: mutateLocal,
  };
}

/**
 * Hook to fetch tags for a specific entity
 */
export function useEntityTags(
  entityType: EntityType,
  entityId: string | null | undefined,
  options: UseEntityTagsOptions = {}
) {
  const { enabled = true } = options;

  const key = getEntityTagsKey(entityType, entityId, { enabled });

  const { data, error, isLoading, isValidating, mutate: mutateLocal } = useSWR<Tag[]>(
    key,
    entityTagsFetcher,
    {
      dedupingInterval: 10000, // 10 seconds
      revalidateOnFocus: false,
    }
  );

  return {
    tags: data ?? [],
    isLoading,
    isValidating,
    error,
    mutate: mutateLocal,
  };
}

/**
 * Hook for tag mutations (create, update, delete)
 */
export function useTagMutations() {
  const createTag = useCallback(async (data: {
    name: string;
    color?: string;
    category?: string;
    description?: string;
  }): Promise<Tag | null> => {
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create tag");
      }

      const tag = await res.json();

      // Invalidate tags cache
      mutate((key) => typeof key === "string" && key.startsWith("/api/tags"), undefined, {
        revalidate: true,
      });

      return tag;
    } catch (error) {
      console.error("[CREATE_TAG_ERROR]", error);
      return null;
    }
  }, []);

  const updateTag = useCallback(async (
    tagId: string,
    data: {
      name?: string;
      color?: string;
      category?: string | null;
      description?: string | null;
    }
  ): Promise<Tag | null> => {
    try {
      const res = await fetch(`/api/tags/${tagId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update tag");
      }

      const tag = await res.json();

      // Invalidate tags cache
      mutate((key) => typeof key === "string" && key.startsWith("/api/tags"), undefined, {
        revalidate: true,
      });

      return tag;
    } catch (error) {
      console.error("[UPDATE_TAG_ERROR]", error);
      return null;
    }
  }, []);

  const deleteTag = useCallback(async (tagId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/tags/${tagId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete tag");
      }

      // Invalidate tags cache
      mutate((key) => typeof key === "string" && key.startsWith("/api/tags"), undefined, {
        revalidate: true,
      });

      return true;
    } catch (error) {
      console.error("[DELETE_TAG_ERROR]", error);
      return false;
    }
  }, []);

  return {
    createTag,
    updateTag,
    deleteTag,
  };
}

/**
 * Hook for entity tag mutations (tag/untag)
 */
export function useEntityTagMutations(entityType: EntityType, entityId: string) {
  const tagEntity = useCallback(async (tagId: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/tags/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId, entityId, entityType }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to tag entity");
      }

      // Invalidate entity tags cache
      mutate(getEntityTagsKey(entityType, entityId), undefined, {
        revalidate: true,
      });
      // Also invalidate main tags cache to update usage counts
      mutate((key) => typeof key === "string" && key === "/api/tags", undefined, {
        revalidate: true,
      });

      return true;
    } catch (error) {
      console.error("[TAG_ENTITY_ERROR]", error);
      return false;
    }
  }, [entityType, entityId]);

  const untagEntity = useCallback(async (tagId: string): Promise<boolean> => {
    try {
      const params = new URLSearchParams({
        tagId,
        entityId,
        entityType,
      });

      const res = await fetch(`/api/tags/entities?${params}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to untag entity");
      }

      // Invalidate entity tags cache
      mutate(getEntityTagsKey(entityType, entityId), undefined, {
        revalidate: true,
      });
      // Also invalidate main tags cache to update usage counts
      mutate((key) => typeof key === "string" && key === "/api/tags", undefined, {
        revalidate: true,
      });

      return true;
    } catch (error) {
      console.error("[UNTAG_ENTITY_ERROR]", error);
      return false;
    }
  }, [entityType, entityId]);

  const updateEntityTags = useCallback(async (tagIds: string[]): Promise<boolean> => {
    try {
      const res = await fetch("/api/tags/entities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds, entityId, entityType }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update tags");
      }

      // Invalidate entity tags cache
      mutate(getEntityTagsKey(entityType, entityId), undefined, {
        revalidate: true,
      });
      // Also invalidate main tags cache to update usage counts
      mutate((key) => typeof key === "string" && key === "/api/tags", undefined, {
        revalidate: true,
      });

      return true;
    } catch (error) {
      console.error("[UPDATE_ENTITY_TAGS_ERROR]", error);
      return false;
    }
  }, [entityType, entityId]);

  return {
    tagEntity,
    untagEntity,
    updateEntityTags,
  };
}

/**
 * Hook for tag categories
 */
export function useTagCategories() {
  const { tags } = useTags();

  const categories = [...new Set(
    tags
      .map((t) => t.category)
      .filter(Boolean)
  )] as string[];

  return {
    categories,
  };
}

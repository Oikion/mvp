"use client";

import useSWR from "swr";

/**
 * Entity types that support name fetching
 */
export type EntityType = "property" | "client" | "event" | "document" | "task";

/**
 * Entity name response from API
 */
interface EntityNameResponse {
  name: string;
  id: string;
}

/**
 * Fetcher for entity names
 * Uses a lightweight API endpoint that only returns the entity name
 */
async function fetchEntityName(
  entityType: EntityType,
  entityId: string
): Promise<string | null> {
  try {
    // Use different endpoints based on entity type
    const endpoints: Record<EntityType, string> = {
      property: `/api/mls/properties/${entityId}/name`,
      client: `/api/crm/clients/${entityId}/name`,
      event: `/api/calendar/events/${entityId}/name`,
      document: `/api/documents/${entityId}/name`,
      task: `/api/crm/tasks/${entityId}/name`,
    };

    const endpoint = endpoints[entityType];
    if (!endpoint) return null;

    const response = await fetch(endpoint);

    if (!response.ok) {
      // Don't throw on 404 - entity might not exist or user might not have access
      if (response.status === 404 || response.status === 403) {
        return null;
      }
      throw new Error(`Failed to fetch ${entityType} name`);
    }

    const data: EntityNameResponse = await response.json();
    return data.name;
  } catch {
    // Silently fail - breadcrumb will show generic label
    return null;
  }
}

/**
 * useEntityName - Hook for fetching entity names for breadcrumbs
 *
 * Uses SWR for caching to avoid refetching on every render.
 * Fails silently if the entity doesn't exist or user doesn't have access.
 *
 * @param entityType - The type of entity (property, client, event, etc.)
 * @param entityId - The entity ID (UUID)
 * @returns The entity name or null if not available
 *
 * @example
 * ```tsx
 * const propertyName = useEntityName("property", propertyId);
 * // Returns "Luxury Villa in Glyfada" or null
 * ```
 */
export function useEntityName(
  entityType: EntityType | null,
  entityId: string | null
): string | null {
  const { data } = useSWR(
    // Only fetch if we have both type and id
    entityType && entityId ? [`entity-name`, entityType, entityId] : null,
    () => fetchEntityName(entityType!, entityId!),
    {
      // Cache for 5 minutes
      dedupingInterval: 5 * 60 * 1000,
      // Don't revalidate on focus for breadcrumbs
      revalidateOnFocus: false,
      // Don't retry on error
      shouldRetryOnError: false,
      // Keep stale data while revalidating
      keepPreviousData: true,
    }
  );

  return data ?? null;
}

/**
 * Detect entity type from URL segment
 *
 * @param parentSegment - The URL segment before the ID
 * @returns The entity type or null if not recognized
 */
export function detectEntityType(parentSegment: string): EntityType | null {
  const segmentToType: Record<string, EntityType> = {
    properties: "property",
    clients: "client",
    accounts: "client", // Alias
    events: "event",
    documents: "document",
    tasks: "task",
  };

  return segmentToType[parentSegment.toLowerCase()] ?? null;
}

/**
 * Check if a string is a valid UUID
 */
export function isUuid(str: string): boolean {
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
    str
  );
}

/**
 * useBreadcrumbEntityName - Hook specifically for breadcrumb entity name resolution
 *
 * Automatically detects entity type from URL segments and fetches the name.
 *
 * @param pathSegments - Array of URL path segments
 * @param currentIndex - Index of the current segment
 * @returns The entity name or null
 *
 * @example
 * ```tsx
 * // For URL: /app/mls/properties/123e4567-e89b-12d3-a456-426614174000
 * const segments = ["mls", "properties", "123e4567-e89b-12d3-a456-426614174000"];
 * const name = useBreadcrumbEntityName(segments, 2);
 * // Returns "Luxury Villa in Glyfada" or null
 * ```
 */
export function useBreadcrumbEntityName(
  pathSegments: string[],
  currentIndex: number
): string | null {
  // Get the current segment (potential entity ID)
  const currentSegment = pathSegments[currentIndex];

  // Check if it's a UUID
  const isId = currentSegment && isUuid(currentSegment);

  // Get the parent segment to determine entity type
  const parentSegment = currentIndex > 0 ? pathSegments[currentIndex - 1] : null;
  const entityType = parentSegment ? detectEntityType(parentSegment) : null;

  // Fetch entity name if applicable
  const name = useEntityName(
    isId ? entityType : null,
    isId ? currentSegment : null
  );

  return name;
}

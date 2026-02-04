import { useSWRConfig } from "swr";
import { useCallback } from "react";

/**
 * Hook to invalidate SWR caches by pattern
 * Useful for cross-cache invalidation after mutations
 */
export function useCacheInvalidation() {
  const { mutate: globalMutate } = useSWRConfig();

  /**
   * Invalidate all connection-related caches
   */
  const invalidateConnections = useCallback(() => {
    return globalMutate(
      (key) => typeof key === "string" && key.includes("/api/connections"),
      undefined,
      { revalidate: true }
    );
  }, [globalMutate]);

  /**
   * Invalidate all calendar-related caches
   */
  const invalidateCalendar = useCallback(() => {
    return globalMutate(
      (key) => typeof key === "string" && key.includes("/api/calendar"),
      undefined,
      { revalidate: true }
    );
  }, [globalMutate]);

  /**
   * Invalidate global search cache
   */
  const invalidateSearch = useCallback(() => {
    return globalMutate(
      (key) => typeof key === "string" && key.includes("/api/global-search"),
      undefined,
      { revalidate: true }
    );
  }, [globalMutate]);

  /**
   * Invalidate all notification-related caches
   */
  const invalidateNotifications = useCallback(() => {
    return globalMutate(
      (key) => typeof key === "string" && key.includes("/api/notifications"),
      undefined,
      { revalidate: true }
    );
  }, [globalMutate]);

  /**
   * Invalidate all property-related caches
   */
  const invalidateProperties = useCallback(() => {
    return globalMutate(
      (key) => typeof key === "string" && key.includes("/api/mls/properties"),
      undefined,
      { revalidate: true }
    );
  }, [globalMutate]);

  /**
   * Invalidate all client-related caches
   */
  const invalidateClients = useCallback(() => {
    return globalMutate(
      (key) => typeof key === "string" && key.includes("/api/crm/clients"),
      undefined,
      { revalidate: true }
    );
  }, [globalMutate]);

  /**
   * Invalidate all document-related caches
   */
  const invalidateDocuments = useCallback(() => {
    return globalMutate(
      (key) => typeof key === "string" && key.includes("/api/documents"),
      undefined,
      { revalidate: true }
    );
  }, [globalMutate]);

  /**
   * Invalidate all share-related caches
   */
  const invalidateShares = useCallback(() => {
    return globalMutate(
      (key) => typeof key === "string" && key.includes("/api/share"),
      undefined,
      { revalidate: true }
    );
  }, [globalMutate]);

  /**
   * Invalidate all audience-related caches
   */
  const invalidateAudiences = useCallback(() => {
    return globalMutate(
      (key) => typeof key === "string" && key.includes("/api/audiences"),
      undefined,
      { revalidate: true }
    );
  }, [globalMutate]);

  /**
   * Invalidate a specific cache key
   */
  const invalidateKey = useCallback(
    (key: string) => {
      return globalMutate(key);
    },
    [globalMutate]
  );

  /**
   * Invalidate caches matching a custom pattern
   */
  const invalidatePattern = useCallback(
    (pattern: string | RegExp) => {
      if (typeof pattern === "string") {
        return globalMutate(
          (key) => typeof key === "string" && key.includes(pattern),
          undefined,
          { revalidate: true }
        );
      }
      return globalMutate(
        (key) => typeof key === "string" && pattern.test(key),
        undefined,
        { revalidate: true }
      );
    },
    [globalMutate]
  );

  /**
   * Invalidate all caches (use with caution)
   */
  const invalidateAll = useCallback(() => {
    return globalMutate(() => true, undefined, { revalidate: true });
  }, [globalMutate]);

  return {
    // Domain-specific invalidators
    invalidateConnections,
    invalidateCalendar,
    invalidateSearch,
    invalidateNotifications,
    invalidateProperties,
    invalidateClients,
    invalidateDocuments,
    invalidateShares,
    invalidateAudiences,
    // Generic invalidators
    invalidateKey,
    invalidatePattern,
    invalidateAll,
    // Also expose the raw mutate function for advanced use cases
    globalMutate,
  };
}

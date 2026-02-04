import { useCallback } from "react";
import { preload } from "swr";
import fetcher from "@/lib/fetcher";

/**
 * Hook to prefetch data for faster navigation
 * Use on hover/focus events to preload data before the user navigates
 */
export function usePrefetch() {
  /**
   * Prefetch a property's details
   */
  const prefetchProperty = useCallback(
    (propertyId: string) => {
      const key = `/api/mls/properties/${propertyId}`;
      // Use preload to fetch and populate the cache
      preload(key, fetcher);
    },
    []
  );

  /**
   * Prefetch a client's details
   */
  const prefetchClient = useCallback(
    (clientId: string) => {
      const key = `/api/crm/clients/${clientId}`;
      preload(key, fetcher);
    },
    []
  );

  /**
   * Prefetch a calendar event's details
   */
  const prefetchEvent = useCallback(
    (eventId: string) => {
      const key = `/api/calendar/events/${eventId}`;
      preload(key, fetcher);
    },
    []
  );

  /**
   * Prefetch a document's details
   */
  const prefetchDocument = useCallback(
    (documentId: string) => {
      const key = `/api/documents/${documentId}`;
      preload(key, fetcher);
    },
    []
  );

  /**
   * Prefetch property linked entities (clients, events)
   */
  const prefetchPropertyLinked = useCallback(
    (propertyId: string) => {
      const key = `/api/mls/properties/${propertyId}/linked`;
      preload(key, fetcher);
    },
    []
  );

  /**
   * Prefetch client linked entities (properties, events)
   */
  const prefetchClientLinked = useCallback(
    (clientId: string) => {
      const key = `/api/crm/clients/${clientId}/linked`;
      preload(key, fetcher);
    },
    []
  );

  /**
   * Generic prefetch for any API endpoint
   */
  const prefetch = useCallback(
    (key: string) => {
      preload(key, fetcher);
    },
    []
  );

  return {
    prefetchProperty,
    prefetchClient,
    prefetchEvent,
    prefetchDocument,
    prefetchPropertyLinked,
    prefetchClientLinked,
    prefetch,
  };
}

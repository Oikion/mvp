"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useInfiniteScroll - Automatic infinite scroll with IntersectionObserver
 *
 * Triggers a load function when a sentinel element becomes visible.
 * More performant than scroll event listeners.
 *
 * @example
 * ```tsx
 * const { notifications, loadMore, hasMore, isLoadingMore } = useInfiniteNotifications();
 * const { sentinelRef, isIntersecting } = useInfiniteScroll({
 *   onLoadMore: loadMore,
 *   hasMore,
 *   isLoading: isLoadingMore,
 * });
 *
 * return (
 *   <div>
 *     {notifications.map(n => <NotificationItem key={n.id} {...n} />)}
 *     <div ref={sentinelRef} className="h-1" />
 *     {isLoadingMore && <Spinner />}
 *   </div>
 * );
 * ```
 */

export interface UseInfiniteScrollOptions {
  /**
   * Function to call when more items should be loaded
   */
  onLoadMore: () => void;
  /**
   * Whether there are more items to load
   */
  hasMore: boolean;
  /**
   * Whether items are currently being loaded
   */
  isLoading: boolean;
  /**
   * Margin around the root (viewport). Use to trigger earlier.
   * @default "100px"
   */
  rootMargin?: string;
  /**
   * Percentage of target visibility needed to trigger (0-1)
   * @default 0.1
   */
  threshold?: number;
  /**
   * Whether infinite scroll is enabled
   * @default true
   */
  enabled?: boolean;
  /**
   * Root element for intersection (null = viewport)
   * @default null
   */
  root?: Element | null;
}

export interface UseInfiniteScrollReturn {
  /**
   * Ref callback to attach to the sentinel element
   */
  sentinelRef: (node: Element | null) => void;
  /**
   * Whether the sentinel is currently intersecting
   */
  isIntersecting: boolean;
}

/**
 * Hook for automatic infinite scroll using IntersectionObserver
 */
export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  rootMargin = "100px",
  threshold = 0.1,
  enabled = true,
  root = null,
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<Element | null>(null);

  // Stable callback ref for onLoadMore
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  // Create observer
  useEffect(() => {
    // Skip if disabled or no IntersectionObserver support
    if (!enabled || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        const intersecting = entry?.isIntersecting ?? false;
        setIsIntersecting(intersecting);
      },
      {
        root,
        rootMargin,
        threshold,
      }
    );

    observerRef.current = observer;

    // Observe current sentinel if exists
    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [enabled, root, rootMargin, threshold]);

  // Trigger load when intersecting
  useEffect(() => {
    if (isIntersecting && hasMore && !isLoading && enabled) {
      onLoadMoreRef.current();
    }
  }, [isIntersecting, hasMore, isLoading, enabled]);

  // Ref callback for sentinel element
  const setSentinelRef = useCallback((node: Element | null) => {
    // Disconnect from previous element
    if (sentinelRef.current && observerRef.current) {
      observerRef.current.unobserve(sentinelRef.current);
    }

    sentinelRef.current = node;

    // Observe new element
    if (node && observerRef.current) {
      observerRef.current.observe(node);
    }
  }, []);

  return {
    sentinelRef: setSentinelRef,
    isIntersecting,
  };
}

/**
 * useIntersectionObserver - Low-level IntersectionObserver hook
 *
 * For custom intersection logic beyond infinite scroll.
 *
 * @example
 * ```tsx
 * const { ref, isIntersecting, entry } = useIntersectionObserver({
 *   threshold: 0.5,
 *   triggerOnce: true,
 * });
 *
 * return (
 *   <div ref={ref} className={isIntersecting ? "visible" : "hidden"}>
 *     Content
 *   </div>
 * );
 * ```
 */
export interface UseIntersectionObserverOptions {
  /**
   * Root element for intersection
   */
  root?: Element | null;
  /**
   * Margin around root
   */
  rootMargin?: string;
  /**
   * Visibility threshold(s)
   */
  threshold?: number | number[];
  /**
   * Only trigger once when element becomes visible
   */
  triggerOnce?: boolean;
  /**
   * Whether observer is enabled
   */
  enabled?: boolean;
}

export interface UseIntersectionObserverReturn {
  /**
   * Ref callback for target element
   */
  ref: (node: Element | null) => void;
  /**
   * Whether target is intersecting
   */
  isIntersecting: boolean;
  /**
   * Full intersection entry (if available)
   */
  entry: IntersectionObserverEntry | null;
}

export function useIntersectionObserver({
  root = null,
  rootMargin = "0px",
  threshold = 0,
  triggerOnce = false,
  enabled = true,
}: UseIntersectionObserverOptions = {}): UseIntersectionObserverReturn {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<Element | null>(null);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === "undefined") {
      return;
    }

    // Don't recreate if already triggered once
    if (triggerOnce && hasTriggeredRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [observerEntry] = entries;
        if (!observerEntry) return;

        setEntry(observerEntry);
        setIsIntersecting(observerEntry.isIntersecting);

        // Handle triggerOnce
        if (triggerOnce && observerEntry.isIntersecting) {
          hasTriggeredRef.current = true;
          observer.disconnect();
        }
      },
      { root, rootMargin, threshold }
    );

    observerRef.current = observer;

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [enabled, root, rootMargin, threshold, triggerOnce]);

  const setRef = useCallback((node: Element | null) => {
    if (elementRef.current && observerRef.current) {
      observerRef.current.unobserve(elementRef.current);
    }

    elementRef.current = node;

    if (node && observerRef.current) {
      observerRef.current.observe(node);
    }
  }, []);

  return {
    ref: setRef,
    isIntersecting,
    entry,
  };
}

export default useInfiniteScroll;

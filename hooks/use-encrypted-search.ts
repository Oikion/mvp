"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useEncryption } from "@/components/providers/EncryptionProvider";

/**
 * Configuration for encrypted search
 */
interface EncryptedSearchConfig<T> {
  /** Fields to search within each item */
  searchFields: (keyof T)[];
  /** Optional: fields that need decryption before search */
  encryptedFields?: (keyof T)[];
  /** Optional: custom match function */
  matchFn?: (item: T, query: string) => boolean;
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
}

/**
 * Result from the encrypted search hook
 */
interface EncryptedSearchResult<T> {
  /** Filtered and decrypted results */
  results: T[];
  /** Whether search/decryption is in progress */
  isSearching: boolean;
  /** Whether initial data is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** The current search query */
  query: string;
  /** Update the search query */
  setQuery: (query: string) => void;
  /** Total count of all items (before filtering) */
  totalCount: number;
  /** Whether encryption is required but not unlocked */
  needsUnlock: boolean;
}

/**
 * Hook for client-side search on encrypted data
 * 
 * Since encrypted fields cannot be searched server-side, this hook:
 * 1. Fetches all records for the entity type
 * 2. Decrypts in batches (caching results)
 * 3. Filters locally based on search query
 * 
 * @param items - Array of items to search (may contain encrypted fields)
 * @param config - Search configuration
 * @returns Search results and state
 */
export function useEncryptedSearch<T extends Record<string, unknown>>(
  items: T[],
  config: EncryptedSearchConfig<T>
): EncryptedSearchResult<T> {
  const { isEnabled, isUnlocked, decrypt } = useEncryption();
  
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decryptedItems, setDecryptedItems] = useState<T[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Cache for decrypted items
  const decryptCache = useRef<Map<string, T>>(new Map());

  const { searchFields, encryptedFields = [], debounceMs = 300, matchFn } = config;

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Check if any items need decryption
  const needsDecryption = useMemo(() => {
    if (!isEnabled || encryptedFields.length === 0) return false;
    
    return items.some((item) =>
      encryptedFields.some((field) => {
        const value = item[field];
        return typeof value === "string" && value.startsWith("e2ee:v1:");
      })
    );
  }, [items, encryptedFields, isEnabled]);

  // Decrypt items when unlocked
  useEffect(() => {
    const decryptItems = async () => {
      if (!isUnlocked || !needsDecryption) {
        setDecryptedItems(items);
        return;
      }

      setIsDecrypting(true);
      setError(null);

      try {
        const decrypted: T[] = [];

        for (const item of items) {
          // Check cache first
          const itemId = (item as Record<string, unknown>).id as string | undefined;
          if (itemId && decryptCache.current.has(itemId)) {
            decrypted.push(decryptCache.current.get(itemId) as (typeof decrypted)[number]);
            continue;
          }

          // Decrypt encrypted fields
          const decryptedItem = { ...item };
          for (const field of encryptedFields) {
            const value = item[field];
            if (typeof value === "string" && value.startsWith("e2ee:v1:")) {
              try {
                decryptedItem[field] = (await decrypt(value)) as T[keyof T];
              } catch (e) {
                console.error(`Failed to decrypt field ${String(field)}:`, e);
                // Keep encrypted value if decryption fails
              }
            }
          }

          decrypted.push(decryptedItem);

          // Cache the decrypted item
          if (itemId) {
            decryptCache.current.set(itemId, decryptedItem);
          }
        }

        setDecryptedItems(decrypted);
      } catch (e) {
        console.error("Decryption error:", e);
        setError("Failed to decrypt some items");
        setDecryptedItems(items);
      } finally {
        setIsDecrypting(false);
      }
    };

    decryptItems();
  }, [items, isUnlocked, needsDecryption, decrypt, encryptedFields]);

  // Clear cache when encryption is locked
  useEffect(() => {
    if (!isUnlocked) {
      decryptCache.current.clear();
    }
  }, [isUnlocked]);

  // Filter results based on search query
  const results = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return decryptedItems;
    }

    setIsSearching(true);
    const searchLower = debouncedQuery.toLowerCase().trim();

    const filtered = decryptedItems.filter((item) => {
      // Use custom match function if provided
      if (matchFn) {
        return matchFn(item, debouncedQuery);
      }

      // Default: search in specified fields
      return searchFields.some((field) => {
        const value = item[field];
        if (typeof value === "string") {
          return value.toLowerCase().includes(searchLower);
        }
        if (typeof value === "number") {
          return value.toString().includes(searchLower);
        }
        return false;
      });
    });

    setIsSearching(false);
    return filtered;
  }, [decryptedItems, debouncedQuery, searchFields, matchFn]);

  // Reset query handler
  const handleSetQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  return {
    results,
    isSearching: isSearching || isDecrypting,
    isLoading: isDecrypting,
    error,
    query,
    setQuery: handleSetQuery,
    totalCount: items.length,
    needsUnlock: needsDecryption && !isUnlocked,
  };
}

/**
 * Hook for paginated client-side search on encrypted data
 */
interface PaginatedSearchConfig<T> extends EncryptedSearchConfig<T> {
  /** Items per page (default: 20) */
  pageSize?: number;
}

interface PaginatedSearchResult<T> extends EncryptedSearchResult<T> {
  /** Current page (0-indexed) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Go to next page */
  nextPage: () => void;
  /** Go to previous page */
  prevPage: () => void;
  /** Go to specific page */
  goToPage: (page: number) => void;
  /** Whether there are more pages */
  hasMore: boolean;
}

export function usePaginatedEncryptedSearch<T extends Record<string, unknown>>(
  items: T[],
  config: PaginatedSearchConfig<T>
): PaginatedSearchResult<T> {
  const [page, setPage] = useState(0);
  const { pageSize = 20, ...searchConfig } = config;

  const searchResult = useEncryptedSearch(items, searchConfig);

  // Reset to page 0 when search query changes
  useEffect(() => {
    setPage(0);
  }, [searchResult.query]);

  const totalPages = Math.ceil(searchResult.results.length / pageSize);

  const paginatedResults = useMemo(() => {
    const start = page * pageSize;
    const end = start + pageSize;
    return searchResult.results.slice(start, end);
  }, [searchResult.results, page, pageSize]);

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages - 1));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(p - 1, 0));
  }, []);

  const goToPage = useCallback(
    (newPage: number) => {
      setPage(Math.max(0, Math.min(newPage, totalPages - 1)));
    },
    [totalPages]
  );

  return {
    ...searchResult,
    results: paginatedResults,
    page,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    hasMore: page < totalPages - 1,
  };
}

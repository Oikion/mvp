/**
 * Pagination Utilities
 *
 * Standardized pagination types and utilities for consistent cursor-based pagination
 * across the application. All paginated APIs should use these types for consistency.
 *
 * @example
 * ```typescript
 * // In an API route
 * import { parsePaginationParams, createPaginatedResponse, buildPrismaCursorArgs } from "@/lib/pagination";
 *
 * export async function GET(req: NextRequest) {
 *   const params = parsePaginationParams(req);
 *   const prismaArgs = buildPrismaCursorArgs(params, "id");
 *
 *   const items = await prisma.model.findMany({
 *     ...prismaArgs,
 *     where: { ... },
 *   });
 *
 *   const response = createPaginatedResponse(items, params.limit);
 *   return NextResponse.json(response);
 * }
 * ```
 */

import { NextRequest } from "next/server";

// =============================================================================
// Constants
// =============================================================================

/** Default number of items per page */
export const DEFAULT_PAGE_SIZE = 50;

/** Maximum allowed items per page */
export const MAX_PAGE_SIZE = 100;

/** Minimum allowed items per page */
export const MIN_PAGE_SIZE = 1;

// =============================================================================
// Types
// =============================================================================

/**
 * Pagination parameters for cursor-based pagination.
 */
export interface PaginationParams {
  /** Cursor for the next page (typically an ID) */
  cursor?: string;
  /** Number of items per page */
  limit: number;
}

/**
 * Standardized paginated response format for internal APIs.
 */
export interface PaginatedResponse<T> {
  /** Array of items for the current page */
  items: T[];
  /** Pagination metadata */
  pagination: {
    /** Cursor for the next page, null if no more pages */
    nextCursor: string | null;
    /** Whether there are more items to fetch */
    hasMore: boolean;
    /** Number of items requested */
    limit: number;
  };
}

/**
 * Standardized paginated response format for external APIs (v1).
 * Wraps data in a data/meta envelope.
 */
export interface ExternalPaginatedResponse<T> {
  /** Response data */
  data: T;
  /** Pagination metadata */
  meta: {
    /** Cursor for the next page, null if no more pages */
    nextCursor: string | null;
    /** Whether there are more items to fetch */
    hasMore: boolean;
    /** Number of items in this response */
    limit: number;
  };
  /** ISO timestamp of the response */
  timestamp: string;
}

/**
 * Options for building Prisma cursor arguments.
 */
export interface PrismaCursorOptions {
  /** Field to use for cursor (default: "id") */
  cursorField?: string;
  /** Sort order (default: "desc") */
  orderBy?: "asc" | "desc";
  /** Additional orderBy fields */
  additionalOrderBy?: Record<string, "asc" | "desc">;
}

/**
 * Prisma findMany arguments for cursor-based pagination.
 */
export interface PrismaCursorArgs {
  take: number;
  skip?: number;
  cursor?: { [key: string]: string };
  orderBy: { [key: string]: "asc" | "desc" }[];
}

/**
 * Legacy offset-based pagination params (for migration).
 * @deprecated Use cursor-based pagination instead
 */
export interface OffsetPaginationParams {
  limit: number;
  offset: number;
}

/**
 * Legacy page-based pagination params (for migration).
 * @deprecated Use cursor-based pagination instead
 */
export interface PagePaginationParams {
  page: number;
  limit: number;
}

// =============================================================================
// Parameter Parsing
// =============================================================================

/**
 * Parse pagination parameters from a NextRequest.
 * Validates and normalizes the limit parameter.
 *
 * @param req - NextRequest object
 * @returns Normalized pagination parameters
 *
 * @example
 * ```typescript
 * const params = parsePaginationParams(req);
 * // { cursor: "abc123", limit: 50 }
 * ```
 */
export function parsePaginationParams(req: NextRequest): PaginationParams {
  const { searchParams } = req.nextUrl;
  const cursor = searchParams.get("cursor") || undefined;
  const limitParam = searchParams.get("limit");

  let limit = DEFAULT_PAGE_SIZE;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(Math.max(parsed, MIN_PAGE_SIZE), MAX_PAGE_SIZE);
    }
  }

  return { cursor, limit };
}

/**
 * Parse offset-based pagination parameters.
 * @deprecated Use cursor-based pagination instead
 */
export function parseOffsetPaginationParams(
  req: NextRequest
): OffsetPaginationParams {
  const { searchParams } = req.nextUrl;
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");

  let limit = DEFAULT_PAGE_SIZE;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(Math.max(parsed, MIN_PAGE_SIZE), MAX_PAGE_SIZE);
    }
  }

  let offset = 0;
  if (offsetParam) {
    const parsed = parseInt(offsetParam, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      offset = parsed;
    }
  }

  return { limit, offset };
}

/**
 * Parse page-based pagination parameters.
 * @deprecated Use cursor-based pagination instead
 */
export function parsePagePaginationParams(
  req: NextRequest
): PagePaginationParams {
  const { searchParams } = req.nextUrl;
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");

  let limit = DEFAULT_PAGE_SIZE;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(Math.max(parsed, MIN_PAGE_SIZE), MAX_PAGE_SIZE);
    }
  }

  let page = 1;
  if (pageParam) {
    const parsed = parseInt(pageParam, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      page = parsed;
    }
  }

  return { page, limit };
}

// =============================================================================
// Response Builders
// =============================================================================

/**
 * Create a standardized paginated response from an array of items.
 * Uses the "fetch N+1" pattern to determine if there are more items.
 *
 * @param items - Array of items (fetched with limit + 1)
 * @param limit - Number of items requested
 * @param cursorField - Field to use as cursor (default: "id")
 * @returns Standardized paginated response
 *
 * @example
 * ```typescript
 * // Fetch limit + 1 items to check for more
 * const items = await prisma.model.findMany({ take: limit + 1 });
 * return createPaginatedResponse(items, limit);
 * ```
 */
export function createPaginatedResponse<T extends { id: string }>(
  items: T[],
  limit: number,
  cursorField: keyof T = "id"
): PaginatedResponse<T> {
  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;
  const lastItem = pageItems[pageItems.length - 1];
  const nextCursor = hasMore && lastItem ? String(lastItem[cursorField]) : null;

  return {
    items: pageItems,
    pagination: {
      nextCursor,
      hasMore,
      limit,
    },
  };
}

/**
 * Create an external API paginated response.
 * Wraps data in a data/meta envelope with timestamp.
 *
 * @param data - Response data
 * @param pagination - Pagination metadata
 * @returns External API response format
 */
export function createExternalPaginatedResponse<T>(
  data: T,
  pagination: { nextCursor: string | null; hasMore: boolean; limit: number }
): ExternalPaginatedResponse<T> {
  return {
    data,
    meta: pagination,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a simple paginated response from items array and hasMore flag.
 * Use when you already know if there are more items.
 *
 * @param items - Array of items for the current page
 * @param hasMore - Whether there are more items
 * @param limit - Number of items requested
 * @param cursorField - Field to use as cursor
 * @returns Standardized paginated response
 */
export function createPaginatedResponseSimple<T extends Record<string, unknown>>(
  items: T[],
  hasMore: boolean,
  limit: number,
  cursorField: string = "id"
): PaginatedResponse<T> {
  const lastItem = items[items.length - 1];
  const nextCursor =
    hasMore && lastItem && cursorField in lastItem
      ? String(lastItem[cursorField])
      : null;

  return {
    items,
    pagination: {
      nextCursor,
      hasMore,
      limit,
    },
  };
}

// =============================================================================
// Prisma Utilities
// =============================================================================

/**
 * Build Prisma findMany arguments for cursor-based pagination.
 *
 * @param params - Pagination parameters
 * @param options - Cursor options
 * @returns Prisma-compatible cursor arguments
 *
 * @example
 * ```typescript
 * const args = buildPrismaCursorArgs(params, { cursorField: "id", orderBy: "desc" });
 * const items = await prisma.model.findMany({
 *   ...args,
 *   where: { organizationId },
 * });
 * ```
 */
export function buildPrismaCursorArgs(
  params: PaginationParams,
  options: PrismaCursorOptions = {}
): PrismaCursorArgs {
  const {
    cursorField = "id",
    orderBy = "desc",
    additionalOrderBy = {},
  } = options;

  const args: PrismaCursorArgs = {
    // Fetch one extra to determine if there are more items
    take: params.limit + 1,
    orderBy: [{ [cursorField]: orderBy }, ...Object.entries(additionalOrderBy).map(([k, v]) => ({ [k]: v }))],
  };

  if (params.cursor) {
    args.cursor = { [cursorField]: params.cursor };
    args.skip = 1; // Skip the cursor item itself
  }

  return args;
}

/**
 * Build Prisma arguments with common createdAt ordering.
 * Shorthand for the common pattern of ordering by createdAt desc.
 *
 * @param params - Pagination parameters
 * @returns Prisma-compatible cursor arguments
 */
export function buildPrismaCreatedAtCursorArgs(
  params: PaginationParams
): PrismaCursorArgs {
  return buildPrismaCursorArgs(params, {
    cursorField: "id",
    orderBy: "desc",
    additionalOrderBy: { createdAt: "desc" },
  });
}

// =============================================================================
// Migration Utilities
// =============================================================================

/**
 * Convert offset-based params to approximate cursor-based params.
 * Useful during migration from offset to cursor-based pagination.
 *
 * Note: This is a best-effort conversion. For accurate pagination,
 * use native cursor-based pagination.
 *
 * @deprecated Use cursor-based pagination natively
 */
export function convertOffsetToCursor(
  offset: OffsetPaginationParams
): PaginationParams {
  // Can't convert offset to cursor directly, but we can use limit
  return {
    cursor: undefined, // Client needs to track last cursor
    limit: offset.limit,
  };
}

/**
 * Convert page-based params to offset-based params.
 * Useful during migration from page to cursor-based pagination.
 *
 * @deprecated Use cursor-based pagination natively
 */
export function convertPageToOffset(
  page: PagePaginationParams
): OffsetPaginationParams {
  return {
    limit: page.limit,
    offset: (page.page - 1) * page.limit,
  };
}

// =============================================================================
// SWR Key Helpers
// =============================================================================

/**
 * Build a URL with pagination query parameters.
 *
 * @param baseUrl - Base URL without query params
 * @param params - Pagination parameters
 * @param additionalParams - Additional query parameters
 * @returns URL string with query parameters
 *
 * @example
 * ```typescript
 * const url = buildPaginatedUrl("/api/clients", { cursor: "abc", limit: 50 }, { status: "ACTIVE" });
 * // "/api/clients?cursor=abc&limit=50&status=ACTIVE"
 * ```
 */
export function buildPaginatedUrl(
  baseUrl: string,
  params: PaginationParams,
  additionalParams?: Record<string, string | number | boolean | undefined>
): string {
  const queryParams = new URLSearchParams();

  if (params.cursor) {
    queryParams.append("cursor", params.cursor);
  }
  queryParams.append("limit", String(params.limit));

  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, String(value));
      }
    });
  }

  const queryString = queryParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * SWR key generator for cursor-based pagination with useSWRInfinite.
 *
 * @param baseUrl - Base API URL
 * @param limit - Items per page
 * @param additionalParams - Additional query parameters
 * @returns Key generator function for useSWRInfinite
 *
 * @example
 * ```typescript
 * const getKey = createSWRInfiniteKey("/api/clients", 50, { status: "ACTIVE" });
 * const { data } = useSWRInfinite(getKey, fetcher);
 * ```
 */
export function createSWRInfiniteKey(
  baseUrl: string,
  limit: number = DEFAULT_PAGE_SIZE,
  additionalParams?: Record<string, string | number | boolean | undefined>
) {
  return (
    pageIndex: number,
    previousPageData: PaginatedResponse<unknown> | null
  ): string | null => {
    // Reached the end
    if (previousPageData && !previousPageData.pagination.hasMore) {
      return null;
    }

    // First page
    if (pageIndex === 0) {
      return buildPaginatedUrl(baseUrl, { limit }, additionalParams);
    }

    // Subsequent pages with cursor
    const cursor = previousPageData?.pagination.nextCursor;
    if (!cursor) {
      return null;
    }

    return buildPaginatedUrl(baseUrl, { cursor, limit }, additionalParams);
  };
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a response is a PaginatedResponse.
 */
export function isPaginatedResponse<T>(
  response: unknown
): response is PaginatedResponse<T> {
  return (
    typeof response === "object" &&
    response !== null &&
    "items" in response &&
    "pagination" in response &&
    Array.isArray((response as PaginatedResponse<T>).items)
  );
}

/**
 * Type guard to check if a response is an ExternalPaginatedResponse.
 */
export function isExternalPaginatedResponse<T>(
  response: unknown
): response is ExternalPaginatedResponse<T> {
  return (
    typeof response === "object" &&
    response !== null &&
    "data" in response &&
    "meta" in response &&
    "timestamp" in response
  );
}

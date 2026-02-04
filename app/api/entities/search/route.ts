/**
 * Unified Entity Search API
 * 
 * POST /api/entities/search
 * 
 * Search across multiple entity types with a single query.
 * Supports multi-field search for each entity type.
 * 
 * Request body:
 * {
 *   query: string;           // Search query
 *   types: string[];         // Entity types: ["client", "property", "document", "event"]
 *   limit?: number;          // Max results per type (default: 10, max: 50)
 *   filters?: {              // Optional type-specific filters
 *     clientStatus?: string;
 *     propertyStatus?: string;
 *     documentType?: string;
 *     eventType?: string;
 *   }
 * }
 * 
 * Response:
 * {
 *   results: {
 *     client: EntitySearchResult[];
 *     property: EntitySearchResult[];
 *     document: EntitySearchResult[];
 *     event: EntitySearchResult[];
 *   };
 *   timing: {
 *     total: number;
 *     perType: Record<string, number>;
 *   };
 * }
 */

import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { searchEntities, type EntityType } from "@/lib/search/entity-search";

const VALID_TYPES: EntityType[] = ["client", "property", "document", "event"];
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;

export async function POST(req: Request) {
  try {
    // Authenticate user
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const body = await req.json();
    const { query = "", types = [], limit: requestedLimit, filters = {} } = body;

    // Validate types
    if (!Array.isArray(types) || types.length === 0) {
      return NextResponse.json(
        { error: "At least one entity type must be specified" },
        { status: 400 }
      );
    }

    const validTypes = types.filter((t: string): t is EntityType =>
      VALID_TYPES.includes(t as EntityType)
    );

    if (validTypes.length === 0) {
      return NextResponse.json(
        {
          error: `Invalid entity types. Valid types are: ${VALID_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate and set limit
    let limit = DEFAULT_LIMIT;
    if (requestedLimit !== undefined) {
      const parsed = parseInt(requestedLimit, 10);
      if (!isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, MAX_LIMIT);
      }
    }

    // Perform search
    const searchResponse = await searchEntities({
      query: String(query || ""),
      types: validTypes,
      organizationId,
      limit,
      filters,
    });

    // Set cache headers for successful responses
    const headers = new Headers();
    headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");

    return NextResponse.json(searchResponse, {
      status: 200,
      headers,
    });
  } catch (error: unknown) {
    // Handle authentication errors
    if (error instanceof Error && error.message.includes("not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message.includes("not associated")) {
      return NextResponse.json(
        { error: "No organization context" },
        { status: 403 }
      );
    }

    console.error("[ENTITY_SEARCH_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to search entities" },
      { status: 500 }
    );
  }
}

// GET endpoint for simpler queries (via URL params)
export async function GET(req: Request) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const typesParam = searchParams.get("types") || "client,property,document,event";
    const limitParam = searchParams.get("limit");

    // Parse types from comma-separated string
    const types = typesParam
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t): t is EntityType => VALID_TYPES.includes(t as EntityType));

    if (types.length === 0) {
      return NextResponse.json(
        { error: "No valid entity types specified" },
        { status: 400 }
      );
    }

    // Parse limit
    let limit = DEFAULT_LIMIT;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, MAX_LIMIT);
      }
    }

    // Parse optional filters from URL params
    const filters: Record<string, string> = {};
    const clientStatus = searchParams.get("clientStatus");
    const propertyStatus = searchParams.get("propertyStatus");
    const documentType = searchParams.get("documentType");
    const eventType = searchParams.get("eventType");

    if (clientStatus) filters.clientStatus = clientStatus;
    if (propertyStatus) filters.propertyStatus = propertyStatus;
    if (documentType) filters.documentType = documentType;
    if (eventType) filters.eventType = eventType;

    const searchResponse = await searchEntities({
      query,
      types,
      organizationId,
      limit,
      filters,
    });

    // Cache headers
    const headers = new Headers();
    headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");

    return NextResponse.json(searchResponse, { status: 200, headers });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("[ENTITY_SEARCH_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to search entities" },
      { status: 500 }
    );
  }
}

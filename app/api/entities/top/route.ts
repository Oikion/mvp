/**
 * Top Entities API
 *
 * GET /api/entities/top
 *
 * Returns the most recently updated entities for initial display.
 * Used when no search query is provided to populate selectors.
 *
 * Query params:
 * - types: comma-separated list (default: "client,property,document,event")
 * - limit: max results per type (default: 10, max: 50)
 *
 * Response format matches /api/entities/search for consistency.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { apiUnauthorized, apiForbidden, apiInternalError } from "@/lib/api-response";
import { getTopEntities, type EntityType } from "@/lib/search/entity-search";

const VALID_TYPES: EntityType[] = ["contact", "property", "document", "event", "request", "deal"];
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;

export async function GET(req: Request) {
  const { userId, orgId: organizationId } = await auth();
  if (!userId) return apiUnauthorized();
  if (!organizationId) return apiForbidden();

  try {
    const { searchParams } = new URL(req.url);
    const typesParam = searchParams.get("types") || "contact,property,document,event,request";
    const limitParam = searchParams.get("limit");

    // Parse types
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

    const response = await getTopEntities(organizationId, types, limit);

    // Longer cache for top results since they're not search-specific
    const headers = new Headers();
    headers.set("Cache-Control", "private, max-age=120, stale-while-revalidate=300");

    return NextResponse.json(response, { status: 200, headers });
  } catch (error: unknown) {
    console.error("[TOP_ENTITIES_GET]", error);
    return apiInternalError("Failed to fetch top entities");
  }
}

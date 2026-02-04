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
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { getTopEntities, type EntityType } from "@/lib/search/entity-search";

const VALID_TYPES: EntityType[] = ["client", "property", "document", "event"];
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;

export async function GET(req: Request) {
  try {
    // Authenticate
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const { searchParams } = new URL(req.url);
    const typesParam = searchParams.get("types") || "client,property,document,event";
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
    if (error instanceof Error && error.message.includes("not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message.includes("not associated")) {
      return NextResponse.json(
        { error: "No organization context" },
        { status: 403 }
      );
    }

    console.error("[TOP_ENTITIES_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to fetch top entities" },
      { status: 500 }
    );
  }
}

// @ts-nocheck
// TODO: Fix type errors
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { calculateMatchScore } from "@/lib/matchmaking/calculator";

/**
 * POST /api/ai/matchmaking/property-matches
 * Find matching clients for a property using the matchmaking algorithm
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (!user || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { propertyId, limit = 10, minScore = 40 } = body;

    if (!propertyId) {
      return NextResponse.json(
        { error: "propertyId is required" },
        { status: 400 }
      );
    }

    // Get the property
    const property = await prismadb.properties.findFirst({
      where: {
        id: propertyId,
        organizationId,
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Get active clients
    const clients = await prismadb.clients.findMany({
      where: {
        organizationId,
        client_status: { in: ["LEAD", "ACTIVE"] },
      },
      take: 100,
    });

    // Calculate match scores
    const matches = clients
      .map((client) => {
        const result = calculateMatchScore(client, property);
        return {
          client: {
            id: client.id,
            name: client.client_name,
            type: client.client_type,
            intent: client.intent,
            status: client.client_status,
            budget: {
              min: client.budget_min,
              max: client.budget_max,
            },
            email: client.primary_email,
            phone: client.primary_phone,
          },
          score: result.score,
          breakdown: result.breakdown,
        };
      })
      .filter((match) => match.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      property: {
        id: property.id,
        name: property.property_name,
        type: property.property_type,
        price: property.price,
        location: property.area || property.municipality,
      },
      matches,
      total: matches.length,
    });
  } catch (error) {
    console.error("[AI_MATCHMAKING_PROPERTY_MATCHES]", error);
    return NextResponse.json(
      { error: "Failed to find matches" },
      { status: 500 }
    );
  }
}

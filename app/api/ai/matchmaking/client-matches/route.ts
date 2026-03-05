// @ts-nocheck
// TODO: Fix type errors
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { calculateMatchScore } from "@/lib/matchmaking/calculator";

/**
 * POST /api/ai/matchmaking/client-matches
 * Find matching properties for a client using the matchmaking algorithm
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (!user || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, limit = 10, minScore = 40 } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId is required" },
        { status: 400 }
      );
    }

    // Get the client with their preferences
    const client = await prismadb.clients.findFirst({
      where: {
        id: clientId,
        organizationId,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // Get active properties
    const properties = await prismadb.properties.findMany({
      where: {
        organizationId,
        property_status: "ACTIVE",
      },
      take: 100, // Get more properties to filter from
    });

    // Calculate match scores
    const matches = properties
      .map((property) => {
        const result = calculateMatchScore(client, property);
        return {
          property: {
            id: property.id,
            name: property.property_name,
            type: property.property_type,
            transactionType: property.transaction_type,
            price: property.price,
            location: {
              area: property.area,
              municipality: property.municipality,
              city: property.address_city,
            },
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            size: property.size_net_sqm,
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
      client: {
        id: client.id,
        name: client.client_name,
        intent: client.intent,
        budget: {
          min: client.budget_min,
          max: client.budget_max,
        },
      },
      matches,
      total: matches.length,
    });
  } catch (error) {
    console.error("[AI_MATCHMAKING_CLIENT_MATCHES]", error);
    return NextResponse.json(
      { error: "Failed to find matches" },
      { status: 500 }
    );
  }
}

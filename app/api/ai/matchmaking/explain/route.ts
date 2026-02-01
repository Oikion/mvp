import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { calculateMatchScore } from "@/lib/matchmaking/calculator";

/**
 * POST /api/ai/matchmaking/explain
 * Explain the match score between a client and property
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (!user || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, propertyId } = body;

    if (!clientId || !propertyId) {
      return NextResponse.json(
        { error: "Both clientId and propertyId are required" },
        { status: 400 }
      );
    }

    // Get the client
    const client = await prismadb.clients.findFirst({
      where: { id: clientId, organizationId },
    });

    // Get the property
    const property = await prismadb.properties.findFirst({
      where: { id: propertyId, organizationId },
    });

    if (!client || !property) {
      return NextResponse.json(
        { error: "Client or property not found" },
        { status: 404 }
      );
    }

    // Calculate match score with full breakdown
    const result = calculateMatchScore(client, property);

    // Generate human-readable explanation
    const explanation = generateExplanation(result, client, property);

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        name: client.client_name,
      },
      property: {
        id: property.id,
        name: property.property_name,
      },
      score: result.score,
      breakdown: result.breakdown,
      explanation,
    });
  } catch (error) {
    console.error("[AI_MATCHMAKING_EXPLAIN]", error);
    return NextResponse.json(
      { error: "Failed to explain match" },
      { status: 500 }
    );
  }
}

function generateExplanation(
  result: { score: number; breakdown: Record<string, number> },
  client: any,
  property: any
): string {
  const lines: string[] = [];
  
  lines.push(`Match Score: ${result.score}%`);
  lines.push("");

  // Budget analysis
  if (result.breakdown.budget >= 80) {
    lines.push(`✓ Budget: Property price (${property.price}€) fits within client's budget.`);
  } else if (result.breakdown.budget >= 50) {
    lines.push(`◐ Budget: Property price is slightly outside the ideal budget range.`);
  } else {
    lines.push(`✗ Budget: Property price doesn't match client's budget expectations.`);
  }

  // Location analysis
  if (result.breakdown.location >= 80) {
    lines.push(`✓ Location: Property is in a preferred area.`);
  } else if (result.breakdown.location >= 50) {
    lines.push(`◐ Location: Property is in a nearby area.`);
  } else {
    lines.push(`✗ Location: Property location doesn't match preferences.`);
  }

  // Size analysis
  if (result.breakdown.size >= 80) {
    lines.push(`✓ Size: Property size matches requirements.`);
  } else if (result.breakdown.size >= 50) {
    lines.push(`◐ Size: Property size is close to requirements.`);
  }

  // Bedrooms analysis
  if (result.breakdown.bedrooms >= 80) {
    lines.push(`✓ Bedrooms: ${property.bedrooms} bedrooms match the requirement.`);
  }

  return lines.join("\n");
}

// @ts-nocheck
// TODO: Fix type errors
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * POST /api/ai/search-clients
 * Semantic search for clients based on criteria
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (!user || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { query, budgetMin, budgetMax, intent, limit = 10 } = body;

    if (!query) {
      return NextResponse.json(
        { error: "query is required" },
        { status: 400 }
      );
    }

    // Build search conditions
    const where: Prisma.ClientsWhereInput = {
      organizationId,
      client_status: { in: ["LEAD", "ACTIVE"] },
    };

    // Add budget filters
    if (budgetMin) {
      where.budget_max = { gte: budgetMin };
    }
    if (budgetMax) {
      where.budget_min = { lte: budgetMax };
    }

    // Add intent filter
    if (intent) {
      where.intent = intent;
    }

    // Search in name, email, notes
    // For a full semantic search, you'd use embeddings
    // For now, we do a text-based search
    const searchTerms = query.toLowerCase().split(/\s+/);
    
    where.OR = [
      { client_name: { contains: query, mode: "insensitive" } },
      { primary_email: { contains: query, mode: "insensitive" } },
      // Search in areas of interest (JSON field)
      ...searchTerms.map((term) => ({
        areas_of_interest: {
          array_contains: [term],
        },
      })),
    ];

    const clients = await prismadb.clients.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        client_name: true,
        client_type: true,
        client_status: true,
        intent: true,
        budget_min: true,
        budget_max: true,
        primary_email: true,
        primary_phone: true,
        areas_of_interest: true,
        property_preferences: true,
      },
    });

    return NextResponse.json({
      success: true,
      query,
      clients: clients.map((c) => ({
        id: c.id,
        name: c.client_name,
        type: c.client_type,
        status: c.client_status,
        intent: c.intent,
        budget: {
          min: c.budget_min,
          max: c.budget_max,
        },
        email: c.primary_email,
        phone: c.primary_phone,
        areasOfInterest: c.areas_of_interest,
        preferences: c.property_preferences,
      })),
      total: clients.length,
    });
  } catch (error) {
    console.error("[AI_SEARCH_CLIENTS]", error);
    return NextResponse.json(
      { error: "Failed to search clients" },
      { status: 500 }
    );
  }
}

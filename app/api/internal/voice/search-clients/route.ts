import { NextRequest, NextResponse } from "next/server";
import { getInternalApiContext } from "@/lib/internal-api-auth";
import { prismadb } from "@/lib/prisma";

/**
 * POST /api/internal/voice/search-clients
 * Internal API for voice assistant to search clients
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getInternalApiContext(request);

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, isAdminTest } = context;

    // Return mock data for admin testing
    if (isAdminTest) {
      return NextResponse.json({
        success: true,
        clients: [
          {
            id: "test-client-1",
            name: "Maria Papadopoulou",
            fullName: "Maria Papadopoulou",
            email: "maria@example.com",
            phone: "+30 694 123 4567",
            status: "ACTIVE",
            intent: "BUY",
            areasOfInterest: "Glyfada, Voula",
            budgetMin: 200000,
            budgetMax: 350000,
            lastUpdated: new Date().toISOString(),
          },
          {
            id: "test-client-2",
            name: "Nikos Georgiadis",
            fullName: "Nikos Georgiadis",
            email: "nikos@example.com",
            phone: "+30 697 987 6543",
            status: "LEAD",
            intent: "RENT",
            areasOfInterest: "Kolonaki, Kifisia",
            budgetMin: null,
            budgetMax: 1500,
            lastUpdated: new Date().toISOString(),
          },
        ],
        count: 2,
        message: "Found 2 clients (test mode)",
        _testMode: true,
      });
    }

    const body = await request.json();
    const {
      search,
      name,
      status,
      intent,
      limit = 10,
    } = body;

    // Build where clause
    const where: Record<string, unknown> = {
      organizationId,
    };

    // Search by name or general search term
    const searchTerm = search || name;
    if (searchTerm) {
      where.OR = [
        { client_name: { contains: searchTerm, mode: "insensitive" } },
        { full_name: { contains: searchTerm, mode: "insensitive" } },
        { primary_email: { contains: searchTerm, mode: "insensitive" } },
        { primary_phone: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.client_status = status;
    }

    if (intent) {
      where.intent = intent;
    }

    // Fetch clients
    const clients = await prismadb.clients.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        client_name: true,
        full_name: true,
        primary_email: true,
        primary_phone: true,
        client_status: true,
        intent: true,
        areas_of_interest: true,
        budget_min: true,
        budget_max: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      clients: clients.map((client) => ({
        id: client.id,
        name: client.client_name,
        fullName: client.full_name,
        email: client.primary_email,
        phone: client.primary_phone,
        status: client.client_status,
        intent: client.intent,
        areasOfInterest: client.areas_of_interest,
        budgetMin: client.budget_min,
        budgetMax: client.budget_max,
        lastUpdated: client.updatedAt?.toISOString(),
      })),
      count: clients.length,
      message: clients.length === 0
        ? "No clients found matching your criteria"
        : clients.length === 1
        ? `Found 1 client: ${clients[0].client_name}`
        : `Found ${clients.length} clients`,
    });
  } catch (error) {
    console.error("[VOICE_SEARCH_CLIENTS]", error);
    return NextResponse.json(
      { error: "Failed to search clients" },
      { status: 500 }
    );
  }
}

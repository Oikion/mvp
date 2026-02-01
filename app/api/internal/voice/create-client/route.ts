import { NextRequest, NextResponse } from "next/server";
import { getInternalApiContext } from "@/lib/internal-api-auth";
import { prismadb } from "@/lib/prisma";
import { generateFriendlyId } from "@/lib/friendly-id";

/**
 * POST /api/internal/voice/create-client
 * Internal API for voice assistant to create a client
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getInternalApiContext(request);

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, organizationId, isAdminTest } = context;

    // Return mock response for admin testing (don't actually create)
    if (isAdminTest) {
      const body = await request.json();
      const clientName = body.name || 
        (body.firstName && body.lastName ? `${body.firstName} ${body.lastName}` : body.firstName || body.lastName || "Test Client");

      return NextResponse.json({
        success: true,
        client: {
          id: `test-client-${Date.now()}`,
          name: clientName,
          email: body.email || null,
          phone: body.phone || null,
          status: body.status || "LEAD",
          intent: body.intent || null,
          createdAt: new Date().toISOString(),
        },
        message: `Client "${clientName}" would be created (test mode - no actual data created)`,
        _testMode: true,
      });
    }

    const body = await request.json();
    const {
      name,
      firstName,
      lastName,
      email,
      phone,
      status,
      intent,
      type,
      notes,
      areasOfInterest,
      budgetMin,
      budgetMax,
    } = body;

    // Build client name from firstName + lastName if name not provided
    const clientName = name || 
      (firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName);

    if (!clientName) {
      return NextResponse.json(
        { error: "Client name is required (provide name, or firstName/lastName)" },
        { status: 400 }
      );
    }

    // Generate friendly ID
    const clientId = await generateFriendlyId(prismadb, "Clients");

    // Create client
    const client = await prismadb.clients.create({
      data: {
        id: clientId,
        organizationId,
        createdBy: userId,
        updatedBy: userId,
        client_name: clientName,
        full_name: firstName && lastName ? `${firstName} ${lastName}` : clientName,
        primary_email: email || null,
        primary_phone: phone || null,
        client_status: status || "LEAD",
        intent: intent || null,
        client_type: type || null,
        description: notes || null,
        areas_of_interest: areasOfInterest || null,
        budget_min: budgetMin || null,
        budget_max: budgetMax || null,
        assigned_to: userId, // Assign to current user by default
        draft_status: false,
      },
      select: {
        id: true,
        client_name: true,
        primary_email: true,
        primary_phone: true,
        client_status: true,
        intent: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        name: client.client_name,
        email: client.primary_email,
        phone: client.primary_phone,
        status: client.client_status,
        intent: client.intent,
        createdAt: client.createdAt.toISOString(),
      },
      message: `Client "${client.client_name}" created successfully`,
    });
  } catch (error) {
    console.error("[VOICE_CREATE_CLIENT]", error);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { DealStatus } from "@prisma/client";
import { notifyDealProposed } from "@/lib/notifications";

export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as DealStatus | null;

    const deals = await prismadb.deal.findMany({
      where: {
        OR: [
          { propertyAgentId: currentUser.id },
          { clientAgentId: currentUser.id },
        ],
        ...(status && { status }),
      },
      include: {
        property: {
          select: {
            id: true,
            property_name: true,
            property_type: true,
            price: true,
            address_city: true,
            linkedDocuments: {
              where: {
                document_file_mimeType: { startsWith: "image/" },
              },
              select: { document_file_url: true },
              take: 1,
            },
          },
        },
        client: {
          select: {
            id: true,
            client_name: true,
            primary_email: true,
            intent: true,
          },
        },
        propertyAgent: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        clientAgent: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const enrichedDeals = deals.map((deal) => ({
      ...deal,
      isPropertyAgent: deal.propertyAgentId === currentUser.id,
      isProposer: deal.proposedById === currentUser.id,
    }));

    return NextResponse.json(enrichedDeals);
  } catch (error) {
    console.error("[DEALS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();

    const {
      propertyId,
      clientId,
      propertyAgentId,
      clientAgentId,
      propertyAgentSplit = 50,
      clientAgentSplit = 50,
      totalCommission,
      commissionCurrency = "EUR",
      title,
      notes,
    } = body;

    if (!propertyId || !clientId || !propertyAgentId || !clientAgentId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Validate splits
    if (propertyAgentSplit + clientAgentSplit !== 100) {
      return new NextResponse("Commission split must sum to 100%", {
        status: 400,
      });
    }

    // Resolve agent IDs - if not provided, use current user
    const resolvedPropertyAgentId = propertyAgentId || currentUser.id;
    const resolvedClientAgentId = clientAgentId || currentUser.id;

    // Current user must be one of the agents
    if (
      currentUser.id !== resolvedPropertyAgentId &&
      currentUser.id !== resolvedClientAgentId
    ) {
      return new NextResponse("You must be one of the agents", { status: 403 });
    }

    // Verify agents exist
    const [propertyAgent, clientAgent, property, client] = await Promise.all([
      prismadb.users.findUnique({ where: { id: resolvedPropertyAgentId } }),
      prismadb.users.findUnique({ where: { id: resolvedClientAgentId } }),
      prismadb.properties.findUnique({ where: { id: propertyId } }),
      prismadb.clients.findUnique({ where: { id: clientId } }),
    ]);

    if (!propertyAgent || !clientAgent) {
      return new NextResponse("Agent not found", { status: 404 });
    }

    if (!property || !client) {
      return new NextResponse("Property or client not found", { status: 404 });
    }

    const deal = await prismadb.deal.create({
      data: {
        propertyId,
        clientId,
        propertyAgentId: resolvedPropertyAgentId,
        clientAgentId: resolvedClientAgentId,
        propertyAgentSplit,
        clientAgentSplit,
        totalCommission: totalCommission || null,
        commissionCurrency,
        proposedById: currentUser.id,
        title: title || `Deal: ${property.property_name}`,
        notes,
        status: "PROPOSED",
      },
    });

    // Notify the other agent about the deal proposal
    const otherAgentId = currentUser.id === resolvedPropertyAgentId 
      ? resolvedClientAgentId 
      : resolvedPropertyAgentId;

    await notifyDealProposed({
      dealId: deal.id,
      dealTitle: deal.title || undefined,
      propertyName: property.property_name || "Property",
      clientName: client.client_name,
      actorId: currentUser.id,
      actorName: currentUser.name || currentUser.email || "Someone",
      targetUserId: otherAgentId,
      organizationId,
    });

    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    console.error("[DEALS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}


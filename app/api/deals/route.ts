import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import {
  apiSuccess,
  apiUnauthorized,
  apiInternalError,
  apiBadRequest,
  apiCreated,
} from "@/lib/api-response";
import { createDealSchema, dealQuerySchema } from "@/lib/validations/deals";
import { generateFriendlyId } from "@/lib/friendly-id";
import { serializeDealForClient } from "@/lib/deals/serialize";

export async function GET(req: Request) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) return apiUnauthorized();

    const { searchParams } = new URL(req.url);
    const stage = searchParams.get("stage");
    const dealType = searchParams.get("dealType");
    const search = searchParams.get("search");
    const limit = searchParams.get("limit");

    const where: any = { organizationId };
    if (stage) where.stage = stage;
    if (dealType) where.dealType = dealType;
    if (search) {
      where.OR = [
        { friendlyId: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
      ];
    }

    const deals = await prismadb.deal.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            property_name: true,
            property_type: true,
            price: true,
            address_city: true,
          },
        },
        listingAgent: {
          select: { id: true, name: true, avatar: true },
        },
        buyerAgent: {
          select: { id: true, name: true, avatar: true },
        },
        dealParties: {
          include: {
            contact: {
              select: { id: true, displayName: true, category: true },
            },
          },
        },
        _count: { select: { stageLogs: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit ? Math.min(parseInt(limit, 10), 100) : 50,
    });

    // Flatten Prisma Decimal columns so the JSON response carries plain
    // numbers (matches what the client SWR cache + list UI expect).
    return apiSuccess(deals.map((d) => serializeDealForClient(d)));
  } catch (error) {
    console.error("[DEALS_GET]", error);
    return apiInternalError("Failed to fetch deals", error);
  }
}

export async function POST(req: Request) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) return apiUnauthorized();

    const body = await req.json();
    const validation = createDealSchema.safeParse(body);
    if (!validation.success) {
      return apiBadRequest("Validation failed", validation.error.flatten().fieldErrors);
    }

    const data = validation.data;

    // Validate property belongs to org
    const property = await prismadb.properties.findFirst({
      where: { id: data.propertyId, organizationId },
      select: { id: true, property_name: true },
    });
    if (!property) {
      return apiBadRequest("Property not found or access denied");
    }

    const friendlyId = await generateFriendlyId(prismadb, "Deal", organizationId);

    const deal = await prismadb.deal.create({
      data: {
        friendlyId,
        organizationId,
        propertyId: data.propertyId,
        requestId: data.requestId ?? null,
        notaryContactId: data.notaryContactId ?? null,
        listingAgentId: data.listingAgentId ?? null,
        buyerAgentId: data.buyerAgentId ?? null,
        proposedById: userId,
        stage: data.stage ?? "INTEREST",
        dealType: data.dealType ?? null,
        agentRole: data.agentRole ?? null,
        status: "PROPOSED",
        agreedPrice: data.agreedPrice ?? null,
        totalCommission: data.totalCommission ?? null,
        commissionRate: data.commissionRate ?? null,
        commissionCurrency: data.commissionCurrency ?? "EUR",
        listingAgentSplit: data.listingAgentSplit ?? 50,
        buyerAgentSplit: data.buyerAgentSplit ?? 50,
        title: data.title || `Deal: ${property.property_name || friendlyId}`,
        notes: data.notes ?? null,
      },
    });

    // Create initial stage log
    await prismadb.dealStageLog.create({
      data: {
        dealId: deal.id,
        fromStage: "INTEREST",
        toStage: data.stage ?? "INTEREST",
        changedBy: userId,
        notes: "Deal created via API",
      },
    });

    return apiCreated(serializeDealForClient(deal));
  } catch (error) {
    console.error("[DEALS_POST]", error);
    return apiInternalError("Failed to create deal", error);
  }
}

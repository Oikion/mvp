import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import {
  apiSuccess,
  apiUnauthorized,
  apiInternalError,
  apiBadRequest,
  apiCreated,
  apiForbidden,
} from "@/lib/api-response";
import { canPerformAction } from "@/lib/permissions";
import { createDealSchema, dealQuerySchema } from "@/lib/validations/deals";
import { generateFriendlyId } from "@/lib/friendly-id";
import { serializeDealForClient } from "@/lib/deals/serialize";
import {
  logEntityCreated,
  logEntityLinked,
} from "@/lib/activity-logger";

export async function GET(req: Request) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) return apiUnauthorized();

    const readCheck = await canPerformAction("deal:read");
    if (!readCheck.allowed) {
      return apiForbidden(readCheck.reason);
    }

    const { searchParams } = new URL(req.url);
    const queryValidation = dealQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryValidation.success) {
      return apiBadRequest("Invalid query parameters", queryValidation.error.flatten().fieldErrors);
    }
    const { stage, dealType, search, limit } = queryValidation.data;

    const where: Record<string, unknown> = { organizationId };
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
      take: limit ?? 50,
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

    const createCheck = await canPerformAction("deal:create");
    if (!createCheck.allowed) {
      return apiForbidden(createCheck.reason);
    }

    const body = await req.json();
    const validation = createDealSchema.safeParse(body);
    if (!validation.success) {
      return apiBadRequest("Validation failed", validation.error.flatten().fieldErrors);
    }

    const data = validation.data;

    // Resolve internal Users.id from Clerk userId. The Deal FK columns
    // (proposedById, etc.) reference Users.id (CUID), not the Clerk userId
    // — see file header comment in actions/deals/index.ts. We capture the
    // internal id here so activity logging records the actor correctly.
    const internalUser = await prismadb.users.findFirst({
      where: { clerkUserId: userId },
      select: { id: true },
    });
    const actorUserId = internalUser?.id;

    // Validate property belongs to org. Selector widened with friendlyId
    // for activity-log target URL construction.
    const property = await prismadb.properties.findFirst({
      where: { id: data.propertyId, organizationId },
      select: { id: true, property_name: true, friendlyId: true },
    });
    if (!property) {
      return apiBadRequest("Property not found or access denied");
    }

    // Resolve optional request reference — also validates it belongs to the org.
    const requestRef = data.requestId
      ? await prismadb.request.findFirst({
          where: { id: data.requestId, organizationId },
          select: { id: true, friendlyId: true },
        })
      : null;

    // Validate notary contact belongs to org if provided (Contact has organizationId).
    // listingAgentId/buyerAgentId reference Users which has no organizationId — org
    // membership is enforced by Clerk at the session level.
    if (data.notaryContactId) {
      const notaryExists = await prismadb.contact.findFirst({
        where: { id: data.notaryContactId, organizationId },
        select: { id: true },
      });
      if (!notaryExists) {
        return apiBadRequest("Notary contact not found or access denied");
      }
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
        proposedById: actorUserId ?? userId,
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
        changedBy: actorUserId ?? userId,
        notes: "Deal created via API",
      },
    });

    // Activity logging — fire-and-forget after DB writes.
    void logEntityCreated({
      organizationId,
      parentType: "DEAL",
      parentId: deal.id,
      createdByUserId: actorUserId,
      source: "manual",
    });

    if (deal.propertyId) {
      void logEntityLinked({
        organizationId,
        fromType: "DEAL",
        fromId: deal.id,
        toType: "PROPERTY",
        toId: deal.propertyId,
        toLabel: property.property_name ?? "Property",
        toUrl: `/app/mls/properties/${property.friendlyId ?? property.id}`,
        createdByUserId: actorUserId,
      });
    }

    if (deal.requestId && requestRef) {
      void logEntityLinked({
        organizationId,
        fromType: "DEAL",
        fromId: deal.id,
        toType: "REQUEST",
        toId: deal.requestId,
        toLabel: "Request",
        toUrl: `/app/requests/${requestRef.friendlyId ?? requestRef.id}`,
        createdByUserId: actorUserId,
      });
    }

    return apiCreated(serializeDealForClient(deal));
  } catch (error) {
    console.error("[DEALS_POST]", error);
    return apiInternalError("Failed to create deal", error);
  }
}

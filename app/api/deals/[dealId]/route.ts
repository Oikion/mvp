import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import {
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
  apiInternalError,
  apiBadRequest,
} from "@/lib/api-response";
import { updateDealSchema, advanceDealStageSchema } from "@/lib/validations/deals";
import {
  isValidDealStageTransition,
  getDealStageTransitionError,
} from "@/lib/validations/status-transitions";
import { serializeDealForClient } from "@/lib/deals/serialize";
import { createChangeLogEntry } from "@/lib/entity-change-log";

export async function GET(
  req: Request,
  props: { params: Promise<{ dealId: string }> }
) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) return apiUnauthorized();

    const { dealId } = await props.params;

    const deal = await prismadb.deal.findFirst({
      where: { id: dealId, organizationId },
      include: {
        property: {
          select: {
            id: true,
            friendlyId: true,
            property_name: true,
            property_type: true,
            price: true,
            address_city: true,
            address_state: true,
            bedrooms: true,
            bathrooms: true,
            size_net_sqm: true,
          },
        },
        request: {
          select: {
            id: true,
            friendlyId: true,
            requestType: true,
            status: true,
            locationDisplayName: true,
          },
        },
        notaryContact: {
          select: {
            id: true,
            displayName: true,
            email: true,
            primaryPhone: true,
          },
        },
        listingAgent: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        buyerAgent: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        dealParties: {
          include: {
            contact: {
              select: {
                id: true,
                friendlyId: true,
                displayName: true,
                email: true,
                primaryPhone: true,
                category: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        stageLogs: {
          orderBy: { changedAt: "desc" },
          take: 20,
        },
      },
    });

    if (!deal) return apiNotFound("Deal");

    return apiSuccess(
      serializeDealForClient({
        ...deal,
        isListingAgent: deal.listingAgentId === userId,
        isBuyerAgent: deal.buyerAgentId === userId,
        isProposer: deal.proposedById === userId,
      })
    );
  } catch (error) {
    console.error("[DEAL_GET]", error);
    return apiInternalError("Failed to fetch deal", error);
  }
}

export async function PUT(
  req: Request,
  props: { params: Promise<{ dealId: string }> }
) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) return apiUnauthorized();

    const { dealId } = await props.params;
    const body = await req.json();

    // Check if this is a stage advance or a general update
    if (body.toStage) {
      // Stage advance
      const validation = advanceDealStageSchema.safeParse({
        dealId,
        toStage: body.toStage,
        notes: body.notes,
      });
      if (!validation.success) {
        return apiBadRequest("Validation failed", validation.error.flatten().fieldErrors);
      }

      const deal = await prismadb.deal.findFirst({
        where: { id: dealId, organizationId },
        select: { id: true, stage: true },
      });
      if (!deal) return apiNotFound("Deal");

      if (!isValidDealStageTransition(deal.stage, body.toStage)) {
        return apiBadRequest(getDealStageTransitionError(deal.stage, body.toStage));
      }

      const [updated] = await prismadb.$transaction([
        prismadb.deal.update({
          where: { id: dealId },
          data: {
            stage: body.toStage,
            ...(body.toStage === "COMPLETED" && { closedAt: new Date() }),
            ...(body.toStage === "FALLEN_THROUGH" && {
              fallenThroughReason: body.notes ?? null,
            }),
          },
        }),
        prismadb.dealStageLog.create({
          data: {
            dealId,
            fromStage: deal.stage,
            toStage: body.toStage,
            changedBy: userId,
            notes: body.notes ?? null,
          },
        }),
      ]);

      // Fire-and-forget: non-fatal changelog entry for unified activity feed
      await createChangeLogEntry({
        organizationId,
        entityType: "DEAL",
        entityId: dealId,
        eventType: "STAGE_CHANGED",
        actorUserId: userId,
        stageTransition: {
          fromStage: deal.stage,
          toStage: body.toStage,
          notes: body.notes ?? undefined,
        },
      });

      return apiSuccess(serializeDealForClient(updated));
    }

    // General update
    const validation = updateDealSchema.safeParse({ id: dealId, ...body });
    if (!validation.success) {
      return apiBadRequest("Validation failed", validation.error.flatten().fieldErrors);
    }

    const deal = await prismadb.deal.findFirst({
      where: { id: dealId, organizationId },
      select: { id: true },
    });
    if (!deal) return apiNotFound("Deal");

    const { id: _, ...updateData } = validation.data;
    const updated = await prismadb.deal.update({
      where: { id: dealId },
      // Zod has already validated the shape; the cast bridges Zod's output
      // (which includes a typed commissionSplit object) to Prisma's
      // DealUpdateInput (which expects InputJsonValue for JSON columns).
      data: updateData as Prisma.DealUpdateInput,
    });

    return apiSuccess(serializeDealForClient(updated));
  } catch (error) {
    console.error("[DEAL_PUT]", error);
    return apiInternalError("Failed to update deal", error);
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ dealId: string }> }
) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) return apiUnauthorized();

    const { dealId } = await props.params;

    const deal = await prismadb.deal.findFirst({
      where: { id: dealId, organizationId },
      select: { id: true, stage: true },
    });
    if (!deal) return apiNotFound("Deal");

    // Soft delete
    await prismadb.deal.update({
      where: { id: dealId },
      data: { deletedAt: new Date() },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("[DEAL_DELETE]", error);
    return apiInternalError("Failed to delete deal", error);
  }
}

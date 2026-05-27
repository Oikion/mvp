// @ts-nocheck
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { isDemoOrg } from "@/lib/demo/demo-guard";
import { canPerformAction } from "@/lib/permissions";
import {
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
  apiInternalError,
  apiBadRequest,
  apiForbidden,
} from "@/lib/api-response";
import { updateDealSchema, advanceDealStageSchema } from "@/lib/validations/deals";
import {
  isValidDealStageTransition,
  getDealStageTransitionError,
} from "@/lib/validations/status-transitions";
import { serializeDealForClient } from "@/lib/deals/serialize";
import { createChangeLogEntry } from "@/lib/entity-change-log";
import {
  logEntityUpdated,
  logStageChanged,
  type FieldChange,
} from "@/lib/activity-logger";

// Safelist of non-encrypted Deal fields tracked by Activity Log UPDATED
// entries. Mirrors the safelist in actions/deals/index.ts.
const DEAL_TRACKED_FIELDS = [
  "stage",
  "dealValue",
  "expectedCloseDate",
  "assignedToUserId",
  "propertyId",
  "requestId",
] as const;

function diffDealFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const field of DEAL_TRACKED_FIELDS) {
    const oldVal = before[field];
    const newVal = after[field];
    const oldStr =
      oldVal === null || oldVal === undefined
        ? null
        : oldVal instanceof Date
          ? oldVal.toISOString()
          : String(oldVal);
    const newStr =
      newVal === null || newVal === undefined
        ? null
        : newVal instanceof Date
          ? newVal.toISOString()
          : String(newVal);
    if (oldStr !== newStr) {
      changes.push({ field, from: oldStr, to: newStr });
    }
  }
  return changes;
}

export async function GET(
  req: Request,
  props: { params: Promise<{ dealId: string }> }
) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) return apiUnauthorized();

    const readCheck = await canPerformAction("deal:read");
    if (!readCheck.allowed) {
      return apiForbidden(readCheck.reason);
    }

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

    const requiredAction = body.toStage ? "deal:advance_stage" : "deal:update";
    const putCheck = await canPerformAction(requiredAction);
    if (!putCheck.allowed) {
      return apiForbidden(putCheck.reason);
    }

    // Resolve internal Users.id from Clerk userId once for activity logging.
    // Deal FK columns reference Users.id (CUID); the Clerk userId would
    // otherwise produce dangling actor references in Activity rows.
    const internalUser = await prismadb.users.findFirst({
      where: { clerkUserId: userId },
      select: { id: true },
    });
    const actorUserId = internalUser?.id;

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

      if (!isValidDealStageTransition(deal.stage, validation.data.toStage)) {
        return apiBadRequest(getDealStageTransitionError(deal.stage, validation.data.toStage));
      }

      const [updated] = await prismadb.$transaction([
        prismadb.deal.update({
          where: { id: dealId, organizationId },
          data: {
            stage: validation.data.toStage,
            ...(validation.data.toStage === "COMPLETED" && { closedAt: new Date() }),
            ...(validation.data.toStage === "FALLEN_THROUGH" && {
              fallenThroughReason: validation.data.notes ?? null,
            }),
          },
        }),
        prismadb.dealStageLog.create({
          data: {
            dealId,
            fromStage: deal.stage,
            toStage: validation.data.toStage,
            changedBy: actorUserId ?? userId,
            notes: validation.data.notes ?? null,
          },
        }),
      ]);

      // Fire-and-forget: non-fatal changelog entry for unified activity feed
      void createChangeLogEntry({
        organizationId,
        entityType: "DEAL",
        entityId: dealId,
        eventType: "STAGE_CHANGED",
        actorUserId: userId,
        stageTransition: {
          fromStage: deal.stage,
          toStage: validation.data.toStage,
          notes: validation.data.notes ?? undefined,
        },
      });

      // Additional Activity-Log emission alongside EntityChangeLog so the
      // new Activity feed reflects API-driven stage transitions too.
      void logStageChanged({
        organizationId,
        dealId,
        fromStage: deal.stage,
        toStage: validation.data.toStage,
        notes: validation.data.notes ?? undefined,
        changedByUserId: actorUserId,
      });

      return apiSuccess(serializeDealForClient(updated));
    }

    // General update
    const validation = updateDealSchema.safeParse({ id: dealId, ...body });
    if (!validation.success) {
      return apiBadRequest("Validation failed", validation.error.flatten().fieldErrors);
    }

    // Pre-fetch the safelist of tracked fields so we can diff post-update
    // and emit an Activity-Log UPDATED entry.
    const deal = await prismadb.deal.findFirst({
      where: { id: dealId, organizationId },
      select: {
        id: true,
        stage: true,
        propertyId: true,
        requestId: true,
      },
    });
    if (!deal) return apiNotFound("Deal");

    const { id: _, ...updateData } = validation.data;
    const updated = await prismadb.deal.update({
      where: { id: dealId, organizationId },
      // Zod has already validated the shape; the cast bridges Zod's output
      // (which includes a typed commissionSplit object) to Prisma's
      // DealUpdateInput (which expects InputJsonValue for JSON columns).
      data: updateData as Prisma.DealUpdateInput,
    });

    // Activity logging — diff the safelist; emit UPDATED only on real changes.
    const changes = diffDealFields(
      deal as Record<string, unknown>,
      updated as Record<string, unknown>
    );
    if (changes.length > 0) {
      void logEntityUpdated({
        organizationId,
        parentType: "DEAL",
        parentId: dealId,
        createdByUserId: actorUserId,
        changes,
      });
    }

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

    const deleteCheck = await canPerformAction("deal:delete");
    if (!deleteCheck.allowed) {
      return apiForbidden(deleteCheck.reason);
    }

    const { dealId } = await props.params;

    if (await isDemoOrg(organizationId)) {
      return NextResponse.json({ success: true });
    }

    const deal = await prismadb.deal.findFirst({
      where: { id: dealId, organizationId },
      select: { id: true, stage: true },
    });
    if (!deal) return apiNotFound("Deal");

    await prismadb.deal.update({
      where: { id: dealId, organizationId },
      data: { archivedAt: new Date(), archivedBy: userId },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("[DEAL_ARCHIVE]", error);
    return apiInternalError("Failed to archive deal", error);
  }
}

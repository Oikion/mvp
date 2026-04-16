"use server";

import { Prisma } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";
import { generateFriendlyId } from "@/lib/friendly-id";
import { requireAction } from "@/lib/permissions/action-guards";
import {
  actionSuccess,
  actionError,
  actionNotFound,
  actionValidationError,
  type ActionResponse,
} from "@/lib/action-response";
import {
  createDealSchema,
  updateDealSchema,
  advanceDealStageSchema,
  dealPartySchema,
  dealQuerySchema,
} from "@/lib/validations/deals";
import {
  isValidDealStageTransition,
  getDealStageTransitionError,
} from "@/lib/validations/status-transitions";
import type { Deal, DealParty, DealStageLog } from "@prisma/client";
import { serializeDealForClient } from "@/lib/deals/serialize";
import { createChangeLogEntry } from "@/lib/entity-change-log";

// ============================================
// Deal CRUD
// ============================================

/**
 * Create a new deal.
 * Follows the v2.0 server action pattern: permission → org → validate → write → response.
 */
export async function createDeal(
  input: unknown
): Promise<ActionResponse<Deal>> {
  const guard = await requireAction("deal:create");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const currentUser = await getCurrentUser();

  const validation = createDealSchema.safeParse(input);
  if (!validation.success) {
    return actionValidationError(
      "Validation failed",
      validation.error.flatten().fieldErrors
    );
  }

  const data = validation.data;

  // SECURITY: Validate property belongs to the org
  const property = await prismadb.properties.findFirst({
    where: { id: data.propertyId, organizationId },
    select: { id: true, property_name: true },
  });
  if (!property) return actionNotFound("Property");

  // Validate optional references
  if (data.requestId) {
    const request = await prismadb.request.findFirst({
      where: { id: data.requestId, organizationId },
      select: { id: true },
    });
    if (!request) return actionNotFound("Request");
  }

  if (data.notaryContactId) {
    const notary = await prismadb.contact.findFirst({
      where: { id: data.notaryContactId, organizationId },
      select: { id: true },
    });
    if (!notary) return actionNotFound("Notary contact");
  }

  try {
    const friendlyId = await generateFriendlyId(prismadb, "Deal", organizationId);
    // Compute once so the deal row and the stage log agree on the initial stage.
    const initialStage = data.stage ?? "INTEREST";

    // Wrap the deal create + initial DealStageLog insert in a single
    // transaction. Without this, a failure in the stage-log insert (FK
    // violation, deadlock, network blip) would leave a deal in the DB without
    // its "Deal created" audit entry — a permanent gap in the stage history
    // timeline that can't be reconstructed after the fact. `advanceDealStage`
    // uses the same atomic pattern; this matches it.
    const deal = await prismadb.$transaction(async (tx) => {
      const created = await tx.deal.create({
        data: {
          friendlyId,
          organizationId,
          propertyId: data.propertyId,
          requestId: data.requestId ?? null,
          notaryContactId: data.notaryContactId ?? null,
          listingAgentId: data.listingAgentId ?? null,
          buyerAgentId: data.buyerAgentId ?? null,
          proposedById: currentUser.id,
          stage: initialStage,
          dealType: data.dealType ?? null,
          agentRole: data.agentRole ?? null,
          status: "PROPOSED", // legacy field
          agreedPrice: data.agreedPrice ?? null,
          totalCommission: data.totalCommission ?? null,
          commissionRate: data.commissionRate ?? null,
          commissionCurrency: data.commissionCurrency ?? "EUR",
          // Prisma Json columns require InputJsonValue; cast the typed split
          // object to satisfy the generated client's strict JSON input type.
          commissionSplit: (data.commissionSplit ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          depositAmount: data.depositAmount ?? null,
          depositDate: data.depositDate ?? null,
          listingAgentSplit: data.listingAgentSplit ?? 50,
          buyerAgentSplit: data.buyerAgentSplit ?? 50,
          monthlyRentAmount: data.monthlyRentAmount ?? null,
          securityDeposit: data.securityDeposit ?? null,
          leaseStartDate: data.leaseStartDate ?? null,
          leaseEndDate: data.leaseEndDate ?? null,
          leaseDurationMonths: data.leaseDurationMonths ?? null,
          title: data.title || `Deal: ${property.property_name || friendlyId}`,
          notes: data.notes ?? null,
          contractDate: data.contractDate ?? null,
          closedAt: data.closedAt ?? null,
        },
      });

      // Initial stage log entry — creates the "Deal created" audit row that
      // anchors the stage history timeline.
      await tx.dealStageLog.create({
        data: {
          dealId: created.id,
          fromStage: "INTEREST",
          toStage: initialStage,
          changedBy: currentUser.id,
          notes: "Deal created",
        },
      });

      return created;
    });

    revalidatePath("/deals");
    return actionSuccess(serializeDealForClient(deal));
  } catch (error) {
    console.error("[DEAL_CREATE]", error);
    return actionError("Failed to create deal");
  }
}

/**
 * Update a deal's details (not stage — use advanceDealStage for that).
 */
export async function updateDeal(
  input: unknown
): Promise<ActionResponse<Deal>> {
  const guard = await requireAction("deal:update");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  const validation = updateDealSchema.safeParse(input);
  if (!validation.success) {
    return actionValidationError(
      "Validation failed",
      validation.error.flatten().fieldErrors
    );
  }

  const { id, ...data } = validation.data;

  // TOCTOU-safe: always include organizationId in where
  const existing = await prismadb.deal.findFirst({
    where: { id, organizationId },
    select: { id: true, listingAgentId: true },
  });
  if (!existing) return actionNotFound("Deal");

  try {
    const deal = await prismadb.deal.update({
      where: { id },
      data: {
        ...(data.propertyId !== undefined && { propertyId: data.propertyId }),
        ...(data.requestId !== undefined && { requestId: data.requestId }),
        ...(data.notaryContactId !== undefined && { notaryContactId: data.notaryContactId }),
        ...(data.listingAgentId !== undefined && { listingAgentId: data.listingAgentId }),
        ...(data.buyerAgentId !== undefined && { buyerAgentId: data.buyerAgentId }),
        ...(data.dealType !== undefined && { dealType: data.dealType }),
        ...(data.agentRole !== undefined && { agentRole: data.agentRole }),
        ...(data.agreedPrice !== undefined && { agreedPrice: data.agreedPrice }),
        ...(data.totalCommission !== undefined && { totalCommission: data.totalCommission }),
        ...(data.commissionRate !== undefined && { commissionRate: data.commissionRate }),
        ...(data.commissionSplit !== undefined && {
          commissionSplit: (data.commissionSplit ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        }),
        ...(data.depositAmount !== undefined && { depositAmount: data.depositAmount }),
        ...(data.depositDate !== undefined && { depositDate: data.depositDate }),
        ...(data.listingAgentSplit !== undefined && { listingAgentSplit: data.listingAgentSplit }),
        ...(data.buyerAgentSplit !== undefined && { buyerAgentSplit: data.buyerAgentSplit }),
        ...(data.monthlyRentAmount !== undefined && { monthlyRentAmount: data.monthlyRentAmount }),
        ...(data.securityDeposit !== undefined && { securityDeposit: data.securityDeposit }),
        ...(data.leaseStartDate !== undefined && { leaseStartDate: data.leaseStartDate }),
        ...(data.leaseEndDate !== undefined && { leaseEndDate: data.leaseEndDate }),
        ...(data.leaseDurationMonths !== undefined && { leaseDurationMonths: data.leaseDurationMonths }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.fallenThroughReason !== undefined && { fallenThroughReason: data.fallenThroughReason }),
        ...(data.contractDate !== undefined && { contractDate: data.contractDate }),
        ...(data.closedAt !== undefined && { closedAt: data.closedAt }),
      },
    });

    revalidatePath("/deals");
    revalidatePath(`/deals/${deal.friendlyId}`);
    return actionSuccess(serializeDealForClient(deal));
  } catch (error) {
    console.error("[DEAL_UPDATE]", error);
    return actionError("Failed to update deal");
  }
}

/**
 * Soft-delete a deal.
 */
export async function deleteDeal(
  dealId: string
): Promise<ActionResponse<{ id: string }>> {
  const guard = await requireAction("deal:delete");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  const deal = await prismadb.deal.findFirst({
    where: { id: dealId, organizationId },
    select: { id: true },
  });
  if (!deal) return actionNotFound("Deal");

  try {
    await prismadb.deal.update({
      where: { id: dealId },
      data: { deletedAt: new Date() },
    });

    revalidatePath("/deals");
    return actionSuccess({ id: dealId });
  } catch (error) {
    console.error("[DEAL_DELETE]", error);
    return actionError("Failed to delete deal");
  }
}

// ============================================
// Stage Pipeline
// ============================================

/**
 * Advance a deal through the 10-stage Greek RE pipeline.
 * Creates an immutable DealStageLog entry for audit trail.
 */
export async function advanceDealStage(
  input: unknown
): Promise<ActionResponse<Deal>> {
  const guard = await requireAction("deal:advance_stage");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const currentUser = await getCurrentUser();

  const validation = advanceDealStageSchema.safeParse(input);
  if (!validation.success) {
    return actionValidationError(
      "Validation failed",
      validation.error.flatten().fieldErrors
    );
  }

  const { dealId, toStage, notes } = validation.data;

  const deal = await prismadb.deal.findFirst({
    where: { id: dealId, organizationId },
    select: { id: true, stage: true },
  });
  if (!deal) return actionNotFound("Deal");

  // Validate the transition
  if (!isValidDealStageTransition(deal.stage, toStage)) {
    return actionError(getDealStageTransitionError(deal.stage, toStage));
  }

  try {
    // Use a transaction: update stage + create log atomically
    const [updated] = await prismadb.$transaction([
      prismadb.deal.update({
        where: { id: dealId },
        data: {
          stage: toStage,
          ...(toStage === "COMPLETED" && { closedAt: new Date() }),
          ...(toStage === "FALLEN_THROUGH" && {
            fallenThroughReason: notes ?? null,
          }),
        },
      }),
      prismadb.dealStageLog.create({
        data: {
          dealId,
          fromStage: deal.stage,
          toStage,
          changedBy: currentUser.id,
          notes: notes ?? null,
        },
      }),
    ]);

    // Fire-and-forget: non-fatal changelog entry for unified activity feed
    void createChangeLogEntry({
      organizationId,
      entityType: "DEAL",
      entityId: dealId,
      eventType: "STAGE_CHANGED",
      actorUserId: currentUser.id,
      stageTransition: {
        fromStage: deal.stage,
        toStage,
        notes: notes ?? undefined,
      },
    });

    revalidatePath("/deals");
    revalidatePath(`/deals/${dealId}`);
    return actionSuccess(serializeDealForClient(updated));
  } catch (error) {
    console.error("[DEAL_ADVANCE_STAGE]", error);
    return actionError("Failed to advance deal stage");
  }
}

// ============================================
// Deal Party Management
// ============================================

/**
 * Add a contact as a party to a deal.
 */
export async function addDealParty(
  input: unknown
): Promise<ActionResponse<DealParty>> {
  const guard = await requireAction("deal:manage_parties");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  const validation = dealPartySchema.safeParse(input);
  if (!validation.success) {
    return actionValidationError(
      "Validation failed",
      validation.error.flatten().fieldErrors
    );
  }

  const { dealId, contactId, role, notes } = validation.data;

  // Validate deal + contact belong to org
  const [deal, contact] = await Promise.all([
    prismadb.deal.findFirst({
      where: { id: dealId, organizationId },
      select: { id: true },
    }),
    prismadb.contact.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true },
    }),
  ]);
  if (!deal) return actionNotFound("Deal");
  if (!contact) return actionNotFound("Contact");

  try {
    const party = await prismadb.dealParty.create({
      data: {
        organizationId,
        dealId,
        contactId,
        role,
        notes: notes ?? null,
      },
    });

    revalidatePath(`/deals/${dealId}`);
    return actionSuccess(party);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return actionError("This contact already has this role in the deal");
    }
    console.error("[DEAL_PARTY_ADD]", error);
    return actionError("Failed to add deal party");
  }
}

/**
 * Remove a party from a deal.
 */
export async function removeDealParty(
  partyId: string
): Promise<ActionResponse<{ id: string }>> {
  const guard = await requireAction("deal:manage_parties");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  const party = await prismadb.dealParty.findFirst({
    where: { id: partyId, organizationId },
    select: { id: true, dealId: true },
  });
  if (!party) return actionNotFound("Deal party");

  try {
    await prismadb.dealParty.delete({ where: { id: partyId } });
    revalidatePath(`/deals/${party.dealId}`);
    return actionSuccess({ id: partyId });
  } catch (error) {
    console.error("[DEAL_PARTY_REMOVE]", error);
    return actionError("Failed to remove deal party");
  }
}

// ============================================
// Read Operations
// ============================================

/**
 * Get all deals for the current org, with optional stage filter.
 */
export async function getDeals(params?: unknown) {
  const guard = await requireAction("deal:read");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const currentUser = await getCurrentUser();

  const parsed = dealQuerySchema.safeParse(params ?? {});
  const filters = parsed.success ? parsed.data : {};

  const where: Prisma.DealWhereInput = { organizationId, deletedAt: null };
  if (filters?.includeDeleted === "true") {
    delete (where as any).deletedAt;
  }
  if (filters.stage) where.stage = filters.stage;
  if (filters.dealType) where.dealType = filters.dealType;
  if (filters.propertyId) where.propertyId = filters.propertyId;
  if (filters.contactId) {
    where.dealParties = { some: { contactId: filters.contactId } };
  }
  if (filters.search) {
    const term = filters.search.trim();
    where.OR = [
      { friendlyId: { contains: term, mode: "insensitive" } },
      { title: { contains: term, mode: "insensitive" } },
    ];
  }

  try {
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
        _count: {
          select: { stageLogs: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: filters.limit ?? 50,
    });

    return actionSuccess(
      deals.map((d) =>
        serializeDealForClient({
          ...d,
          isListingAgent: d.listingAgentId === currentUser.id,
          isBuyerAgent: d.buyerAgentId === currentUser.id,
        })
      )
    );
  } catch (error) {
    console.error("[DEAL_LIST]", error);
    return actionError("Failed to fetch deals");
  }
}

/**
 * Get a single deal by ID or friendlyId.
 */
export async function getDeal(
  dealId: string
): Promise<ActionResponse<any>> {
  const guard = await requireAction("deal:read");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const currentUser = await getCurrentUser();

  const isFriendlyId = dealId.startsWith("deal-");
  const deal = await prismadb.deal.findFirst({
    where: {
      ...(isFriendlyId ? { friendlyId: dealId } : { id: dealId }),
      organizationId,
    },
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
          friendlyId: true,
          displayName: true,
          email: true,
          primaryPhone: true,
        },
      },
      listingAgent: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          AgentProfile: { select: { slug: true, publicPhone: true } },
        },
      },
      buyerAgent: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          AgentProfile: { select: { slug: true, publicPhone: true } },
        },
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
      },
    },
  });

  if (!deal) return actionNotFound("Deal");

  return actionSuccess(
    serializeDealForClient({
      ...deal,
      isListingAgent: deal.listingAgentId === currentUser.id,
      isBuyerAgent: deal.buyerAgentId === currentUser.id,
      isProposer: deal.proposedById === currentUser.id,
    })
  );
}

/**
 * Get the stage log (audit trail) for a deal.
 */
export async function getDealStageLogs(
  dealId: string
): Promise<ActionResponse<DealStageLog[]>> {
  const guard = await requireAction("deal:read");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  const deal = await prismadb.deal.findFirst({
    where: { id: dealId, organizationId },
    select: { id: true },
  });
  if (!deal) return actionNotFound("Deal");

  const logs = await prismadb.dealStageLog.findMany({
    where: { dealId },
    orderBy: { changedAt: "desc" },
  });

  return actionSuccess(logs);
}

/**
 * Get deal parties for a deal.
 */
export async function getDealParties(
  dealId: string
): Promise<ActionResponse<any[]>> {
  const guard = await requireAction("deal:read");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  const deal = await prismadb.deal.findFirst({
    where: { id: dealId, organizationId },
    select: { id: true },
  });
  if (!deal) return actionNotFound("Deal");

  const parties = await prismadb.dealParty.findMany({
    where: { dealId },
    include: {
      contact: {
        select: {
          id: true,
          friendlyId: true,
          displayName: true,
          email: true,
          primaryPhone: true,
          category: true,
          isCompany: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return actionSuccess(parties);
}

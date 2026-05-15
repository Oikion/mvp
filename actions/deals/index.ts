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
  isValidDealStageManualSet,
} from "@/lib/validations/status-transitions";
import type { Deal, DealParty, DealStage, DealStageLog } from "@prisma/client";
import { serializeDealForClient } from "@/lib/deals/serialize";
import { createChangeLogEntry } from "@/lib/entity-change-log";
import { decryptContactForOrg } from "@/lib/model-encryption";
import {
  logEntityCreated,
  logEntityUpdated,
  logEntityLinked,
  logEntityLinkedSymmetric,
  logEntityUnlinkedSymmetric,
  logStageChanged,
  type FieldChange,
} from "@/lib/activity-logger";
import { notifyDealStageChanged } from "@/lib/notifications/helpers";
import { notifyOrganization } from "@/lib/notifications/notification-service";

// Safelist of non-encrypted Deal fields tracked by activity logging.
// Keep in sync with the Activity Log spec.
const DEAL_TRACKED_FIELDS = [
  "stage",
  "dealValue",
  "expectedCloseDate",
  "assignedToUserId",
  "propertyId",
  "requestId",
] as const;

type DealTrackedField = (typeof DEAL_TRACKED_FIELDS)[number];

function diffDealFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const field of DEAL_TRACKED_FIELDS) {
    const oldVal = before[field as DealTrackedField];
    const newVal = after[field as DealTrackedField];
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
    select: { id: true, property_name: true, friendlyId: true },
  });
  if (!property) return actionNotFound("Property");

  // Validate optional references
  let requestRef: { id: string; friendlyId: string | null } | null = null;
  if (data.requestId) {
    const request = await prismadb.request.findFirst({
      where: { id: data.requestId, organizationId },
      select: { id: true, friendlyId: true },
    });
    if (!request) return actionNotFound("Request");
    requestRef = request;
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
          fromStage: initialStage,
          toStage: initialStage,
          changedBy: currentUser.id,
          notes: "Deal created",
        },
      });

      return created;
    });

    // Activity logging — fire-and-forget AFTER the transaction commits.
    // Never await; failures must not affect the create response.
    void logEntityCreated({
      organizationId,
      parentType: "DEAL",
      parentId: deal.id,
      createdByUserId: currentUser?.id,
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
        createdByUserId: currentUser?.id,
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
        createdByUserId: currentUser?.id,
      });
    }

    void notifyOrganization(
      organizationId,
      currentUser.id, // exclude actor
      "DEAL_PROPOSED",
      "New deal proposed",
      `${currentUser.name ?? "Someone"} proposed a deal for ${property.property_name ?? "a property"}`,
      {
        entityType: "DEAL",
        entityId: deal.id,
        actorId: currentUser.id,
        actorName: currentUser.name ?? undefined,
        metadata: { dealTitle: deal.title, propertyName: property.property_name },
      }
    ).catch((err) => console.error("[DEAL_CREATE_NOTIFY]", err));

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
  const currentUser = await getCurrentUser();

  const validation = updateDealSchema.safeParse(input);
  if (!validation.success) {
    return actionValidationError(
      "Validation failed",
      validation.error.flatten().fieldErrors
    );
  }

  const { id, ...data } = validation.data;

  // TOCTOU-safe: always include organizationId in where.
  // Select the safelist of tracked fields so we can diff post-update.
  // Note: of the spec safelist [stage, dealValue, expectedCloseDate,
  // assignedToUserId, propertyId, requestId] only stage / propertyId /
  // requestId exist on the Deal model today; the others are reserved for
  // future schema extensions and will simply produce no diff entries.
  const existing = await prismadb.deal.findFirst({
    where: { id, organizationId },
    select: {
      id: true,
      listingAgentId: true,
      stage: true,
      propertyId: true,
      requestId: true,
    },
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

    // Activity logging — diff the safelist and emit UPDATED if any changed.
    // Fire-and-forget; never block the update response.
    const changes = diffDealFields(
      existing as Record<string, unknown>,
      deal as Record<string, unknown>
    );
    if (changes.length > 0) {
      void logEntityUpdated({
        organizationId,
        parentType: "DEAL",
        parentId: deal.id,
        createdByUserId: currentUser?.id,
        changes,
      });
    }

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
    select: { id: true, stage: true, title: true, listingAgentId: true, buyerAgentId: true, friendlyId: true },
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

    // Additional Activity-Log emission — runs alongside EntityChangeLog so
    // both the legacy changelog and the new Activity feed stay populated.
    void logStageChanged({
      organizationId,
      dealId,
      fromStage: deal.stage,
      toStage,
      notes: notes ?? undefined,
      changedByUserId: currentUser?.id,
    });

    void notifyDealStageChanged({
      dealId,
      dealTitle: deal.title ?? deal.friendlyId ?? dealId,
      fromStage: deal.stage,
      toStage,
      organizationId,
      actorId: currentUser.id,
      actorName: currentUser.name ?? currentUser.email ?? "Someone",
      listingAgentId: deal.listingAgentId,
      buyerAgentId: deal.buyerAgentId,
    }).catch((err) => console.error("[DEAL_ADVANCE_STAGE_NOTIFY]", err));

    revalidatePath("/deals");
    revalidatePath(`/deals/${dealId}`);
    return actionSuccess(serializeDealForClient(updated));
  } catch (error) {
    console.error("[DEAL_ADVANCE_STAGE]", error);
    return actionError("Failed to advance deal stage");
  }
}

/**
 * Manually set a deal to any non-terminal stage (free traversal).
 *
 * Unlike `advanceDealStage`, this action allows jumping to ANY non-terminal stage —
 * forward OR backward — enabling agents to correct mistakes or reflect real-world
 * deal state. Terminal stages (COMPLETED, FALLEN_THROUGH) are blocked; use the
 * dedicated paths for those.
 *
 * Creates a `DealStageLog` entry atomically and fires a changelog event.
 */
export async function setDealStage(
  dealId: string,
  toStage: DealStage,
  notes?: string
): Promise<ActionResponse<Deal>> {
  const guard = await requireAction("deal:advance_stage");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const currentUser = await getCurrentUser();

  const deal = await prismadb.deal.findFirst({
    where: { id: dealId, organizationId },
    select: { id: true, stage: true, title: true, listingAgentId: true, buyerAgentId: true, friendlyId: true },
  });
  if (!deal) return actionNotFound("Deal");

  if (!isValidDealStageManualSet(deal.stage, toStage)) {
    if (toStage === "COMPLETED" || toStage === "FALLEN_THROUGH") {
      return actionError(
        `Cannot manually set deal to "${toStage}". Use the dedicated action for terminal stages.`
      );
    }
    return actionError(
      `Deal is in a terminal stage and cannot be moved.`
    );
  }

  // No-op if already at the target stage
  if (deal.stage === toStage) {
    const current = await prismadb.deal.findUniqueOrThrow({
      where: { id: deal.id },
    });
    return actionSuccess(serializeDealForClient(current));
  }

  const trimmedNotes = notes?.trim() || undefined;

  try {
    const [updated] = await prismadb.$transaction([
      prismadb.deal.update({
        where: { id: deal.id },
        data: { stage: toStage },
      }),
      prismadb.dealStageLog.create({
        data: {
          dealId: deal.id,
          fromStage: deal.stage,
          toStage,
          changedBy: currentUser.id,
          notes: trimmedNotes ?? null,
        },
      }),
    ]);

    void createChangeLogEntry({
      organizationId,
      entityType: "DEAL",
      entityId: deal.id,
      eventType: "STAGE_CHANGED",
      actorUserId: currentUser.id,
      stageTransition: {
        fromStage: deal.stage,
        toStage,
        notes: trimmedNotes,
      },
    });

    // Additional Activity-Log emission. The no-op short-circuit above
    // guarantees deal.stage !== toStage by the time we reach this point.
    void logStageChanged({
      organizationId,
      dealId: deal.id,
      fromStage: deal.stage,
      toStage,
      notes: trimmedNotes,
      changedByUserId: currentUser?.id,
    });

    void notifyDealStageChanged({
      dealId: deal.id,
      dealTitle: deal.title ?? deal.friendlyId ?? deal.id,
      fromStage: deal.stage,
      toStage,
      organizationId,
      actorId: currentUser.id,
      actorName: currentUser.name ?? currentUser.email ?? "Someone",
      listingAgentId: deal.listingAgentId,
      buyerAgentId: deal.buyerAgentId,
    }).catch((err) => console.error("[DEAL_SET_STAGE_NOTIFY]", err));

    revalidatePath("/deals");
    revalidatePath(`/deals/${deal.friendlyId}`);
    return actionSuccess(serializeDealForClient(updated));
  } catch (error) {
    console.error("[DEAL_SET_STAGE]", error);
    return actionError("Failed to set deal stage");
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
  const currentUser = await getCurrentUser();

  // Validate deal + contact belong to org. Selectors widened so we have
  // labels for the symmetric activity-log entry without an extra round-trip.
  const [deal, contact] = await Promise.all([
    prismadb.deal.findFirst({
      where: { id: dealId, organizationId },
      select: { id: true, title: true },
    }),
    prismadb.contact.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true, displayName: true, friendlyId: true },
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

    // Activity logging — bilateral LINKED entry on both DEAL and CONTACT.
    void logEntityLinkedSymmetric({
      organizationId,
      aType: "DEAL",
      aId: dealId,
      aLabel: deal.title ?? "Deal",
      aUrl: `/app/deals/${dealId}`,
      bType: "CONTACT",
      bId: contactId,
      bLabel: contact.displayName ?? "Contact",
      bUrl: `/app/crm/contacts/${contact.friendlyId ?? contactId}`,
      createdByUserId: currentUser?.id,
    });

    // Notify the deal's agents that a new party was added
    void notifyOrganization(
      organizationId,
      currentUser.id,
      "DEAL_UPDATED",
      "Deal party added",
      `${currentUser.name ?? "Someone"} added ${contact.displayName ?? "a contact"} as a party to deal "${deal.title ?? "a deal"}"`,
      {
        entityType: "DEAL",
        entityId: dealId,
        actorId: currentUser.id,
        actorName: currentUser.name ?? undefined,
        metadata: { contactName: contact.displayName, role },
      }
    ).catch((err) => console.error("[DEAL_PARTY_NOTIFY]", err));

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
  const currentUser = await getCurrentUser();

  // Selector widened to include contact info + deal title so we can emit
  // a symmetric UNLINKED activity entry without an additional round-trip.
  const party = await prismadb.dealParty.findFirst({
    where: { id: partyId, organizationId },
    select: {
      id: true,
      dealId: true,
      contactId: true,
      contact: { select: { displayName: true, friendlyId: true } },
      deal: { select: { title: true } },
    },
  });
  if (!party) return actionNotFound("Deal party");

  try {
    await prismadb.dealParty.delete({ where: { id: partyId } });

    // Activity logging — bilateral UNLINKED on both DEAL and CONTACT.
    void logEntityUnlinkedSymmetric({
      organizationId,
      aType: "DEAL",
      aId: party.dealId,
      aLabel: party.deal?.title ?? "Deal",
      aUrl: `/app/deals/${party.dealId}`,
      bType: "CONTACT",
      bId: party.contactId,
      bLabel: party.contact?.displayName ?? "Contact",
      bUrl: `/app/crm/contacts/${party.contact?.friendlyId ?? party.contactId}`,
      createdByUserId: currentUser?.id,
    });

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

  const where: Prisma.DealWhereInput = { organizationId, deletedAt: null, archivedAt: null };
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
          name: true,
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

  // Decrypt encrypted contact fields that Prisma returns raw from the DB
  const [decryptedParties, decryptedNotary] = await Promise.all([
    Promise.all(
      deal.dealParties.map(async (party) => ({
        ...party,
        contact: party.contact
          ? await decryptContactForOrg(party.contact, organizationId)
          : null,
      }))
    ),
    deal.notaryContact
      ? decryptContactForOrg(deal.notaryContact, organizationId)
      : null,
  ]);

  return actionSuccess(
    serializeDealForClient({
      ...deal,
      dealParties: decryptedParties,
      notaryContact: decryptedNotary,
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

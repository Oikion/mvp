"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";
import { DealStatus } from "@prisma/client";
import { generateFriendlyId } from "@/lib/friendly-id";

export interface CreateDealInput {
  propertyId: string;
  clientId: string;
  propertyAgentId: string;
  clientAgentId: string;
  propertyAgentSplit?: number; // Percentage (0-100)
  clientAgentSplit?: number; // Percentage (0-100)
  totalCommission?: number;
  commissionCurrency?: string;
  title?: string;
  notes?: string;
}

export interface UpdateDealInput {
  propertyAgentSplit?: number;
  clientAgentSplit?: number;
  totalCommission?: number;
  title?: string;
  notes?: string;
  status?: DealStatus;
}

/**
 * Create a new deal proposal
 */
export async function createDeal(input: CreateDealInput) {
  const currentUser = await getCurrentUser();

  // Validate that the agents exist
  const [propertyAgent, clientAgent] = await Promise.all([
    prismadb.users.findUnique({ where: { id: input.propertyAgentId } }),
    prismadb.users.findUnique({ where: { id: input.clientAgentId } }),
  ]);

  if (!propertyAgent || !clientAgent) {
    throw new Error("One or both agents not found");
  }

  // Validate that property and client exist
  const [property, client] = await Promise.all([
    prismadb.properties.findUnique({ where: { id: input.propertyId } }),
    prismadb.clients.findUnique({ where: { id: input.clientId } }),
  ]);

  if (!property) {
    throw new Error("Property not found");
  }

  if (!client) {
    throw new Error("Client not found");
  }

  // Validate split percentages
  const propertyAgentSplit = input.propertyAgentSplit ?? 50;
  const clientAgentSplit = input.clientAgentSplit ?? 50;

  if (propertyAgentSplit + clientAgentSplit !== 100) {
    throw new Error("Commission split must sum to 100%");
  }

  if (propertyAgentSplit < 0 || clientAgentSplit < 0) {
    throw new Error("Commission split cannot be negative");
  }

  // The current user must be one of the agents
  if (
    currentUser.id !== input.propertyAgentId &&
    currentUser.id !== input.clientAgentId
  ) {
    throw new Error("You must be one of the agents in this deal");
  }

  // Generate friendly ID
  const dealId = await generateFriendlyId(prismadb, "Deal");

  const deal = await prismadb.deal.create({
    data: {
      id: dealId,
      propertyId: input.propertyId,
      clientId: input.clientId,
      propertyAgentId: input.propertyAgentId,
      clientAgentId: input.clientAgentId,
      propertyAgentSplit: propertyAgentSplit,
      clientAgentSplit: clientAgentSplit,
      totalCommission: input.totalCommission || null,
      commissionCurrency: input.commissionCurrency || "EUR",
      proposedById: currentUser.id,
      title: input.title || `Deal: ${property.property_name}`,
      notes: input.notes,
      status: "PROPOSED",
      updatedAt: new Date(),
    },
  });

  revalidatePath("/deals");
  return deal;
}

/**
 * Update a deal (negotiate split, change status, etc.)
 */
export async function updateDeal(dealId: string, input: UpdateDealInput) {
  const currentUser = await getCurrentUser();

  const deal = await prismadb.deal.findUnique({
    where: { id: dealId },
  });

  if (!deal) {
    throw new Error("Deal not found");
  }

  // Only agents involved can update the deal
  if (
    deal.propertyAgentId !== currentUser.id &&
    deal.clientAgentId !== currentUser.id
  ) {
    throw new Error("You are not part of this deal");
  }

  // Validate split if being updated
  if (input.propertyAgentSplit !== undefined || input.clientAgentSplit !== undefined) {
    const propertyAgentSplit =
      input.propertyAgentSplit ?? Number(deal.propertyAgentSplit);
    const clientAgentSplit =
      input.clientAgentSplit ?? Number(deal.clientAgentSplit);

    if (propertyAgentSplit + clientAgentSplit !== 100) {
      throw new Error("Commission split must sum to 100%");
    }
  }

  // Handle status transitions
  if (input.status) {
    const validTransitions: Record<DealStatus, DealStatus[]> = {
      PROPOSED: ["NEGOTIATING", "ACCEPTED", "CANCELLED"],
      NEGOTIATING: ["ACCEPTED", "CANCELLED"],
      ACCEPTED: ["IN_PROGRESS", "CANCELLED"],
      IN_PROGRESS: ["COMPLETED", "CANCELLED"],
      COMPLETED: [],
      CANCELLED: [],
    };

    if (!validTransitions[deal.status].includes(input.status)) {
      throw new Error(
        `Cannot transition from ${deal.status} to ${input.status}`
      );
    }
  }

  const updated = await prismadb.deal.update({
    where: { id: dealId },
    data: {
      ...(input.propertyAgentSplit !== undefined && {
        propertyAgentSplit: input.propertyAgentSplit,
      }),
      ...(input.clientAgentSplit !== undefined && {
        clientAgentSplit: input.clientAgentSplit,
      }),
      ...(input.totalCommission !== undefined && {
        totalCommission: input.totalCommission,
      }),
      ...(input.title && { title: input.title }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.status && {
        status: input.status,
        ...(input.status === "COMPLETED" && { closedAt: new Date() }),
      }),
    },
  });

  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  return updated;
}

/**
 * Accept a deal proposal (changes status to ACCEPTED)
 */
export async function acceptDeal(dealId: string) {
  const currentUser = await getCurrentUser();

  const deal = await prismadb.deal.findUnique({
    where: { id: dealId },
  });

  if (!deal) {
    throw new Error("Deal not found");
  }

  // Only the other agent (not the proposer) can accept
  if (deal.proposedById === currentUser.id) {
    throw new Error("You cannot accept your own proposal");
  }

  if (
    deal.propertyAgentId !== currentUser.id &&
    deal.clientAgentId !== currentUser.id
  ) {
    throw new Error("You are not part of this deal");
  }

  if (deal.status !== "PROPOSED" && deal.status !== "NEGOTIATING") {
    throw new Error("This deal cannot be accepted in its current state");
  }

  return updateDeal(dealId, { status: "ACCEPTED" });
}

/**
 * Propose new terms (changes status to NEGOTIATING)
 */
export async function proposeDealTerms(
  dealId: string,
  propertyAgentSplit: number,
  clientAgentSplit: number
) {
  const currentUser = await getCurrentUser();

  const deal = await prismadb.deal.findUnique({
    where: { id: dealId },
  });

  if (!deal) {
    throw new Error("Deal not found");
  }

  if (
    deal.propertyAgentId !== currentUser.id &&
    deal.clientAgentId !== currentUser.id
  ) {
    throw new Error("You are not part of this deal");
  }

  if (deal.status !== "PROPOSED" && deal.status !== "NEGOTIATING") {
    throw new Error("Cannot negotiate in the current state");
  }

  return updateDeal(dealId, {
    propertyAgentSplit,
    clientAgentSplit,
    status: "NEGOTIATING",
  });
}

/**
 * Cancel a deal
 */
export async function cancelDeal(dealId: string) {
  const currentUser = await getCurrentUser();

  const deal = await prismadb.deal.findUnique({
    where: { id: dealId },
  });

  if (!deal) {
    throw new Error("Deal not found");
  }

  if (
    deal.propertyAgentId !== currentUser.id &&
    deal.clientAgentId !== currentUser.id
  ) {
    throw new Error("You are not part of this deal");
  }

  if (deal.status === "COMPLETED") {
    throw new Error("Cannot cancel a completed deal");
  }

  return updateDeal(dealId, { status: "CANCELLED" });
}

/**
 * Complete a deal
 */
export async function completeDeal(dealId: string, totalCommission?: number) {
  const currentUser = await getCurrentUser();

  const deal = await prismadb.deal.findUnique({
    where: { id: dealId },
  });

  if (!deal) {
    throw new Error("Deal not found");
  }

  if (
    deal.propertyAgentId !== currentUser.id &&
    deal.clientAgentId !== currentUser.id
  ) {
    throw new Error("You are not part of this deal");
  }

  if (deal.status !== "ACCEPTED" && deal.status !== "IN_PROGRESS") {
    throw new Error("Deal must be accepted or in progress to complete");
  }

  return updateDeal(dealId, {
    status: "COMPLETED",
    ...(totalCommission && { totalCommission }),
  });
}

/**
 * Get all my deals
 */
export async function getMyDeals(status?: DealStatus) {
  const currentUser = await getCurrentUser();

  const dealsRaw = await prismadb.deal.findMany({
    where: {
      OR: [
        { propertyAgentId: currentUser.id },
        { clientAgentId: currentUser.id },
      ],
      ...(status && { status }),
    },
    include: {
      Properties: {
        select: {
          id: true,
          property_name: true,
          property_type: true,
          price: true,
          address_city: true,
          Documents: {
            where: {
              document_file_mimeType: { startsWith: "image/" },
            },
            select: { document_file_url: true },
            take: 1,
          },
        },
      },
      Clients: {
        select: {
          id: true,
          client_name: true,
          primary_email: true,
          intent: true,
        },
      },
      Users_Deal_propertyAgentIdToUsers: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
      Users_Deal_clientAgentIdToUsers: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return dealsRaw.map((deal) => ({
    ...deal,
    property: deal.Properties ? {
      ...deal.Properties,
      linkedDocuments: deal.Properties.Documents,
    } : null,
    client: deal.Clients,
    propertyAgent: deal.Users_Deal_propertyAgentIdToUsers,
    clientAgent: deal.Users_Deal_clientAgentIdToUsers,
    isPropertyAgent: deal.propertyAgentId === currentUser.id,
    isProposer: deal.proposedById === currentUser.id,
  }));
}

/**
 * Get a single deal
 */
export async function getDeal(dealId: string) {
  const currentUser = await getCurrentUser();

  const dealRaw = await prismadb.deal.findUnique({
    where: { id: dealId },
    include: {
      Properties: {
        select: {
          id: true,
          property_name: true,
          property_type: true,
          price: true,
          address_city: true,
          address_state: true,
          bedrooms: true,
          bathrooms: true,
          size_net_sqm: true,
          square_feet: true,
          description: true,
          Documents: {
            where: {
              document_file_mimeType: { startsWith: "image/" },
            },
            select: { document_file_url: true },
            take: 5,
          },
        },
      },
      Clients: {
        select: {
          id: true,
          client_name: true,
          primary_email: true,
          primary_phone: true,
          intent: true,
          client_status: true,
        },
      },
      Users_Deal_propertyAgentIdToUsers: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          AgentProfile: {
            select: {
              slug: true,
              publicPhone: true,
            },
          },
        },
      },
      Users_Deal_clientAgentIdToUsers: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          AgentProfile: {
            select: {
              slug: true,
              publicPhone: true,
            },
          },
        },
      },
    },
  });

  if (!dealRaw) {
    return null;
  }

  // Map to expected field names
  const deal = {
    ...dealRaw,
    property: dealRaw.Properties ? {
      ...dealRaw.Properties,
      linkedDocuments: dealRaw.Properties.Documents,
    } : null,
    client: dealRaw.Clients,
    propertyAgent: dealRaw.Users_Deal_propertyAgentIdToUsers ? {
      ...dealRaw.Users_Deal_propertyAgentIdToUsers,
      agentProfile: dealRaw.Users_Deal_propertyAgentIdToUsers.AgentProfile,
    } : null,
    clientAgent: dealRaw.Users_Deal_clientAgentIdToUsers ? {
      ...dealRaw.Users_Deal_clientAgentIdToUsers,
      agentProfile: dealRaw.Users_Deal_clientAgentIdToUsers.AgentProfile,
    } : null,
  };

  // Check authorization
  if (
    deal.propertyAgentId !== currentUser.id &&
    deal.clientAgentId !== currentUser.id
  ) {
    throw new Error("You are not part of this deal");
  }

  return {
    ...deal,
    isPropertyAgent: deal.propertyAgentId === currentUser.id,
    isProposer: deal.proposedById === currentUser.id,
  };
}

// Note: calculateCommissionSplit utility function moved to lib/deal-utils.ts
// Import it from there: import { calculateCommissionSplit } from "@/lib/deal-utils";


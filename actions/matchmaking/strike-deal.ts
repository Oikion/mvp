"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import {
  actionSuccess,
  actionError,
  actionNotFound,
  actionValidationError,
  type ActionResponse,
} from "@/lib/action-response";
import { generateFriendlyId } from "@/lib/friendly-id";
import { z } from "zod";
import type { Deal } from "@prisma/client";
import {
  logEntityCreated,
  logEntityLinked,
} from "@/lib/activity-logger";

const strikeDealSchema = z
  .object({
    propertyId: z.string().min(1),
    requestId: z.string().min(1),
    parties: z
      .array(
        z.object({
          contactId: z.string().min(1),
          role: z.enum([
            "BUYER",
            "SELLER",
            "TENANT",
            "LANDLORD",
            "BUYER_AGENT",
            "LISTING_AGENT",
            "NOTARY",
            "LAWYER",
            "ACCOUNTANT",
            "GUARANTOR",
            "REPRESENTATIVE",
            "OTHER",
          ]),
        })
      )
      .min(1, "At least one party is required"),
  })
  .strict();

export type StrikeDealInput = z.infer<typeof strikeDealSchema>;

export async function strikeDeal(
  input: unknown
): Promise<ActionResponse<{ deal: Deal; friendlyId: string }>> {
  const guard1 = await requireAction("deal:create");
  if (guard1) return guard1;
  const guard2 = await requireAction("deal:manage_parties");
  if (guard2) return guard2;

  const organizationId = await getCurrentOrgId();
  const currentUser = await getCurrentUser();

  const validation = strikeDealSchema.safeParse(input);
  if (!validation.success) {
    return actionValidationError(
      "Validation failed",
      validation.error.flatten().fieldErrors
    );
  }

  const { propertyId, requestId, parties } = validation.data;

  // SECURITY: Validate property belongs to the org. Selector widened with
  // friendlyId so we can build the activity-log target URL without a second
  // round-trip after the transaction commits.
  const property = await prismadb.properties.findFirst({
    where: { id: propertyId, organizationId },
    select: { id: true, property_name: true, friendlyId: true },
  });
  if (!property) return actionNotFound("Property");

  // SECURITY: Validate request belongs to the org
  const request = await prismadb.request.findFirst({
    where: { id: requestId, organizationId },
    select: { id: true, friendlyId: true },
  });
  if (!request) return actionNotFound("Request");

  // SECURITY: Validate all contacts belong to the org (batch check)
  const contactIds = parties.map((p) => p.contactId);
  const contacts = await prismadb.contact.findMany({
    where: { id: { in: contactIds }, organizationId },
    select: { id: true },
  });
  if (contacts.length !== contactIds.length) {
    return actionError("One or more contacts not found", "NOT_FOUND");
  }

  try {
    const friendlyId = await generateFriendlyId(prismadb, "Deal", organizationId);

    const result = await prismadb.$transaction(async (tx) => {
      const deal = await tx.deal.create({
        data: {
          friendlyId,
          organizationId,
          propertyId,
          requestId,
          stage: "INTEREST",
          proposedById: currentUser.id,
          title: property.property_name
            ? `Deal: ${property.property_name}`
            : `Deal: ${friendlyId}`,
          status: "PROPOSED",
        },
      });

      // Initial stage log — anchors the audit trail for this deal
      await tx.dealStageLog.create({
        data: {
          dealId: deal.id,
          fromStage: "INTEREST",
          toStage: "INTEREST",
          changedBy: currentUser.id,
          notes: "Deal created via matchmaking",
        },
      });

      await tx.dealParty.createMany({
        data: parties.map((p) => ({
          dealId: deal.id,
          organizationId,
          contactId: p.contactId,
          role: p.role,
        })),
        skipDuplicates: true,
      });

      return deal;
    });

    // Activity logging — fire-and-forget AFTER the transaction commits.
    // Reminder: Matchmaking "Matches" itself is a separate module and must
    // NOT appear in the Activity Log; we only log the resulting Deal create
    // and its property/request links here.
    void logEntityCreated({
      organizationId,
      parentType: "DEAL",
      parentId: result.id,
      createdByUserId: currentUser?.id,
      source: "manual",
    });

    void logEntityLinked({
      organizationId,
      fromType: "DEAL",
      fromId: result.id,
      toType: "PROPERTY",
      toId: propertyId,
      toLabel: property.property_name ?? "Property",
      toUrl: `/app/mls/properties/${property.friendlyId ?? property.id}`,
      createdByUserId: currentUser?.id,
    });

    void logEntityLinked({
      organizationId,
      fromType: "DEAL",
      fromId: result.id,
      toType: "REQUEST",
      toId: requestId,
      toLabel: "Request",
      toUrl: `/app/requests/${request.friendlyId ?? request.id}`,
      createdByUserId: currentUser?.id,
    });

    return actionSuccess({ deal: result, friendlyId: result.friendlyId ?? result.id });
  } catch (error) {
    console.error("[STRIKE_DEAL]", error);
    return actionError("Failed to create deal");
  }
}

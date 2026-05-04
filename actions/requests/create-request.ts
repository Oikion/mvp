"use server";

import { Prisma } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import { encryptRequestForOrg } from "@/lib/model-encryption";
import { generateFriendlyId } from "@/lib/friendly-id";
import { createRequestSchema, type CreateRequestInput } from "@/lib/validations/requests";
import { actionSuccess, actionError, actionValidationError, type ActionResponse } from "@/lib/action-response";
import { revalidatePath } from "next/cache";
import { logEntityCreated, logEntityLinkedSymmetric } from "@/lib/activity-logger";

/**
 * Creates a new request in the current organization.
 * Encrypts sensitive fields and generates a friendly ID.
 * If contactId is provided, a RequestContact link is created automatically.
 */
export async function createRequest(
  input: CreateRequestInput & { contactId?: string }
): Promise<ActionResponse<{ id: string; friendlyId: string }>> {
  const guard = await requireAction("request:create");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const user = await getCurrentUser();
  if (!organizationId || !user) {
    return actionError("Unauthorized", "AUTH_ERROR");
  }

  // Separate the schema-validated fields from the side-channel contactId.
  // `createRequestSchema` is `.strict()` (see lib/validations/requests.ts) —
  // passing `contactId` into `safeParse` would trigger an "Unrecognized key"
  // rejection because `contactId` is not a Request column, it's an
  // instruction to create a `RequestContact` join row after the request is
  // saved. Destructuring here is the canonical pattern per actions/CLAUDE.md.
  const { contactId, ...validatable } = input;

  // Validate input
  const validation = createRequestSchema.safeParse(validatable);
  if (!validation.success) {
    return actionValidationError(
      "Validation failed",
      validation.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const data = validation.data;

  try {
    // Generate friendly ID
    const friendlyId = await generateFriendlyId(prismadb, "Request", organizationId);

    // Encrypt sensitive fields
    const encrypted = await encryptRequestForOrg(
      {
        name: data.name,
        notes: data.notes ?? null,
        locationDisplayName: data.locationDisplayName ?? null,
        communicationNotes: data.communicationNotes ?? null,
        areasOfInterest: data.areasOfInterest ?? null,
      },
      organizationId
    );

    const request = await prismadb.request.create({
      data: {
        organizationId,
        friendlyId,
        createdBy: user.id,
        updatedBy: user.id,

        // Name (encrypted)
        name: encrypted.name,

        assignedAgentId: data.assignedAgentId ?? null,

        // Classification
        requestType: data.requestType,
        propertyCategory: data.propertyCategory ?? null,
        propertyTypes: data.propertyTypes ?? [],
        status: data.status ?? "ACTIVE",
        urgency: data.urgency ?? "MEDIUM",
        closureReason: data.closureReason ?? null,

        // Budget
        budgetMin: data.budgetMin ?? null,
        budgetMax: data.budgetMax ?? null,

        // Size
        surfaceMin: data.surfaceMin ?? null,
        surfaceMax: data.surfaceMax ?? null,
        plotSizeMin: data.plotSizeMin ?? null,
        plotSizeMax: data.plotSizeMax ?? null,

        // Rooms
        bedroomsMin: data.bedroomsMin ?? null,
        bedroomsMax: data.bedroomsMax ?? null,
        bathroomsMin: data.bathroomsMin ?? null,
        bathroomsMax: data.bathroomsMax ?? null,

        // Floors
        floorMin: data.floorMin ?? null,
        floorMax: data.floorMax ?? null,
        groundFloorOnly: data.groundFloorOnly ?? false,

        // Construction
        constructionYearMin: data.constructionYearMin ?? null,
        constructionYearMax: data.constructionYearMax ?? null,

        // Features
        conditionPreference: data.conditionPreference ?? [],
        heatingTypes: data.heatingTypes ?? [],
        energyClassMin: data.energyClassMin ?? null,
        furnished: data.furnished ?? null,
        requiresElevator: data.requiresElevator ?? null,
        requiresParking: data.requiresParking ?? null,
        requiresStorage: data.requiresStorage ?? null,
        requiresGarden: data.requiresGarden ?? null,
        petFriendly: data.petFriendly ?? null,
        requiresAC: data.requiresAC ?? null,
        insideCityPlan: data.insideCityPlan ?? null,
        legalizationOk: data.legalizationOk ?? null,
        amenities: data.amenities ?? Prisma.JsonNull,
        viewTypes: data.viewTypes ?? [],
        orientationPref: data.orientationPref ?? [],
        balconyMinSqm: data.balconyMinSqm ?? null,

        // Location (encrypted)
        locationDisplayName: encrypted.locationDisplayName,
        areasOfInterest: encrypted.areasOfInterest,
        municipality: data.municipality ?? null,
        region: data.region ?? null,
        centerLatitude: data.centerLatitude ?? null,
        centerLongitude: data.centerLongitude ?? null,
        radiusKm: data.radiusKm ?? null,

        // Investment
        isInvestmentPurpose: data.isInvestmentPurpose ?? null,
        expectedYieldPct: data.expectedYieldPct ?? null,
        goldenVisaEligible: data.goldenVisaEligible ?? null,
        financingStatus: data.financingStatus ?? null,
        auctionInterest: data.auctionInterest ?? null,

        // Timeline
        timeline: data.timeline ?? null,
        expiresAt: data.expiresAt ?? null,

        // Notes (encrypted)
        notes: encrypted.notes,
        communicationNotes: encrypted.communicationNotes,

        // Visibility
        visibility: data.visibility ?? "PRIVATE",
        draftStatus: data.draftStatus ?? false,
      },
    });

    // If a contactId was provided, verify it belongs to this org then link
    let linkedContactId: string | null = null;
    if (input.contactId) {
      const contact = await prismadb.contact.findFirst({
        where: { id: input.contactId, organizationId },
        select: { id: true },
      });
      if (contact) {
        await prismadb.requestContact.create({
          data: {
            organizationId,
            requestId: request.id,
            contactId: contact.id,
          },
        });
        linkedContactId = contact.id;
      }
    }

    // Activity log — fire-and-forget. Skip when draft.
    if (!request.draftStatus) {
      void logEntityCreated({
        organizationId,
        parentType: "REQUEST",
        parentId: request.id,
        createdByUserId: user.id,
        source: "manual",
      });

      if (linkedContactId) {
        void logEntityLinkedSymmetric({
          organizationId,
          aType: "REQUEST",
          aId: request.id,
          aLabel: "Request",
          aUrl: `/app/requests/${request.id}`,
          bType: "CONTACT",
          bId: linkedContactId,
          bLabel: "Contact",
          bUrl: `/app/crm/contacts/${linkedContactId}`,
          createdByUserId: user.id,
        });
      }
    }

    revalidatePath("/requests");

    return actionSuccess({ id: request.id, friendlyId: request.friendlyId! });
  } catch (error) {
    console.error("[CREATE_REQUEST]", error);
    return actionError("Failed to create request", "DB_ERROR");
  }
}

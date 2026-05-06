"use server";

import { z } from "zod";
import { PropertyType, HeatingType, EnergyCertClass, FurnishedStatus, PropertyCondition } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";
import {
  actionSuccess,
  actionError,
  actionValidationError,
  type ActionResponse,
} from "@/lib/action-response";
import { createRequest } from "./create-request";
import type { CreateRequestInput } from "@/lib/validations/requests";
import type {
  GenerateFromContactsInput,
  GenerateFromContactsResult,
  GenerateFromContactsResultItem,
  PreviewRequest,
} from "@/lib/types/auto-generate-requests";

const previewRowSchema = z.object({
  previewId: z.string().min(1),
  contactId: z.string().min(1),
  propertyId: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  requestType: z.enum(["BUY", "RENT"]),
  budgetMin: z.number().nullable().optional(),
  budgetMax: z.number().nullable().optional(),
  surfaceMin: z.number().nullable().optional(),
  surfaceMax: z.number().nullable().optional(),
  bedroomsMin: z.number().int().nullable().optional(),
  bathroomsMin: z.number().int().nullable().optional(),
  propertyTypes: z.array(z.string()).optional(),
  municipality: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  locationDisplayName: z.string().nullable().optional(),
  conditionPreference: z.array(z.string()).optional(),
  furnished: z.string().nullable().optional(),
  heatingTypes: z.array(z.string()).optional(),
  requiresElevator: z.boolean().nullable().optional(),
  energyClassMin: z.string().nullable().optional(),
});

const generateFromContactsSchema = z
  .object({
    previews: z.array(previewRowSchema).min(1),
  })
  .strict();

export async function generateRequestsFromContacts(
  input: GenerateFromContactsInput
): Promise<ActionResponse<GenerateFromContactsResult>> {
  const guard = await requireAction("request:create");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const user = await getCurrentUser();
  if (!organizationId || !user) {
    return actionError("Unauthorized", "AUTH_ERROR");
  }

  const validation = generateFromContactsSchema.safeParse(input);
  if (!validation.success) {
    return actionValidationError(
      "Validation failed",
      validation.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const { previews } = validation.data as { previews: PreviewRequest[] };

  // Verify all contact IDs belong to this org in a single query
  const allContactIds = Array.from(new Set(previews.map((p) => p.contactId)));
  const validContacts = await prismadb.contact.findMany({
    where: { id: { in: allContactIds }, organizationId },
    select: { id: true },
  });
  const validContactIdSet = new Set(validContacts.map((c) => c.id));

  // Verify all property IDs belong to this org in a single query
  const allPropertyIds = Array.from(new Set(previews.map((p) => p.propertyId)));
  const validProperties = await prismadb.properties.findMany({
    where: { id: { in: allPropertyIds }, organizationId },
    select: { id: true },
  });
  const validPropertyIdSet = new Set(validProperties.map((p: { id: string }) => p.id));

  const results: GenerateFromContactsResultItem[] = [];

  for (const preview of previews) {
    if (!validContactIdSet.has(preview.contactId)) {
      results.push({
        previewId: preview.previewId,
        contactId: preview.contactId,
        propertyId: preview.propertyId,
        status: "skipped",
        error: "Contact not found in organization",
      });
      continue;
    }

    if (!validPropertyIdSet.has(preview.propertyId)) {
      results.push({
        previewId: preview.previewId,
        contactId: preview.contactId,
        propertyId: preview.propertyId,
        status: "skipped",
        error: "Property not found in organization",
      });
      continue;
    }

    try {
      const result = await createRequest({
        name: preview.name,
        status: "ACTIVE",
        requestType: preview.requestType as "BUY" | "RENT",
        budgetMin: preview.budgetMin ?? null,
        budgetMax: preview.budgetMax ?? null,
        surfaceMin: preview.surfaceMin ?? null,
        surfaceMax: preview.surfaceMax ?? null,
        bedroomsMin: preview.bedroomsMin ?? null,
        bathroomsMin: preview.bathroomsMin ?? null,
        propertyTypes: (preview.propertyTypes ?? []).filter(
          (v): v is PropertyType => v in PropertyType
        ),
        municipality: preview.municipality ?? null,
        region: preview.region ?? null,
        locationDisplayName: preview.locationDisplayName ?? null,
        conditionPreference: (preview.conditionPreference ?? []).filter(
          (v): v is PropertyCondition => v in PropertyCondition
        ),
        furnished:
          preview.furnished != null && preview.furnished in FurnishedStatus
            ? (preview.furnished as FurnishedStatus)
            : null,
        heatingTypes: (preview.heatingTypes ?? []).filter(
          (v): v is HeatingType => v in HeatingType
        ),
        requiresElevator: preview.requiresElevator ?? null,
        energyClassMin:
          preview.energyClassMin != null && preview.energyClassMin in EnergyCertClass
            ? (preview.energyClassMin as EnergyCertClass)
            : null,
        contactId: preview.contactId,
        draftStatus: false,
      } as CreateRequestInput & { contactId?: string });

      if (result.success) {
        results.push({
          previewId: preview.previewId,
          contactId: preview.contactId,
          propertyId: preview.propertyId,
          status: "created",
          requestId: result.data?.id,
          friendlyId: result.data?.friendlyId,
        });
      } else {
        results.push({
          previewId: preview.previewId,
          contactId: preview.contactId,
          propertyId: preview.propertyId,
          status: "failed",
          error: result.error,
        });
      }
    } catch (err) {
      console.error("[GENERATE_REQUESTS_FROM_CONTACTS]", err);
      results.push({
        previewId: preview.previewId,
        contactId: preview.contactId,
        propertyId: preview.propertyId,
        status: "failed",
        error: "Failed to create request",
      });
    }
  }

  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return actionSuccess({ created, skipped, failed, results });
}

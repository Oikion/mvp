import { NextRequest } from "next/server";
import { z } from "zod";
import { ContactStatus, ContactSource, PersonType, Language, ItemVisibility } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { API_SCOPES } from "@/lib/api-auth";
import {
  withExternalApi,
  createApiSuccessResponse,
  createApiErrorResponse,
  ExternalApiContext,
} from "@/lib/external-api-middleware";
import { dispatchContactWebhook } from "@/lib/webhooks";
import { decryptContactForOrg, encryptContactForOrg } from "@/lib/model-encryption";
import { deleteEntitySessionsForEntity } from "@/lib/entity-session/entity-session-service";

/**
 * Zod schema for external API contact update.
 * All fields optional (partial update). Validates enums and rejects unknown fields.
 */
const updateContactApiSchema = z.object({
  displayName: z.string().min(1).max(255).optional(),
  firstName: z.string().max(255).optional().nullable(),
  lastName: z.string().max(255).optional().nullable(),
  isCompany: z.boolean().optional(),
  companyName: z.string().max(255).optional().nullable(),
  email: z.string().email().optional().nullable(),
  primaryPhone: z.string().max(50).optional().nullable(),
  secondaryEmail: z.string().email().optional().nullable(),
  secondaryPhone: z.string().max(50).optional().nullable(),
  status: z.nativeEnum(ContactStatus).optional(),
  category: z.array(z.string()).optional(),
  source: z.nativeEnum(ContactSource).optional().nullable(),
  visibility: z.nativeEnum(ItemVisibility).optional(),
  personType: z.nativeEnum(PersonType).optional().nullable(),
  assignedAgentId: z.string().min(1).optional().nullable(),
  languagePreference: z.nativeEnum(Language).optional().nullable(),
  gdprConsentGiven: z.boolean().optional(),
  allowMarketing: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
}).strict();

/**
 * GET /api/v1/crm/contacts/[contactId]
 * Get a single contact by friendlyId
 */
export const GET = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const url = new URL(req.url);
    const contactId = url.pathname.split("/").pop();

    if (!contactId) {
      return createApiErrorResponse("Contact ID is required", 400);
    }

    const contact = await prismadb.contact.findFirst({
      where: {
        organizationId: context.organizationId,
        friendlyId: contactId,
        deletedAt: null,
      },
      select: {
        id: true,
        friendlyId: true,
        displayName: true,
        firstName: true,
        lastName: true,
        isCompany: true,
        companyName: true,
        email: true,
        secondaryEmail: true,
        primaryPhone: true,
        secondaryPhone: true,
        officePhone: true,
        status: true,
        category: true,
        source: true,
        visibility: true,
        assignedAgentId: true,
        languagePreference: true,
        tags: true,
        leadScore: true,
        gdprConsentGiven: true,
        allowMarketing: true,
        notes: true,
        taxId: true,
        doy: true,
        vatNumber: true,
        addresses: true,
        createdAt: true,
        updatedAt: true,
        assignedAgent: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!contact) {
      return createApiErrorResponse("Contact not found", 404);
    }

    const decrypted = await decryptContactForOrg(contact, context.organizationId);

    return createApiSuccessResponse({
      contact: {
        id: decrypted.id,
        friendlyId: decrypted.friendlyId,
        displayName: decrypted.displayName,
        firstName: decrypted.firstName,
        lastName: decrypted.lastName,
        isCompany: decrypted.isCompany,
        companyName: decrypted.companyName,
        email: decrypted.email,
        secondaryEmail: decrypted.secondaryEmail,
        primaryPhone: decrypted.primaryPhone,
        secondaryPhone: decrypted.secondaryPhone,
        officePhone: decrypted.officePhone,
        status: decrypted.status,
        category: decrypted.category,
        source: decrypted.source,
        visibility: decrypted.visibility,
        languagePreference: decrypted.languagePreference,
        tags: decrypted.tags,
        leadScore: decrypted.leadScore,
        gdprConsentGiven: decrypted.gdprConsentGiven,
        allowMarketing: decrypted.allowMarketing,
        notes: decrypted.notes,
        taxId: decrypted.taxId,
        doy: decrypted.doy,
        vatNumber: decrypted.vatNumber,
        addresses: decrypted.addresses,
        assignedTo: decrypted.assignedAgent,
        createdAt: decrypted.createdAt.toISOString(),
        updatedAt: decrypted.updatedAt?.toISOString(),
      },
    });
  },
  { requiredScopes: [API_SCOPES.CRM_READ] }
);

/**
 * PUT /api/v1/crm/contacts/[contactId]
 * Update a contact
 */
export const PUT = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const url = new URL(req.url);
    const contactId = url.pathname.split("/").pop();

    if (!contactId) {
      return createApiErrorResponse("Contact ID is required", 400);
    }

    // Verify contact exists and belongs to organization
    const existingContact = await prismadb.contact.findFirst({
      where: {
        organizationId: context.organizationId,
        friendlyId: contactId,
        deletedAt: null,
      },
    });

    if (!existingContact) {
      return createApiErrorResponse("Contact not found", 404);
    }

    // Decrypt existing record for webhook plaintext fallbacks
    const decryptedExisting = await decryptContactForOrg(existingContact, context.organizationId);

    const body = await req.json();

    const parsed = updateContactApiSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const details = Object.entries(fieldErrors)
        .map(([k, v]) => `${k}: ${(v ?? []).join(", ")}`)
        .join("; ");
      return createApiErrorResponse(`Validation failed: ${details}`, 400);
    }

    const v = parsed.data;

    // Build update data — only include fields that were provided
    const updateData: Record<string, unknown> = {
      updatedBy: context.createdById,
      updatedAt: new Date(),
    };

    if (v.displayName !== undefined) updateData.displayName = v.displayName;
    if (v.firstName !== undefined) updateData.firstName = v.firstName;
    if (v.lastName !== undefined) updateData.lastName = v.lastName;
    if (v.isCompany !== undefined) updateData.isCompany = v.isCompany;
    if (v.companyName !== undefined) updateData.companyName = v.companyName;
    if (v.email !== undefined) updateData.email = v.email;
    if (v.primaryPhone !== undefined) updateData.primaryPhone = v.primaryPhone;
    if (v.secondaryEmail !== undefined) updateData.secondaryEmail = v.secondaryEmail;
    if (v.secondaryPhone !== undefined) updateData.secondaryPhone = v.secondaryPhone;
    if (v.status !== undefined) updateData.status = v.status;
    if (v.category !== undefined) updateData.category = v.category;
    if (v.source !== undefined) updateData.source = v.source;
    if (v.visibility !== undefined) updateData.visibility = v.visibility;
    if (v.assignedAgentId !== undefined) updateData.assignedAgentId = v.assignedAgentId;
    if (v.languagePreference !== undefined) updateData.languagePreference = v.languagePreference;
    if (v.gdprConsentGiven !== undefined) {
      updateData.gdprConsentGiven = v.gdprConsentGiven;
      if (v.gdprConsentGiven && !existingContact.gdprConsentGiven) {
        updateData.gdprConsentDate = new Date();
      }
    }
    if (v.allowMarketing !== undefined) updateData.allowMarketing = v.allowMarketing;
    if (v.notes !== undefined) updateData.notes = v.notes;
    if (v.tags !== undefined) updateData.tags = v.tags;

    // Encrypt PII fields before writing to DB
    const encryptedUpdateData = await encryptContactForOrg(updateData, context.organizationId);

    const contact = await prismadb.contact.update({
      where: { id: existingContact.id },
      data: encryptedUpdateData,
      select: {
        id: true,
        friendlyId: true,
        status: true,
        category: true,
        assignedAgentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Dispatch webhook with plaintext — validated input falls back to decrypted existing
    dispatchContactWebhook(context.organizationId, "contact.updated", {
      id: contact.id,
      displayName: v.displayName ?? decryptedExisting.displayName,
      email: v.email !== undefined ? v.email : decryptedExisting.email,
      status: contact.status,
      category: contact.category,
      assignedAgentId: contact.assignedAgentId,
    }).catch(console.error);

    return createApiSuccessResponse({
      contact: {
        id: contact.id,
        friendlyId: contact.friendlyId,
        displayName: v.displayName ?? decryptedExisting.displayName,
        email: v.email !== undefined ? v.email : decryptedExisting.email,
        primaryPhone: v.primaryPhone !== undefined ? v.primaryPhone : decryptedExisting.primaryPhone,
        status: contact.status,
        category: contact.category,
        assignedAgentId: contact.assignedAgentId,
        createdAt: contact.createdAt.toISOString(),
        updatedAt: contact.updatedAt?.toISOString(),
      },
    });
  },
  { requiredScopes: [API_SCOPES.CRM_WRITE] }
);

/**
 * DELETE /api/v1/crm/contacts/[contactId]
 * Soft-delete a contact
 */
export const DELETE = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const url = new URL(req.url);
    const contactId = url.pathname.split("/").pop();

    if (!contactId) {
      return createApiErrorResponse("Contact ID is required", 400);
    }

    // Verify contact exists and belongs to organization
    const existingContact = await prismadb.contact.findFirst({
      where: {
        organizationId: context.organizationId,
        friendlyId: contactId,
        deletedAt: null,
      },
    });

    if (!existingContact) {
      return createApiErrorResponse("Contact not found", 404);
    }

    // Decrypt before delete — webhook consumers need plaintext
    const decryptedForWebhook = await decryptContactForOrg(existingContact, context.organizationId);

    // TODO: update to "CONTACT" once EntityType union includes it
    await deleteEntitySessionsForEntity("CLIENT", existingContact.id);

    // Soft delete — preserves audit trail
    await prismadb.contact.update({
      where: { id: existingContact.id },
      data: { deletedAt: new Date() },
    });

    dispatchContactWebhook(context.organizationId, "contact.deleted", {
      id: decryptedForWebhook.id,
      displayName: decryptedForWebhook.displayName,
      email: decryptedForWebhook.email,
      status: decryptedForWebhook.status,
      category: decryptedForWebhook.category,
      assignedAgentId: decryptedForWebhook.assignedAgentId,
    }).catch(console.error);

    return createApiSuccessResponse({
      message: "Contact deleted successfully",
      contactId,
    });
  },
  { requiredScopes: [API_SCOPES.CRM_WRITE] }
);

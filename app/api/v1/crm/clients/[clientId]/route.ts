import { NextRequest } from "next/server";
import { z } from "zod";
import { ClientStatus, ClientType, PersonType, LeadSource, Language } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { API_SCOPES } from "@/lib/api-auth";
import {
  withExternalApi,
  createApiSuccessResponse,
  createApiErrorResponse,
  ExternalApiContext,
} from "@/lib/external-api-middleware";
import { dispatchClientWebhook } from "@/lib/webhooks";
import { decryptClientForOrg, encryptClientForOrg } from "@/lib/model-encryption";
import { deleteEntitySessionsForEntity } from "@/lib/entity-session/entity-session-service";

/**
 * Zod schema for external API client update.
 * All fields optional (partial update). Validates enums and rejects unknown fields.
 */
const updateClientApiSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  secondaryEmail: z.string().email().optional().nullable(),
  secondaryPhone: z.string().max(50).optional().nullable(),
  status: z.nativeEnum(ClientStatus).optional(),
  type: z.nativeEnum(ClientType).optional().nullable(),
  personType: z.nativeEnum(PersonType).optional().nullable(),
  assignedTo: z.string().min(1).optional().nullable(),
  companyName: z.string().max(255).optional().nullable(),
  fullName: z.string().max(255).optional().nullable(),
  language: z.nativeEnum(Language).optional().nullable(),
  leadSource: z.nativeEnum(LeadSource).optional().nullable(),
  channels: z.array(z.string()).optional(),
  gdprConsent: z.boolean().optional(),
  allowMarketing: z.boolean().optional(),
  description: z.string().optional().nullable(),
  billingStreet: z.string().max(255).optional().nullable(),
  billingCity: z.string().max(100).optional().nullable(),
  billingState: z.string().max(100).optional().nullable(),
  billingPostalCode: z.string().max(20).optional().nullable(),
  billingCountry: z.string().max(100).optional().nullable(),
}).strict();

/**
 * GET /api/v1/crm/clients/[clientId]
 * Get a single client
 */
export const GET = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const url = new URL(req.url);
    const clientId = url.pathname.split("/").pop();

    if (!clientId) {
      return createApiErrorResponse("Client ID is required", 400);
    }

    const client = await prismadb.clients.findFirst({
      where: {
        organizationId: context.organizationId,
        friendlyId: clientId,
      },
      select: {
        id: true,
        client_name: true,
        primary_email: true,
        primary_phone: true,
        secondary_email: true,
        secondary_phone: true,
        client_status: true,
        client_type: true,
        person_type: true,
        assigned_to: true,
        company_name: true,
        full_name: true,
        language: true,
        lead_source: true,
        channels: true,
        gdpr_consent: true,
        allow_marketing: true,
        description: true,
        billing_street: true,
        billing_city: true,
        billing_state: true,
        billing_postal_code: true,
        billing_country: true,
        shipping_street: true,
        shipping_city: true,
        shipping_state: true,
        shipping_postal_code: true,
        shipping_country: true,
        createdAt: true,
        updatedAt: true,
        Users_Clients_assigned_toToUsers: {
          select: { id: true, name: true, email: true },
        },
        Client_Contacts: {
          select: {
            id: true,
            contact_first_name: true,
            contact_last_name: true,
            email: true,
            mobile_phone: true,
            contact_type: true,
          },
        },
      },
    });

    if (!client) {
      return createApiErrorResponse("Client not found", 404);
    }

    // Decrypt encrypted client fields
    const decrypted = await decryptClientForOrg(client, context.organizationId);

    return createApiSuccessResponse({
      client: {
        id: decrypted.id,
        name: decrypted.client_name,
        email: decrypted.primary_email,
        phone: decrypted.primary_phone,
        secondaryEmail: decrypted.secondary_email,
        secondaryPhone: decrypted.secondary_phone,
        status: decrypted.client_status,
        type: decrypted.client_type,
        personType: decrypted.person_type,
        companyName: decrypted.company_name,
        fullName: decrypted.full_name,
        language: decrypted.language,
        leadSource: decrypted.lead_source,
        channels: decrypted.channels,
        gdprConsent: decrypted.gdpr_consent,
        allowMarketing: decrypted.allow_marketing,
        description: decrypted.description,
        billingAddress: {
          street: decrypted.billing_street,
          city: decrypted.billing_city,
          state: decrypted.billing_state,
          postalCode: decrypted.billing_postal_code,
          country: decrypted.billing_country,
        },
        shippingAddress: {
          street: decrypted.shipping_street,
          city: decrypted.shipping_city,
          state: decrypted.shipping_state,
          postalCode: decrypted.shipping_postal_code,
          country: decrypted.shipping_country,
        },
        assignedTo: decrypted.Users_Clients_assigned_toToUsers,
        contacts: decrypted.Client_Contacts.map((c) => ({
          id: c.id,
          firstName: c.contact_first_name,
          lastName: c.contact_last_name,
          email: c.email,
          phone: c.mobile_phone,
          type: c.contact_type,
        })),
        createdAt: decrypted.createdAt.toISOString(),
        updatedAt: decrypted.updatedAt?.toISOString(),
      },
    });
  },
  { requiredScopes: [API_SCOPES.CRM_READ] }
);

/**
 * PUT /api/v1/crm/clients/[clientId]
 * Update a client
 */
export const PUT = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const url = new URL(req.url);
    const clientId = url.pathname.split("/").pop();

    if (!clientId) {
      return createApiErrorResponse("Client ID is required", 400);
    }

    // Verify client exists and belongs to organization
    const existingClient = await prismadb.clients.findFirst({
      where: {
        organizationId: context.organizationId,
        friendlyId: clientId,
      },
    });

    if (!existingClient) {
      return createApiErrorResponse("Client not found", 404);
    }

    // Decrypt existing record for response fallbacks and webhook plaintext
    const decryptedExisting = await decryptClientForOrg(existingClient, context.organizationId);

    const body = await req.json();

    // Validate input with Zod — rejects unknown fields and validates enums
    const parsed = updateClientApiSchema.safeParse(body);
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

    if (v.name !== undefined) updateData.client_name = v.name;
    if (v.email !== undefined) updateData.primary_email = v.email;
    if (v.phone !== undefined) updateData.primary_phone = v.phone;
    if (v.secondaryEmail !== undefined) updateData.secondary_email = v.secondaryEmail;
    if (v.secondaryPhone !== undefined) updateData.secondary_phone = v.secondaryPhone;
    if (v.status !== undefined) updateData.client_status = v.status;
    if (v.type !== undefined) updateData.client_type = v.type;
    if (v.personType !== undefined) updateData.person_type = v.personType;
    if (v.assignedTo !== undefined) updateData.assigned_to = v.assignedTo;
    if (v.companyName !== undefined) updateData.company_name = v.companyName;
    if (v.fullName !== undefined) updateData.full_name = v.fullName;
    if (v.language !== undefined) updateData.language = v.language;
    if (v.leadSource !== undefined) updateData.lead_source = v.leadSource;
    if (v.channels !== undefined) updateData.channels = v.channels;
    if (v.gdprConsent !== undefined) updateData.gdpr_consent = v.gdprConsent;
    if (v.allowMarketing !== undefined) updateData.allow_marketing = v.allowMarketing;
    if (v.description !== undefined) updateData.description = v.description;
    if (v.billingStreet !== undefined) updateData.billing_street = v.billingStreet;
    if (v.billingCity !== undefined) updateData.billing_city = v.billingCity;
    if (v.billingState !== undefined) updateData.billing_state = v.billingState;
    if (v.billingPostalCode !== undefined) updateData.billing_postal_code = v.billingPostalCode;
    if (v.billingCountry !== undefined) updateData.billing_country = v.billingCountry;

    // Encrypt PII fields before writing to DB
    const encryptedUpdateData = await encryptClientForOrg(updateData, context.organizationId);

    const client = await prismadb.clients.update({
      where: { id: existingClient.id },
      data: encryptedUpdateData,
      select: {
        id: true,
        client_status: true,
        client_type: true,
        assigned_to: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Dispatch webhook with plaintext — use validated input, fall back to decrypted existing
    dispatchClientWebhook(context.organizationId, "client.updated", {
      id: client.id,
      client_name: v.name ?? decryptedExisting.client_name,
      primary_email: v.email !== undefined ? v.email : decryptedExisting.primary_email,
      client_status: client.client_status,
      client_type: client.client_type,
      assigned_to: client.assigned_to,
    }).catch(console.error);

    // Return plaintext values — use validated input, fall back to decrypted existing
    return createApiSuccessResponse({
      client: {
        id: client.id,
        name: v.name ?? decryptedExisting.client_name,
        email: v.email !== undefined ? v.email : decryptedExisting.primary_email,
        phone: v.phone !== undefined ? v.phone : decryptedExisting.primary_phone,
        status: client.client_status,
        type: client.client_type,
        assignedTo: client.assigned_to,
        createdAt: client.createdAt.toISOString(),
        updatedAt: client.updatedAt?.toISOString(),
      },
    });
  },
  { requiredScopes: [API_SCOPES.CRM_WRITE] }
);

/**
 * DELETE /api/v1/crm/clients/[clientId]
 * Delete a client
 */
export const DELETE = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const url = new URL(req.url);
    const clientId = url.pathname.split("/").pop();

    if (!clientId) {
      return createApiErrorResponse("Client ID is required", 400);
    }

    // Verify client exists and belongs to organization
    const existingClient = await prismadb.clients.findFirst({
      where: {
        organizationId: context.organizationId,
        friendlyId: clientId,
      },
    });

    if (!existingClient) {
      return createApiErrorResponse("Client not found", 404);
    }

    // Decrypt before delete — webhook consumers need plaintext
    const decryptedForWebhook = await decryptClientForOrg(existingClient, context.organizationId);

    // Delete client
    await deleteEntitySessionsForEntity("CLIENT", existingClient.id);

    await prismadb.clients.delete({
      where: { id: existingClient.id },
    });

    // Dispatch webhook with decrypted plaintext
    dispatchClientWebhook(context.organizationId, "client.deleted", {
      id: decryptedForWebhook.id,
      client_name: decryptedForWebhook.client_name,
      primary_email: decryptedForWebhook.primary_email,
      client_status: decryptedForWebhook.client_status,
      client_type: decryptedForWebhook.client_type,
      assigned_to: decryptedForWebhook.assigned_to,
    }).catch(console.error);

    return createApiSuccessResponse({
      message: "Client deleted successfully",
      clientId,
    });
  },
  { requiredScopes: [API_SCOPES.CRM_WRITE] }
);

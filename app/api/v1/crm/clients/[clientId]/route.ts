import { NextRequest } from "next/server";
import { prismadb } from "@/lib/prisma";
import { API_SCOPES } from "@/lib/api-auth";
import {
  withExternalApi,
  createApiSuccessResponse,
  createApiErrorResponse,
  ExternalApiContext,
} from "@/lib/external-api-middleware";
import { dispatchClientWebhook } from "@/lib/webhooks";
import { decryptClientForOrg } from "@/lib/model-encryption";

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

    const body = await req.json();
    const {
      name,
      email,
      phone,
      secondaryEmail,
      secondaryPhone,
      status,
      type,
      personType,
      assignedTo,
      companyName,
      fullName,
      language,
      leadSource,
      channels,
      gdprConsent,
      allowMarketing,
      description,
      billingStreet,
      billingCity,
      billingState,
      billingPostalCode,
      billingCountry,
    } = body;

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedBy: context.createdById,
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.client_name = name;
    if (email !== undefined) updateData.primary_email = email;
    if (phone !== undefined) updateData.primary_phone = phone;
    if (secondaryEmail !== undefined) updateData.secondary_email = secondaryEmail;
    if (secondaryPhone !== undefined) updateData.secondary_phone = secondaryPhone;
    if (status !== undefined) updateData.client_status = status;
    if (type !== undefined) updateData.client_type = type;
    if (personType !== undefined) updateData.person_type = personType;
    if (assignedTo !== undefined) updateData.assigned_to = assignedTo;
    if (companyName !== undefined) updateData.company_name = companyName;
    if (fullName !== undefined) updateData.full_name = fullName;
    if (language !== undefined) updateData.language = language;
    if (leadSource !== undefined) updateData.lead_source = leadSource;
    if (channels !== undefined) updateData.channels = channels;
    if (gdprConsent !== undefined) updateData.gdpr_consent = gdprConsent;
    if (allowMarketing !== undefined) updateData.allow_marketing = allowMarketing;
    if (description !== undefined) updateData.description = description;
    if (billingStreet !== undefined) updateData.billing_street = billingStreet;
    if (billingCity !== undefined) updateData.billing_city = billingCity;
    if (billingState !== undefined) updateData.billing_state = billingState;
    if (billingPostalCode !== undefined) updateData.billing_postal_code = billingPostalCode;
    if (billingCountry !== undefined) updateData.billing_country = billingCountry;

    const client = await prismadb.clients.update({
      where: { id: existingClient.id },
      data: updateData,
      select: {
        id: true,
        client_name: true,
        primary_email: true,
        primary_phone: true,
        client_status: true,
        client_type: true,
        assigned_to: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Dispatch webhook
    dispatchClientWebhook(context.organizationId, "client.updated", client).catch(console.error);

    return createApiSuccessResponse({
      client: {
        id: client.id,
        name: client.client_name,
        email: client.primary_email,
        phone: client.primary_phone,
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

    // Delete client
    await prismadb.clients.delete({
      where: { id: existingClient.id },
    });

    // Dispatch webhook
    dispatchClientWebhook(context.organizationId, "client.deleted", existingClient).catch(
      console.error
    );

    return createApiSuccessResponse({
      message: "Client deleted successfully",
      clientId,
    });
  },
  { requiredScopes: [API_SCOPES.CRM_WRITE] }
);

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
        id: clientId,
        organizationId: context.organizationId,
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
        intent: true,
        assigned_to: true,
        company_name: true,
        full_name: true,
        language: true,
        lead_source: true,
        channels: true,
        areas_of_interest: true,
        budget_min: true,
        budget_max: true,
        timeline: true,
        financing_type: true,
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

    return createApiSuccessResponse({
      client: {
        id: client.id,
        name: client.client_name,
        email: client.primary_email,
        phone: client.primary_phone,
        secondaryEmail: client.secondary_email,
        secondaryPhone: client.secondary_phone,
        status: client.client_status,
        type: client.client_type,
        personType: client.person_type,
        intent: client.intent,
        companyName: client.company_name,
        fullName: client.full_name,
        language: client.language,
        leadSource: client.lead_source,
        channels: client.channels,
        areasOfInterest: client.areas_of_interest,
        budgetMin: client.budget_min,
        budgetMax: client.budget_max,
        timeline: client.timeline,
        financingType: client.financing_type,
        gdprConsent: client.gdpr_consent,
        allowMarketing: client.allow_marketing,
        description: client.description,
        billingAddress: {
          street: client.billing_street,
          city: client.billing_city,
          state: client.billing_state,
          postalCode: client.billing_postal_code,
          country: client.billing_country,
        },
        shippingAddress: {
          street: client.shipping_street,
          city: client.shipping_city,
          state: client.shipping_state,
          postalCode: client.shipping_postal_code,
          country: client.shipping_country,
        },
        assignedTo: client.Users_Clients_assigned_toToUsers,
        contacts: client.Client_Contacts.map((c) => ({
          id: c.id,
          firstName: c.contact_first_name,
          lastName: c.contact_last_name,
          email: c.email,
          phone: c.mobile_phone,
          type: c.contact_type,
        })),
        createdAt: client.createdAt.toISOString(),
        updatedAt: client.updatedAt?.toISOString(),
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
        id: clientId,
        organizationId: context.organizationId,
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
      intent,
      assignedTo,
      companyName,
      fullName,
      language,
      leadSource,
      channels,
      areasOfInterest,
      budgetMin,
      budgetMax,
      timeline,
      financingType,
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
    if (intent !== undefined) updateData.intent = intent;
    if (assignedTo !== undefined) updateData.assigned_to = assignedTo;
    if (companyName !== undefined) updateData.company_name = companyName;
    if (fullName !== undefined) updateData.full_name = fullName;
    if (language !== undefined) updateData.language = language;
    if (leadSource !== undefined) updateData.lead_source = leadSource;
    if (channels !== undefined) updateData.channels = channels;
    if (areasOfInterest !== undefined) updateData.areas_of_interest = areasOfInterest;
    if (budgetMin !== undefined) updateData.budget_min = budgetMin;
    if (budgetMax !== undefined) updateData.budget_max = budgetMax;
    if (timeline !== undefined) updateData.timeline = timeline;
    if (financingType !== undefined) updateData.financing_type = financingType;
    if (gdprConsent !== undefined) updateData.gdpr_consent = gdprConsent;
    if (allowMarketing !== undefined) updateData.allow_marketing = allowMarketing;
    if (description !== undefined) updateData.description = description;
    if (billingStreet !== undefined) updateData.billing_street = billingStreet;
    if (billingCity !== undefined) updateData.billing_city = billingCity;
    if (billingState !== undefined) updateData.billing_state = billingState;
    if (billingPostalCode !== undefined) updateData.billing_postal_code = billingPostalCode;
    if (billingCountry !== undefined) updateData.billing_country = billingCountry;

    const client = await prismadb.clients.update({
      where: { id: clientId },
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
        id: clientId,
        organizationId: context.organizationId,
      },
    });

    if (!existingClient) {
      return createApiErrorResponse("Client not found", 404);
    }

    // Delete client
    await prismadb.clients.delete({
      where: { id: clientId },
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

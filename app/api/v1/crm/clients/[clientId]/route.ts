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
import { decryptContactForOrg, encryptContactForOrg } from "@/lib/model-encryption";
import { deleteEntitySessionsForEntity } from "@/lib/entity-session/entity-session-service";

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

    const client = await prismadb.contact.findFirst({
      where: {
        organizationId: context.organizationId,
        friendlyId: clientId,
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        primaryPhone: true,
        secondaryEmail: true,
        secondaryPhone: true,
        status: true,
        category: true,
        isCompany: true,
        assignedAgentId: true,
        companyName: true,
        languagePreference: true,
        source: true,
        gdprConsentGiven: true,
        allowMarketing: true,
        createdAt: true,
        updatedAt: true,
        assignedAgent: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!client) {
      return createApiErrorResponse("Client not found", 404);
    }

    // Decrypt encrypted contact fields
    const decrypted = await decryptContactForOrg(client, context.organizationId);

    return createApiSuccessResponse({
      client: {
        id: decrypted.id,
        name: decrypted.displayName,
        email: decrypted.email,
        phone: decrypted.primaryPhone,
        secondaryEmail: decrypted.secondaryEmail,
        secondaryPhone: decrypted.secondaryPhone,
        status: decrypted.status,
        type: decrypted.category,
        personType: decrypted.isCompany ? "company" : "individual",
        companyName: decrypted.companyName,
        language: decrypted.languagePreference,
        leadSource: decrypted.source,
        gdprConsent: decrypted.gdprConsentGiven,
        allowMarketing: decrypted.allowMarketing,
        assignedTo: (decrypted as Record<string, unknown>).assignedAgent,
        createdAt: (decrypted.createdAt as Date).toISOString(),
        updatedAt: (decrypted.updatedAt as Date | null)?.toISOString(),
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
    const existingClient = await prismadb.contact.findFirst({
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
      language,
      leadSource,
      gdprConsent,
      allowMarketing,
      description,
    } = body;

    // Build update data: only include fields present in the request body
    const candidates: [string, unknown][] = [
      ["displayName", name],
      ["email", email],
      ["primaryPhone", phone],
      ["secondaryEmail", secondaryEmail],
      ["secondaryPhone", secondaryPhone],
      ["status", status],
      ["category", type],
      ["isCompany", personType === undefined ? undefined : personType === "company"],
      ["assignedAgentId", assignedTo],
      ["companyName", companyName],
      ["languagePreference", language],
      ["source", leadSource],
      ["gdprConsentGiven", gdprConsent],
      ["allowMarketing", allowMarketing],
      ["description", description],
    ];

    const rawData: Record<string, unknown> = {
      updatedBy: context.createdById,
      ...Object.fromEntries(candidates.filter(([, v]) => v !== undefined)),
    };

    const encrypted = await encryptContactForOrg(rawData, context.organizationId);

    const contact = await prismadb.contact.update({
      where: { id: existingClient.id },
      data: { ...rawData, ...encrypted },
      select: {
        id: true,
        displayName: true,
        email: true,
        primaryPhone: true,
        status: true,
        category: true,
        isCompany: true,
        assignedAgentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Dispatch webhook
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatchClientWebhook(context.organizationId, "client.updated", contact as any).catch(console.error);

    return createApiSuccessResponse({
      client: {
        id: contact.id,
        name: contact.displayName,
        email: contact.email,
        phone: contact.primaryPhone,
        status: contact.status,
        type: contact.category,
        personType: contact.isCompany ? "company" : "individual",
        assignedTo: contact.assignedAgentId,
        createdAt: contact.createdAt.toISOString(),
        updatedAt: (contact.updatedAt as Date | null)?.toISOString(),
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
    const existingClient = await prismadb.contact.findFirst({
      where: {
        organizationId: context.organizationId,
        friendlyId: clientId,
      },
    });

    if (!existingClient) {
      return createApiErrorResponse("Client not found", 404);
    }

    // Delete contact
    await deleteEntitySessionsForEntity("CLIENT", existingClient.id);

    await prismadb.contact.delete({
      where: { id: existingClient.id },
    });

    // Dispatch webhook
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatchClientWebhook(context.organizationId, "client.deleted", existingClient as any).catch(
      console.error
    );

    return createApiSuccessResponse({
      message: "Client deleted successfully",
      clientId,
    });
  },
  { requiredScopes: [API_SCOPES.CRM_WRITE] }
);

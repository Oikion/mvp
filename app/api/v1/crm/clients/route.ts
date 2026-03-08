import { NextRequest } from "next/server";
import { prismadb } from "@/lib/prisma";
import { API_SCOPES } from "@/lib/api-auth";
import {
  withExternalApi,
  createApiSuccessResponse,
  createApiErrorResponse,
  parsePaginationParams,
  parseFilterParams,
  ExternalApiContext,
} from "@/lib/external-api-middleware";
import { generateFriendlyId } from "@/lib/friendly-id";
import { dispatchClientWebhook } from "@/lib/webhooks";
import { decryptClientForOrg } from "@/lib/model-encryption";

/**
 * GET /api/v1/crm/clients
 * List clients for the organization
 */
export const GET = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const { cursor, limit } = parsePaginationParams(req);
    const filters = parseFilterParams(req, ["status", "type", "search", "assignedTo"]);

    // Build where clause
    const where: Record<string, unknown> = {
      organizationId: context.organizationId,
    };

    if (filters.status) {
      where.client_status = filters.status;
    }

    if (filters.type) {
      where.client_type = filters.type;
    }

    if (filters.assignedTo) {
      where.assigned_to = filters.assignedTo;
    }

    if (filters.search) {
      where.OR = [
        { client_name: { contains: filters.search, mode: "insensitive" } },
        { primary_email: { contains: filters.search, mode: "insensitive" } },
        { primary_phone: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Fetch clients
    const clients = await prismadb.clients.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        client_name: true,
        primary_email: true,
        primary_phone: true,
        client_status: true,
        client_type: true,
        person_type: true,
        assigned_to: true,
        createdAt: true,
        updatedAt: true,
        Users_Clients_assigned_toToUsers: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const hasMore = clients.length > limit;
    const items = hasMore ? clients.slice(0, -1) : clients;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    // Decrypt encrypted client fields
    const decryptedItems = await Promise.all(
      items.map((c) => decryptClientForOrg(c, context.organizationId))
    );

    return createApiSuccessResponse(
      {
        clients: decryptedItems.map((client) => ({
          id: client.id,
          name: client.client_name,
          email: client.primary_email,
          phone: client.primary_phone,
          status: client.client_status,
          type: client.client_type,
          personType: client.person_type,
          assignedTo: client.Users_Clients_assigned_toToUsers,
          createdAt: client.createdAt.toISOString(),
          updatedAt: client.updatedAt?.toISOString(),
        })),
      },
      200,
      { nextCursor, hasMore, limit }
    );
  },
  { requiredScopes: [API_SCOPES.CRM_READ] }
);

/**
 * POST /api/v1/crm/clients
 * Create a new client
 */
export const POST = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
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

    // Validate required fields
    if (!name) {
      return createApiErrorResponse("Missing required field: name", 400);
    }

    // Generate friendly ID
    const friendlyId = await generateFriendlyId(prismadb, "Clients", context.organizationId);

    // Create client
    const client = await prismadb.clients.create({
      data: {
        friendlyId,
        organizationId: context.organizationId,
        createdBy: context.createdById,
        updatedBy: context.createdById,
        client_name: name,
        primary_email: email || null,
        primary_phone: phone || null,
        secondary_email: secondaryEmail || null,
        secondary_phone: secondaryPhone || null,
        client_status: status || "LEAD",
        client_type: type || null,
        person_type: personType || null,
        assigned_to: assignedTo || null,
        company_name: companyName || null,
        full_name: fullName || null,
        language: language || null,
        lead_source: leadSource || null,
        channels: channels || [],
        gdpr_consent: gdprConsent || false,
        allow_marketing: allowMarketing || false,
        description: description || null,
        billing_street: billingStreet || null,
        billing_city: billingCity || null,
        billing_state: billingState || null,
        billing_postal_code: billingPostalCode || null,
        billing_country: billingCountry || null,
        draft_status: false,
      },
      select: {
        id: true,
        client_name: true,
        primary_email: true,
        primary_phone: true,
        client_status: true,
        client_type: true,
        person_type: true,
        assigned_to: true,
        createdAt: true,
      },
    });

    // Dispatch webhook
    dispatchClientWebhook(context.organizationId, "client.created", client).catch(console.error);

    return createApiSuccessResponse(
      {
        client: {
          id: client.id,
          name: client.client_name,
          email: client.primary_email,
          phone: client.primary_phone,
          status: client.client_status,
          type: client.client_type,
          personType: client.person_type,
          assignedTo: client.assigned_to,
          createdAt: client.createdAt.toISOString(),
        },
      },
      201
    );
  },
  { requiredScopes: [API_SCOPES.CRM_WRITE] }
);

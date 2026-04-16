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
import { decryptContactForOrg, encryptContactForOrg } from "@/lib/model-encryption";

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
      where.status = filters.status;
    }

    if (filters.type) {
      where.category = filters.type;
    }

    if (filters.assignedTo) {
      where.assignedAgentId = filters.assignedTo;
    }

    if (filters.search) {
      where.OR = [
        { displayName: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
        { primaryPhone: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Fetch contacts
    const contacts = await prismadb.contact.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: "desc" },
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
        assignedAgent: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const hasMore = contacts.length > limit;
    const items = hasMore ? contacts.slice(0, -1) : contacts;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    // Decrypt encrypted contact fields
    const decryptedItems = await Promise.all(
      items.map((c) => decryptContactForOrg(c, context.organizationId))
    );

    return createApiSuccessResponse(
      {
        clients: decryptedItems.map((client) => ({
          id: client.id,
          name: client.displayName,
          email: client.email,
          phone: client.primaryPhone,
          status: client.status,
          type: client.category,
          personType: client.isCompany ? "company" : "individual",
          assignedTo: (client as Record<string, unknown>).assignedAgent,
          createdAt: (client.createdAt as Date).toISOString(),
          updatedAt: (client.updatedAt as Date | null)?.toISOString(),
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
      language,
      leadSource,
      gdprConsent,
      allowMarketing,
      description,
    } = body;

    // Validate required fields
    if (!name) {
      return createApiErrorResponse("Missing required field: name", 400);
    }

    // Generate friendly ID
    const friendlyId = await generateFriendlyId(prismadb, "Contact", context.organizationId);

    const rawData = {
      displayName: name,
      email: email || null,
      primaryPhone: phone || null,
      secondaryEmail: secondaryEmail || null,
      secondaryPhone: secondaryPhone || null,
      status: status || "LEAD",
      category: type || null,
      isCompany: personType === "company",
      assignedAgentId: assignedTo || null,
      companyName: companyName || null,
      languagePreference: language || null,
      source: leadSource || null,
      gdprConsentGiven: gdprConsent || false,
      allowMarketing: allowMarketing || false,
      description: description || null,
    };

    const encrypted = await encryptContactForOrg(rawData, context.organizationId);

    // Create contact
    const contact = await prismadb.contact.create({
      data: {
        friendlyId,
        organizationId: context.organizationId,
        createdBy: context.createdById,
        updatedBy: context.createdById,
        ...rawData,
        ...encrypted,
      },
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
      },
    });

    // Dispatch webhook
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatchClientWebhook(context.organizationId, "client.created", contact as any).catch(console.error);

    return createApiSuccessResponse(
      {
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
        },
      },
      201
    );
  },
  { requiredScopes: [API_SCOPES.CRM_WRITE] }
);

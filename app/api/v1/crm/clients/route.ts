import { NextRequest } from "next/server";
import { z } from "zod";
import { ClientStatus, ClientType, PersonType, LeadSource, Language } from "@prisma/client";
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
import { decryptClientForOrg, encryptClientForOrg } from "@/lib/model-encryption";

/**
 * Zod schema for external API client creation.
 * Uses camelCase field names matching the public API contract.
 * Enum validation via z.nativeEnum() keeps values in sync with Prisma schema.
 */
const createClientApiSchema = z.object({
  name: z.string().min(1, "name is required").max(255),
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

    // Validate input with Zod — rejects unknown fields and validates enums
    const parsed = createClientApiSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      return createApiErrorResponse(
        `Validation failed: ${Object.entries(fieldErrors).map(([k, v]) => `${k}: ${v?.join(", ")}`).join("; ")}`,
        400
      );
    }

    const v = parsed.data;

    // Generate friendly ID
    const friendlyId = await generateFriendlyId(prismadb, "Clients", context.organizationId);

    // Encrypt PII fields before writing to DB (matches internal API behavior)
    const rawData = {
      friendlyId,
      organizationId: context.organizationId,
      createdBy: context.createdById,
      updatedBy: context.createdById,
      client_name: v.name,
      primary_email: v.email || null,
      primary_phone: v.phone || null,
      secondary_email: v.secondaryEmail || null,
      secondary_phone: v.secondaryPhone || null,
      client_status: v.status || "LEAD",
      client_type: v.type || null,
      person_type: v.personType || null,
      assigned_to: v.assignedTo || null,
      company_name: v.companyName || null,
      full_name: v.fullName || null,
      language: v.language || null,
      lead_source: v.leadSource || null,
      channels: v.channels || [],
      gdpr_consent: v.gdprConsent || false,
      allow_marketing: v.allowMarketing || false,
      description: v.description || null,
      billing_street: v.billingStreet || null,
      billing_city: v.billingCity || null,
      billing_state: v.billingState || null,
      billing_postal_code: v.billingPostalCode || null,
      billing_country: v.billingCountry || null,
      draft_status: false,
    };
    const encryptedData = await encryptClientForOrg(rawData, context.organizationId);

    // Create client
    const client = await prismadb.clients.create({
      data: encryptedData,
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

    // Dispatch webhook with plaintext values (not encrypted DB values)
    dispatchClientWebhook(context.organizationId, "client.created", {
      id: client.id,
      client_name: v.name,
      primary_email: v.email ?? null,
      client_status: client.client_status,
      client_type: client.client_type,
      assigned_to: client.assigned_to,
    }).catch(console.error);

    // Response also uses plaintext (DB select returns ciphertext)
    return createApiSuccessResponse(
      {
        client: {
          id: client.id,
          name: v.name,
          email: v.email ?? null,
          phone: v.phone ?? null,
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

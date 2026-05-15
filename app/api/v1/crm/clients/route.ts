import { NextRequest } from "next/server";
import { z } from "zod";
import { ContactStatus, ContactSource, ContactCategory, PersonType, Language } from "@prisma/client";
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

const createClientApiSchema = z.object({
  name: z.string().min(1, "name is required").max(255),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  secondaryEmail: z.string().email().optional().nullable(),
  secondaryPhone: z.string().max(50).optional().nullable(),
  status: z.nativeEnum(ContactStatus).optional(),
  type: z.nativeEnum(ContactCategory).optional().nullable(),
  personType: z.nativeEnum(PersonType).optional().nullable(),
  assignedTo: z.string().min(1).optional().nullable(),
  companyName: z.string().max(255).optional().nullable(),
  language: z.nativeEnum(Language).optional().nullable(),
  leadSource: z.nativeEnum(ContactSource).optional().nullable(),
  gdprConsent: z.boolean().optional(),
  allowMarketing: z.boolean().optional(),
  description: z.string().optional().nullable(),
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
      const statusParsed = z.nativeEnum(ContactStatus).safeParse(filters.status);
      if (!statusParsed.success) return createApiErrorResponse(`Invalid status: ${filters.status}`, 400);
      where.status = statusParsed.data;
    }

    if (filters.type) {
      const typeParsed = z.nativeEnum(ContactCategory).safeParse(filters.type);
      if (!typeParsed.success) return createApiErrorResponse(`Invalid type: ${filters.type}`, 400);
      where.category = { has: typeParsed.data };
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
    let body: unknown;
    try { body = await req.json(); } catch {
      return createApiErrorResponse("Invalid request body: must be valid JSON", 400);
    }

    const parsed = createClientApiSchema.safeParse(body);
    if (!parsed.success) {
      const details = Object.entries(parsed.error.flatten().fieldErrors)
        .map(([k, v]) => `${k}: ${(v ?? []).join(", ")}`)
        .join("; ");
      return createApiErrorResponse(`Validation failed: ${details}`, 400);
    }

    const v = parsed.data;

    // Verify assignedTo user exists AND belongs to this organization
    if (v.assignedTo) {
      const { validateOrgUser } = await import("@/lib/external-api-middleware");
      const userCheck = await validateOrgUser(v.assignedTo, context.organizationId);
      if (!userCheck.valid) {
        return createApiErrorResponse(`assignedTo: ${userCheck.error}`, 400);
      }
    }

    // Generate friendly ID
    const friendlyId = await generateFriendlyId(prismadb, "Contact", context.organizationId);

    const rawData = {
      displayName: v.name,
      email: v.email ?? null,
      primaryPhone: v.phone ?? null,
      secondaryEmail: v.secondaryEmail ?? null,
      secondaryPhone: v.secondaryPhone ?? null,
      status: v.status ?? "LEAD",
      category: v.type ? [v.type] : [],
      isCompany: v.personType === "COMPANY",
      assignedAgentId: v.assignedTo ?? null,
      companyName: v.companyName ?? null,
      languagePreference: v.language ?? null,
      source: v.leadSource ?? null,
      gdprConsentGiven: v.gdprConsent ?? false,
      allowMarketing: v.allowMarketing ?? false,
      description: v.description ?? null,
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

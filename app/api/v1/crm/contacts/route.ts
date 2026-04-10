import { NextRequest } from "next/server";
import { z } from "zod";
import { ContactStatus, ContactSource, PersonType, Language, ItemVisibility } from "@prisma/client";
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
import { dispatchContactWebhook } from "@/lib/webhooks";
import { decryptContactForOrg, encryptContactForOrg } from "@/lib/model-encryption";

/**
 * Zod schema for external API contact creation.
 * Uses camelCase field names matching the public API contract.
 */
const createContactApiSchema = z.object({
  displayName: z.string().min(1, "displayName is required").max(255),
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
 * GET /api/v1/crm/contacts
 * List contacts for the organization
 */
export const GET = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const { cursor, limit } = parsePaginationParams(req);
    const filters = parseFilterParams(req, ["status", "category", "search", "assignedAgentId"]);

    const where: Record<string, unknown> = {
      organizationId: context.organizationId,
      deletedAt: null,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.category) {
      where.category = { has: filters.category };
    }

    if (filters.assignedAgentId) {
      where.assignedAgentId = filters.assignedAgentId;
    }

    const contacts = await prismadb.contact.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        friendlyId: true,
        displayName: true,
        firstName: true,
        lastName: true,
        isCompany: true,
        companyName: true,
        email: true,
        primaryPhone: true,
        status: true,
        category: true,
        source: true,
        visibility: true,
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

    // Post-decrypt search (displayName / email are encrypted)
    let results = decryptedItems;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = decryptedItems.filter(
        (c) =>
          c.displayName?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.primaryPhone?.includes(q) ||
          c.companyName?.toLowerCase().includes(q)
      );
    }

    return createApiSuccessResponse(
      {
        contacts: results.map((contact) => ({
          id: contact.id,
          friendlyId: contact.friendlyId,
          displayName: contact.displayName,
          firstName: contact.firstName,
          lastName: contact.lastName,
          isCompany: contact.isCompany,
          companyName: contact.companyName,
          email: contact.email,
          primaryPhone: contact.primaryPhone,
          status: contact.status,
          category: contact.category,
          source: contact.source,
          visibility: contact.visibility,
          assignedTo: contact.assignedAgent,
          createdAt: contact.createdAt.toISOString(),
          updatedAt: contact.updatedAt?.toISOString(),
        })),
      },
      200,
      { nextCursor, hasMore, limit }
    );
  },
  { requiredScopes: [API_SCOPES.CRM_READ] }
);

/**
 * POST /api/v1/crm/contacts
 * Create a new contact
 */
export const POST = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const body = await req.json();

    const parsed = createContactApiSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      return createApiErrorResponse(
        `Validation failed: ${Object.entries(fieldErrors).map(([k, v]) => `${k}: ${v?.join(", ")}`).join("; ")}`,
        400
      );
    }

    const v = parsed.data;

    const friendlyId = await generateFriendlyId(prismadb, "Contact", context.organizationId);

    const rawData = {
      displayName: v.displayName,
      firstName: v.firstName ?? null,
      lastName: v.lastName ?? null,
      companyName: v.companyName ?? null,
      email: v.email ?? null,
      primaryPhone: v.primaryPhone ?? null,
      secondaryEmail: v.secondaryEmail ?? null,
      secondaryPhone: v.secondaryPhone ?? null,
      notes: v.notes ?? null,
    };
    const encrypted = await encryptContactForOrg(rawData, context.organizationId);

    const contact = await prismadb.contact.create({
      data: {
        organizationId: context.organizationId,
        friendlyId,
        createdBy: context.createdById,
        updatedBy: context.createdById,
        ...encrypted,
        isCompany: v.isCompany ?? false,
        category: v.category ?? [],
        status: v.status ?? "LEAD",
        source: v.source ?? null,
        visibility: v.visibility ?? "PRIVATE",
        assignedAgentId: v.assignedAgentId ?? null,
        languagePreference: v.languagePreference ?? null,
        gdprConsentGiven: v.gdprConsentGiven ?? false,
        gdprConsentDate: v.gdprConsentGiven ? new Date() : null,
        allowMarketing: v.allowMarketing ?? false,
        tags: v.tags ?? [],
      },
      select: {
        id: true,
        friendlyId: true,
        displayName: true,
        email: true,
        primaryPhone: true,
        status: true,
        category: true,
        assignedAgentId: true,
        createdAt: true,
      },
    });

    dispatchContactWebhook(context.organizationId, "contact.created", {
      id: contact.id,
      displayName: v.displayName,
      email: v.email ?? null,
      status: contact.status,
      category: contact.category,
      assignedAgentId: contact.assignedAgentId,
    }).catch(console.error);

    return createApiSuccessResponse(
      {
        contact: {
          id: contact.id,
          friendlyId: contact.friendlyId,
          displayName: v.displayName,
          email: v.email ?? null,
          primaryPhone: v.primaryPhone ?? null,
          status: contact.status,
          category: contact.category,
          assignedAgentId: contact.assignedAgentId,
          createdAt: contact.createdAt.toISOString(),
        },
      },
      201
    );
  },
  { requiredScopes: [API_SCOPES.CRM_WRITE] }
);

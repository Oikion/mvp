import { NextRequest } from "next/server";
import { z } from "zod";
import {
  ItemVisibility,
  PropertyType,
  PropertyStatus,
  TransactionType,
  PropertyCondition,
  HeatingType,
  EnergyCertClass,
  PriceType,
} from "@prisma/client";
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
import { dispatchPropertyWebhook } from "@/lib/webhooks";

/**
 * Zod schema for external API property creation.
 * Uses camelCase field names matching the public API contract.
 * All enums validated via z.nativeEnum() — invalid values return 400 instead of 500.
 */
const createPropertyApiSchema = z.object({
  name: z.string().min(1, "name is required").max(255),
  type: z.nativeEnum(PropertyType).optional().nullable(),
  status: z.nativeEnum(PropertyStatus).optional(),
  transactionType: z.nativeEnum(TransactionType).optional().nullable(),
  price: z.number().min(0).optional().nullable(),
  priceType: z.nativeEnum(PriceType).optional().nullable(),
  addressStreet: z.string().max(255).optional().nullable(),
  addressCity: z.string().max(100).optional().nullable(),
  addressState: z.string().max(100).optional().nullable(),
  addressZip: z.string().max(20).optional().nullable(),
  bedrooms: z.number().int().min(0).optional().nullable(),
  bathrooms: z.number().min(0).optional().nullable(),
  sizeNetSqm: z.number().min(0).optional().nullable(),
  sizeGrossSqm: z.number().min(0).optional().nullable(),
  floor: z.string().max(50).optional().nullable(),
  floorsTotal: z.number().int().min(0).optional().nullable(),
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear() + 5).optional().nullable(),
  condition: z.nativeEnum(PropertyCondition).optional().nullable(),
  heatingType: z.nativeEnum(HeatingType).optional().nullable(),
  energyCertClass: z.nativeEnum(EnergyCertClass).optional().nullable(),
  elevator: z.boolean().optional().nullable(),
  amenities: z.array(z.string()).optional().nullable(),
  description: z.string().optional().nullable(),
  assignedTo: z.string().min(1).optional().nullable(),
  isExclusive: z.boolean().optional(),
  portalVisibility: z.nativeEnum(ItemVisibility).optional(),
}).strict();

/**
 * GET /api/v1/mls/properties
 * List properties for the organization
 */
export const GET = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const { cursor, limit } = parsePaginationParams(req);
    const filters = parseFilterParams(req, [
      "status",
      "type",
      "transactionType",
      "search",
      "assignedTo",
      "minPrice",
      "maxPrice",
    ]);

    // Build where clause
    const where: Record<string, unknown> = {
      organizationId: context.organizationId,
    };

    if (filters.status) {
      const parsed = z.nativeEnum(PropertyStatus).safeParse(filters.status);
      if (!parsed.success) return createApiErrorResponse(`Invalid status: ${filters.status}`, 400);
      where.property_status = parsed.data;
    }

    if (filters.type) {
      const parsed = z.nativeEnum(PropertyType).safeParse(filters.type);
      if (!parsed.success) return createApiErrorResponse(`Invalid type: ${filters.type}`, 400);
      where.property_type = parsed.data;
    }

    if (filters.transactionType) {
      const parsed = z.nativeEnum(TransactionType).safeParse(filters.transactionType);
      if (!parsed.success) return createApiErrorResponse(`Invalid transactionType: ${filters.transactionType}`, 400);
      where.transaction_type = parsed.data;
    }

    if (filters.assignedTo) {
      where.assigned_to = filters.assignedTo;
    }

    if (filters.search) {
      where.OR = [
        { property_name: { contains: filters.search, mode: "insensitive" } },
        { address_city: { contains: filters.search, mode: "insensitive" } },
        { address_street: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Price range filter
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) {
        const min = Number(filters.minPrice);
        if (isNaN(min) || min < 0) return createApiErrorResponse("Invalid minPrice: must be a non-negative number", 400);
        (where.price as Record<string, number>).gte = min;
      }
      if (filters.maxPrice !== undefined) {
        const max = Number(filters.maxPrice);
        if (isNaN(max) || max < 0) return createApiErrorResponse("Invalid maxPrice: must be a non-negative number", 400);
        (where.price as Record<string, number>).lte = max;
      }
    }

    // Fetch properties
    const properties = await prismadb.properties.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        property_name: true,
        property_type: true,
        property_status: true,
        transaction_type: true,
        price: true,
        price_type: true,
        address_street: true,
        address_city: true,
        address_state: true,
        address_zip: true,
        bedrooms: true,
        bathrooms: true,
        size_net_sqm: true,
        assigned_to: true,
        createdAt: true,
        updatedAt: true,
        Users_Properties_assigned_toToUsers: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const hasMore = properties.length > limit;
    const items = hasMore ? properties.slice(0, -1) : properties;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return createApiSuccessResponse(
      {
        properties: items.map((property) => ({
          id: property.id,
          name: property.property_name,
          type: property.property_type,
          status: property.property_status,
          transactionType: property.transaction_type,
          price: property.price,
          priceType: property.price_type,
          address: {
            street: property.address_street,
            city: property.address_city,
            state: property.address_state,
            zip: property.address_zip,
          },
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          sizeNetSqm: property.size_net_sqm,
          assignedTo: property.Users_Properties_assigned_toToUsers,
          createdAt: property.createdAt.toISOString(),
          updatedAt: property.updatedAt?.toISOString(),
        })),
      },
      200,
      { nextCursor, hasMore, limit }
    );
  },
  { requiredScopes: [API_SCOPES.MLS_READ] }
);

/**
 * POST /api/v1/mls/properties
 * Create a new property
 */
export const POST = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    let body: unknown;
    try { body = await req.json(); } catch {
      return createApiErrorResponse("Invalid request body: must be valid JSON", 400);
    }

    // Validate input with Zod — rejects unknown fields and validates all enums
    const parsed = createPropertyApiSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const details = Object.entries(fieldErrors)
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
    const friendlyId = await generateFriendlyId(prismadb, "Properties", context.organizationId);

    // Create property
    const property = await prismadb.properties.create({
      data: {
        friendlyId,
        organizationId: context.organizationId,
        createdBy: context.createdById,
        updatedBy: context.createdById,
        property_name: v.name,
        property_type: v.type ?? null,
        property_status: v.status ?? "ACTIVE",
        transaction_type: v.transactionType ?? null,
        price: v.price ?? null,
        price_type: v.priceType ?? null,
        address_street: v.addressStreet ?? null,
        address_city: v.addressCity ?? null,
        address_state: v.addressState ?? null,
        address_zip: v.addressZip ?? null,
        bedrooms: v.bedrooms ?? null,
        bathrooms: v.bathrooms ?? null,
        size_net_sqm: v.sizeNetSqm ?? null,
        size_gross_sqm: v.sizeGrossSqm ?? null,
        floor: v.floor ?? null,
        floors_total: v.floorsTotal ?? null,
        year_built: v.yearBuilt ?? null,
        condition: v.condition ?? null,
        heating_type: v.heatingType ?? null,
        energy_cert_class: v.energyCertClass ?? null,
        elevator: v.elevator ?? null,
        amenities: v.amenities ?? undefined,
        description: v.description ?? null,
        assigned_to: v.assignedTo ?? null,
        is_exclusive: v.isExclusive ?? false,
        visibility: v.portalVisibility ?? "PRIVATE",
        draft_status: false,
      },
      select: {
        id: true,
        property_name: true,
        property_type: true,
        property_status: true,
        transaction_type: true,
        price: true,
        assigned_to: true,
        createdAt: true,
      },
    });

    // Dispatch webhook
    dispatchPropertyWebhook(context.organizationId, "property.created", property).catch(
      console.error
    );

    return createApiSuccessResponse(
      {
        property: {
          id: property.id,
          name: property.property_name,
          type: property.property_type,
          status: property.property_status,
          transactionType: property.transaction_type,
          price: property.price,
          assignedTo: property.assigned_to,
          createdAt: property.createdAt.toISOString(),
        },
      },
      201
    );
  },
  { requiredScopes: [API_SCOPES.MLS_WRITE] }
);

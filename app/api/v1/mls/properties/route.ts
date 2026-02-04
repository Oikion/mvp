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
import { dispatchPropertyWebhook } from "@/lib/webhooks";

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
      where.property_status = filters.status;
    }

    if (filters.type) {
      where.property_type = filters.type;
    }

    if (filters.transactionType) {
      where.transaction_type = filters.transactionType;
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
    if (filters.minPrice || filters.maxPrice) {
      where.price = {};
      if (filters.minPrice) {
        (where.price as Record<string, number>).gte = parseInt(filters.minPrice, 10);
      }
      if (filters.maxPrice) {
        (where.price as Record<string, number>).lte = parseInt(filters.maxPrice, 10);
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
    const body = await req.json();

    const {
      name,
      type,
      status,
      transactionType,
      price,
      priceType,
      addressStreet,
      addressCity,
      addressState,
      addressZip,
      bedrooms,
      bathrooms,
      sizeNetSqm,
      sizeGrossSqm,
      floor,
      floorsTotal,
      yearBuilt,
      condition,
      heatingType,
      energyCertClass,
      elevator,
      amenities,
      description,
      assignedTo,
      isExclusive,
      portalVisibility,
    } = body;

    // Validate required fields
    if (!name) {
      return createApiErrorResponse("Missing required field: name", 400);
    }

    // Generate friendly ID
    const propertyId = await generateFriendlyId(prismadb, "Properties");

    // Create property
    const property = await prismadb.properties.create({
      data: {
        id: propertyId,
        organizationId: context.organizationId,
        createdBy: context.createdById,
        updatedBy: context.createdById,
        property_name: name,
        property_type: type || null,
        property_status: status || "ACTIVE",
        transaction_type: transactionType || null,
        price: price || null,
        price_type: priceType || null,
        address_street: addressStreet || null,
        address_city: addressCity || null,
        address_state: addressState || null,
        address_zip: addressZip || null,
        bedrooms: bedrooms || null,
        bathrooms: bathrooms || null,
        size_net_sqm: sizeNetSqm || null,
        size_gross_sqm: sizeGrossSqm || null,
        floor: floor || null,
        floors_total: floorsTotal || null,
        year_built: yearBuilt || null,
        condition: condition || null,
        heating_type: heatingType || null,
        energy_cert_class: energyCertClass || null,
        elevator: elevator || null,
        amenities: amenities || null,
        description: description || null,
        assigned_to: assignedTo || null,
        is_exclusive: isExclusive || false,
        portal_visibility: portalVisibility || "PRIVATE",
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

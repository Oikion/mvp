"use server";

/**
 * AI Tool Actions - MLS (Properties)
 *
 * Property operations for AI tool execution.
 * These functions receive context directly from the AI executor.
 */

import { prismadb } from "@/lib/prisma";
import { createId } from "@paralleldrive/cuid2";
import type { PropertyType, PropertyStatus } from "@prisma/client";
import {
  type AIToolInput,
  type AIToolResponse,
  extractContext,
  validateContext,
  missingContextError,
  successResponse,
  errorResponse,
} from "./types";

// ============================================
// Types
// ============================================

interface ListPropertiesInput {
  status?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}

interface GetPropertyDetailsInput {
  propertyId: string;
}

interface CreatePropertyInput {
  name: string;
  type?: string;
  status?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  description?: string;
  features?: string[];
}

interface SearchPropertiesSemanticInput {
  query: string;
  limit?: number;
}

// ============================================
// Property Functions
// ============================================

/**
 * List MLS properties with optional filtering
 */
export async function listProperties(
  input: AIToolInput<ListPropertiesInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const limit = Math.min(input.limit || 20, 100);
    const { status, type, minPrice, maxPrice, city, search, cursor } = input;

    const where: Record<string, unknown> = {
      organizationId: context.organizationId,
    };

    if (status) {
      where.property_status = status;
    }

    if (type) {
      where.property_type = type;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        (where.price as Record<string, number>).gte = minPrice;
      }
      if (maxPrice !== undefined) {
        (where.price as Record<string, number>).lte = maxPrice;
      }
    }

    if (city) {
      where.address_city = { contains: city, mode: "insensitive" };
    }

    if (search) {
      where.OR = [
        { property_name: { contains: search, mode: "insensitive" } },
        { address_street: { contains: search, mode: "insensitive" } },
        { address_city: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

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
        price: true,
        bedrooms: true,
        bathrooms: true,
        square_feet: true,
        address_street: true,
        address_city: true,
        address_state: true,
        address_zip: true,
        createdAt: true,
        updatedAt: true,
        Users_Properties_assigned_toToUsers: {
          select: { id: true, name: true },
        },
        Documents: {
          where: {
            document_file_mimeType: { startsWith: "image/" },
          },
          select: { document_file_url: true },
          take: 1,
        },
      },
    });

    const hasMore = properties.length > limit;
    const items = hasMore ? properties.slice(0, -1) : properties;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return successResponse({
      properties: items.map((property) => ({
        id: property.id,
        name: property.property_name,
        type: property.property_type,
        status: property.property_status,
        price: property.price ? Number(property.price) : null,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        area: property.square_feet ? Number(property.square_feet) : null,
        address: {
          street: property.address_street,
          city: property.address_city,
          state: property.address_state,
          postalCode: property.address_zip,
        },
        assignedTo: property.Users_Properties_assigned_toToUsers,
        thumbnailUrl: property.Documents[0]?.document_file_url || null,
        createdAt: property.createdAt.toISOString(),
        updatedAt: property.updatedAt?.toISOString() ?? null,
      })),
      pagination: {
        hasMore,
        nextCursor,
        limit,
      },
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to list properties"
    );
  }
}

/**
 * Get detailed information about a specific property
 */
export async function getPropertyDetails(
  input: AIToolInput<GetPropertyDetailsInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const { propertyId } = input;

    if (!propertyId) {
      return errorResponse("Missing required field: propertyId");
    }

    const property = await prismadb.properties.findFirst({
      where: {
        id: propertyId,
        organizationId: context.organizationId,
      },
      include: {
        Users_Properties_assigned_toToUsers: {
          select: { id: true, name: true, email: true },
        },
        Client_Properties: {
          select: {
            Clients: {
              select: {
                id: true,
                client_name: true,
                client_type: true,
                primary_email: true,
              },
            },
          },
          take: 10,
        },
        CalendarEvent: {
          select: {
            id: true,
            title: true,
            startTime: true,
            status: true,
            eventType: true,
          },
          orderBy: { startTime: "desc" },
          take: 5,
        },
        Documents: {
          select: {
            id: true,
            document_name: true,
            document_type: true,
            document_file_url: true,
            document_file_mimeType: true,
            createdAt: true,
          },
          take: 20,
        },
      },
    });

    if (!property) {
      return errorResponse("Property not found");
    }

    return successResponse({
      property: {
        id: property.id,
        name: property.property_name,
        type: property.property_type,
        status: property.property_status,
        price: property.price ? Number(property.price) : null,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        area: property.square_feet ? Number(property.square_feet) : null,
        lotSize: property.lot_size ? Number(property.lot_size) : null,
        yearBuilt: property.year_built,
        description: property.description,
        amenities: property.amenities,
        address: {
          street: property.address_street,
          city: property.address_city,
          state: property.address_state,
          postalCode: property.address_zip,
        },
        assignedTo: property.Users_Properties_assigned_toToUsers,
        linkedClients: property.Client_Properties.map((cp) => ({
          id: cp.Clients.id,
          name: cp.Clients.client_name,
          type: cp.Clients.client_type,
          email: cp.Clients.primary_email,
        })),
        recentEvents: property.CalendarEvent.map((e) => ({
          id: e.id,
          title: e.title,
          startTime: e.startTime.toISOString(),
          status: e.status,
          eventType: e.eventType,
        })),
        documents: property.Documents.map((d) => ({
          id: d.id,
          name: d.document_name,
          type: d.document_type,
          url: d.document_file_url,
          mimeType: d.document_file_mimeType,
          createdAt: d.createdAt?.toISOString() ?? null,
        })),
        images: property.Documents.filter((d) =>
          d.document_file_mimeType?.startsWith("image/")
        ).map((d) => d.document_file_url),
        createdAt: property.createdAt.toISOString(),
        updatedAt: property.updatedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to get property details"
    );
  }
}

/**
 * Create a new property listing
 */
export async function createProperty(
  input: AIToolInput<CreatePropertyInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const {
      name,
      type,
      status,
      price,
      bedrooms,
      bathrooms,
      area,
      address,
      description,
      features,
    } = input;

    if (!name) {
      return errorResponse("Missing required field: name");
    }

    const property = await prismadb.properties.create({
      data: {
        id: createId(),
        organizationId: context.organizationId,
        property_name: name,
        property_type: (type as PropertyType) || "RESIDENTIAL",
        property_status: (status as PropertyStatus) || "ACTIVE",
        price: price || null,
        bedrooms: bedrooms || null,
        bathrooms: bathrooms || null,
        square_feet: area || null,
        address_street: address?.street || null,
        address_city: address?.city || null,
        address_state: address?.state || null,
        address_zip: address?.postalCode || null,
        description: description || null,
        amenities: features ? { items: features } : undefined,
        assigned_to: context.userId || null,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        property_name: true,
        property_type: true,
        property_status: true,
        price: true,
        bedrooms: true,
        bathrooms: true,
        square_feet: true,
        address_city: true,
        createdAt: true,
      },
    });

    return successResponse(
      {
        property: {
          id: property.id,
          name: property.property_name,
          type: property.property_type,
          status: property.property_status,
          price: property.price ? Number(property.price) : null,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          area: property.square_feet ? Number(property.square_feet) : null,
          city: property.address_city,
          createdAt: property.createdAt.toISOString(),
        },
      },
      `Property "${name}" created successfully`
    );
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to create property"
    );
  }
}

/**
 * Search properties using semantic/text search
 */
export async function searchPropertiesSemantic(
  input: AIToolInput<SearchPropertiesSemanticInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const { query, limit = 10 } = input;

    if (!query) {
      return errorResponse("Missing required field: query");
    }

    // For now, use text search. In future, this could use vector embeddings
    const properties = await prismadb.properties.findMany({
      where: {
        organizationId: context.organizationId,
        OR: [
          { property_name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { address_city: { contains: query, mode: "insensitive" } },
          { address_street: { contains: query, mode: "insensitive" } },
        ],
      },
      take: limit,
      select: {
        id: true,
        property_name: true,
        property_type: true,
        property_status: true,
        price: true,
        bedrooms: true,
        bathrooms: true,
        address_city: true,
        description: true,
      },
    });

    return successResponse({
      query,
      results: properties.map((property) => ({
        id: property.id,
        name: property.property_name,
        type: property.property_type,
        status: property.property_status,
        price: property.price ? Number(property.price) : null,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        city: property.address_city,
        description: property.description,
      })),
      totalResults: properties.length,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to search properties"
    );
  }
}

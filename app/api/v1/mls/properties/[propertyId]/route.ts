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
  ExternalApiContext,
} from "@/lib/external-api-middleware";
import { dispatchPropertyWebhook } from "@/lib/webhooks";
import { deleteEntitySessionsForEntity } from "@/lib/entity-session/entity-session-service";

/**
 * Zod schema for external API property update.
 * All fields optional (partial update). Validates enums and rejects unknown fields.
 */
const updatePropertyApiSchema = z.object({
  name: z.string().min(1).max(255).optional(),
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
 * GET /api/v1/mls/properties/[propertyId]
 * Get a single property
 */
export const GET = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const url = new URL(req.url);
    const propertyId = url.pathname.split("/").pop();

    if (!propertyId) {
      return createApiErrorResponse("Property ID is required", 400);
    }

    const property = await prismadb.properties.findFirst({
      where: {
        organizationId: context.organizationId,
        friendlyId: propertyId,
      },
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
        municipality: true,
        area: true,
        postal_code: true,
        bedrooms: true,
        bathrooms: true,
        size_net_sqm: true,
        size_gross_sqm: true,
        plot_size_sqm: true,
        floor: true,
        floors_total: true,
        year_built: true,
        renovated_year: true,
        condition: true,
        heating_type: true,
        energy_cert_class: true,
        elevator: true,
        amenities: true,
        orientation: true,
        furnished: true,
        description: true,
        assigned_to: true,
        is_exclusive: true,
        visibility: true,
        available_from: true,
        accepts_pets: true,
        min_lease_months: true,
        monthly_common_charges: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
        Users_Properties_assigned_toToUsers: {
          select: { id: true, name: true, email: true },
        },
        Documents: {
          where: {
            document_file_mimeType: { startsWith: "image/" },
          },
          select: {
            id: true,
            document_name: true,
            document_file_url: true,
          },
          take: 10,
        },
      },
    });

    if (!property) {
      return createApiErrorResponse("Property not found", 404);
    }

    if (property.archivedAt) {
      return createApiErrorResponse("This resource has been archived and is no longer available.", 410);
    }

    return createApiSuccessResponse({
      property: {
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
          municipality: property.municipality,
          area: property.area,
          postalCode: property.postal_code,
        },
        specs: {
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          sizeNetSqm: property.size_net_sqm,
          sizeGrossSqm: property.size_gross_sqm,
          plotSizeSqm: property.plot_size_sqm,
          floor: property.floor,
          floorsTotal: property.floors_total,
        },
        details: {
          yearBuilt: property.year_built,
          renovatedYear: property.renovated_year,
          condition: property.condition,
          heatingType: property.heating_type,
          energyCertClass: property.energy_cert_class,
          elevator: property.elevator,
          amenities: property.amenities,
          orientation: property.orientation,
          furnished: property.furnished,
        },
        rental: {
          availableFrom: property.available_from?.toISOString(),
          acceptsPets: property.accepts_pets,
          minLeaseMonths: property.min_lease_months,
          monthlyCommonCharges: property.monthly_common_charges,
        },
        description: property.description,
        isExclusive: property.is_exclusive,
        portalVisibility: property.visibility,
        assignedTo: property.Users_Properties_assigned_toToUsers,
        images: property.Documents.map((d) => ({
          id: d.id,
          name: d.document_name,
          url: d.document_file_url,
        })),
        createdAt: property.createdAt.toISOString(),
        updatedAt: property.updatedAt?.toISOString(),
      },
    });
  },
  { requiredScopes: [API_SCOPES.MLS_READ] }
);

/**
 * PUT /api/v1/mls/properties/[propertyId]
 * Update a property
 */
export const PUT = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const url = new URL(req.url);
    const propertyId = url.pathname.split("/").pop();

    if (!propertyId) {
      return createApiErrorResponse("Property ID is required", 400);
    }

    // Verify property exists and belongs to organization
    const existingProperty = await prismadb.properties.findFirst({
      where: {
        organizationId: context.organizationId,
        friendlyId: propertyId,
      },
    });

    if (!existingProperty) {
      return createApiErrorResponse("Property not found", 404);
    }

    if (existingProperty.archivedAt) {
      return createApiErrorResponse("This resource has been archived and is no longer available.", 410);
    }

    const body = await req.json();

    // Validate input with Zod — rejects unknown fields and validates all enums
    const parsed = updatePropertyApiSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const details = Object.entries(fieldErrors)
        .map(([k, v]) => `${k}: ${(v ?? []).join(", ")}`)
        .join("; ");
      return createApiErrorResponse(`Validation failed: ${details}`, 400);
    }

    const v = parsed.data;

    // Build update data — only include fields that were provided
    const updateData: Record<string, unknown> = {
      updatedBy: context.createdById,
      updatedAt: new Date(),
    };

    if (v.name !== undefined) updateData.property_name = v.name;
    if (v.type !== undefined) updateData.property_type = v.type;
    if (v.status !== undefined) updateData.property_status = v.status;
    if (v.transactionType !== undefined) updateData.transaction_type = v.transactionType;
    if (v.price !== undefined) updateData.price = v.price;
    if (v.priceType !== undefined) updateData.price_type = v.priceType;
    if (v.addressStreet !== undefined) updateData.address_street = v.addressStreet;
    if (v.addressCity !== undefined) updateData.address_city = v.addressCity;
    if (v.addressState !== undefined) updateData.address_state = v.addressState;
    if (v.addressZip !== undefined) updateData.address_zip = v.addressZip;
    if (v.bedrooms !== undefined) updateData.bedrooms = v.bedrooms;
    if (v.bathrooms !== undefined) updateData.bathrooms = v.bathrooms;
    if (v.sizeNetSqm !== undefined) updateData.size_net_sqm = v.sizeNetSqm;
    if (v.sizeGrossSqm !== undefined) updateData.size_gross_sqm = v.sizeGrossSqm;
    if (v.floor !== undefined) updateData.floor = v.floor;
    if (v.floorsTotal !== undefined) updateData.floors_total = v.floorsTotal;
    if (v.yearBuilt !== undefined) updateData.year_built = v.yearBuilt;
    if (v.condition !== undefined) updateData.condition = v.condition;
    if (v.heatingType !== undefined) updateData.heating_type = v.heatingType;
    if (v.energyCertClass !== undefined) updateData.energy_cert_class = v.energyCertClass;
    if (v.elevator !== undefined) updateData.elevator = v.elevator;
    if (v.amenities !== undefined) updateData.amenities = v.amenities;
    if (v.description !== undefined) updateData.description = v.description;
    if (v.assignedTo !== undefined) updateData.assigned_to = v.assignedTo;
    if (v.isExclusive !== undefined) updateData.is_exclusive = v.isExclusive;
    if (v.portalVisibility !== undefined) updateData.visibility = v.portalVisibility;

    const property = await prismadb.properties.update({
      where: { id: existingProperty.id },
      data: updateData,
      select: {
        id: true,
        property_name: true,
        property_type: true,
        property_status: true,
        price: true,
        assigned_to: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Dispatch webhook
    dispatchPropertyWebhook(context.organizationId, "property.updated", property).catch(
      console.error
    );

    return createApiSuccessResponse({
      property: {
        id: property.id,
        name: property.property_name,
        type: property.property_type,
        status: property.property_status,
        price: property.price,
        assignedTo: property.assigned_to,
        createdAt: property.createdAt.toISOString(),
        updatedAt: property.updatedAt?.toISOString(),
      },
    });
  },
  { requiredScopes: [API_SCOPES.MLS_WRITE] }
);

/**
 * DELETE /api/v1/mls/properties/[propertyId]
 * Delete a property
 */
export const DELETE = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const url = new URL(req.url);
    const propertyId = url.pathname.split("/").pop();

    if (!propertyId) {
      return createApiErrorResponse("Property ID is required", 400);
    }

    // Verify property exists and belongs to organization
    const existingProperty = await prismadb.properties.findFirst({
      where: {
        organizationId: context.organizationId,
        friendlyId: propertyId,
      },
    });

    if (!existingProperty) {
      return createApiErrorResponse("Property not found", 404);
    }

    if (existingProperty.archivedAt) {
      return createApiErrorResponse("This resource has been archived and is no longer available.", 410);
    }

    // Archive property — invalidate entity sessions, then soft-archive
    await deleteEntitySessionsForEntity("PROPERTY", existingProperty.id);

    await prismadb.properties.update({
      where: { id: existingProperty.id },
      data: { archivedAt: new Date(), archivedBy: context.createdById },
    });

    // Dispatch webhook
    dispatchPropertyWebhook(context.organizationId, "property.archived", existingProperty).catch(
      console.error
    );

    return createApiSuccessResponse({
      message: "Property archived successfully",
      propertyId,
    });
  },
  { requiredScopes: [API_SCOPES.MLS_WRITE] }
);

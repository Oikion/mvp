import { NextRequest } from "next/server";
import { prismadb } from "@/lib/prisma";
import { API_SCOPES } from "@/lib/api-auth";
import {
  withExternalApi,
  createApiSuccessResponse,
  createApiErrorResponse,
  ExternalApiContext,
} from "@/lib/external-api-middleware";
import { dispatchPropertyWebhook } from "@/lib/webhooks";

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
        id: propertyId,
        organizationId: context.organizationId,
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
        portal_visibility: true,
        available_from: true,
        accepts_pets: true,
        min_lease_months: true,
        monthly_common_charges: true,
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
        portalVisibility: property.portal_visibility,
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
        id: propertyId,
        organizationId: context.organizationId,
      },
    });

    if (!existingProperty) {
      return createApiErrorResponse("Property not found", 404);
    }

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

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedBy: context.createdById,
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.property_name = name;
    if (type !== undefined) updateData.property_type = type;
    if (status !== undefined) updateData.property_status = status;
    if (transactionType !== undefined) updateData.transaction_type = transactionType;
    if (price !== undefined) updateData.price = price;
    if (priceType !== undefined) updateData.price_type = priceType;
    if (addressStreet !== undefined) updateData.address_street = addressStreet;
    if (addressCity !== undefined) updateData.address_city = addressCity;
    if (addressState !== undefined) updateData.address_state = addressState;
    if (addressZip !== undefined) updateData.address_zip = addressZip;
    if (bedrooms !== undefined) updateData.bedrooms = bedrooms;
    if (bathrooms !== undefined) updateData.bathrooms = bathrooms;
    if (sizeNetSqm !== undefined) updateData.size_net_sqm = sizeNetSqm;
    if (sizeGrossSqm !== undefined) updateData.size_gross_sqm = sizeGrossSqm;
    if (floor !== undefined) updateData.floor = floor;
    if (floorsTotal !== undefined) updateData.floors_total = floorsTotal;
    if (yearBuilt !== undefined) updateData.year_built = yearBuilt;
    if (condition !== undefined) updateData.condition = condition;
    if (heatingType !== undefined) updateData.heating_type = heatingType;
    if (energyCertClass !== undefined) updateData.energy_cert_class = energyCertClass;
    if (elevator !== undefined) updateData.elevator = elevator;
    if (amenities !== undefined) updateData.amenities = amenities;
    if (description !== undefined) updateData.description = description;
    if (assignedTo !== undefined) updateData.assigned_to = assignedTo;
    if (isExclusive !== undefined) updateData.is_exclusive = isExclusive;
    if (portalVisibility !== undefined) updateData.portal_visibility = portalVisibility;

    const property = await prismadb.properties.update({
      where: { id: propertyId },
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
        id: propertyId,
        organizationId: context.organizationId,
      },
    });

    if (!existingProperty) {
      return createApiErrorResponse("Property not found", 404);
    }

    // Delete property
    await prismadb.properties.delete({
      where: { id: propertyId },
    });

    // Dispatch webhook
    dispatchPropertyWebhook(context.organizationId, "property.deleted", existingProperty).catch(
      console.error
    );

    return createApiSuccessResponse({
      message: "Property deleted successfully",
      propertyId,
    });
  },
  { requiredScopes: [API_SCOPES.MLS_WRITE] }
);

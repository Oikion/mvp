import { NextRequest, NextResponse } from "next/server";
import { getInternalApiContext } from "@/lib/internal-api-auth";
import { prismadb } from "@/lib/prisma";
import { generateFriendlyId } from "@/lib/friendly-id";

/**
 * POST /api/internal/voice/create-property
 * Internal API for voice assistant to create a property
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getInternalApiContext(request);

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, organizationId, isAdminTest } = context;

    // Return mock response for admin testing (don't actually create)
    if (isAdminTest) {
      const body = await request.json();
      const propertyName = body.name || body.title || "Test Property";

      return NextResponse.json({
        success: true,
        property: {
          id: `test-prop-${Date.now()}`,
          name: propertyName,
          type: body.propertyType || null,
          transactionType: body.transactionType || null,
          price: body.price || null,
          municipality: body.municipality || null,
          bedrooms: body.bedrooms || null,
          size: body.sizeNetSqm || null,
          createdAt: new Date().toISOString(),
        },
        message: `Property "${propertyName}" would be created (test mode - no actual data created)`,
        _testMode: true,
      });
    }

    const body = await request.json();
    const {
      name,
      title,
      propertyType,
      transactionType,
      price,
      municipality,
      area,
      address,
      bedrooms,
      bathrooms,
      sizeNetSqm,
      floor,
      floorsTotal,
      yearBuilt,
      heatingType,
      condition,
      description,
      amenities,
    } = body;

    // Use name or title
    const propertyName = name || title;

    if (!propertyName) {
      return NextResponse.json(
        { error: "Property name/title is required" },
        { status: 400 }
      );
    }

    // Generate friendly ID
    const propertyId = await generateFriendlyId(prismadb, "Properties");

    // Create property
    const property = await prismadb.properties.create({
      data: {
        id: propertyId,
        organizationId,
        createdBy: userId,
        updatedBy: userId,
        property_name: propertyName,
        property_type: propertyType || null,
        transaction_type: transactionType || null,
        property_status: "ACTIVE",
        price: price || null,
        address_city: municipality || null,
        address_state: area || null,
        address_street: address || null,
        bedrooms: bedrooms || null,
        bathrooms: bathrooms || null,
        size_net_sqm: sizeNetSqm || null,
        floor: floor || null,
        floors_total: floorsTotal || null,
        year_built: yearBuilt || null,
        heating_type: heatingType || null,
        condition: condition || null,
        description: description || null,
        amenities: amenities || null,
        assigned_to: userId, // Assign to current user by default
        portal_visibility: "PRIVATE",
        draft_status: false,
      },
      select: {
        id: true,
        property_name: true,
        property_type: true,
        transaction_type: true,
        price: true,
        address_city: true,
        bedrooms: true,
        size_net_sqm: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      property: {
        id: property.id,
        name: property.property_name,
        type: property.property_type,
        transactionType: property.transaction_type,
        price: property.price,
        municipality: property.address_city,
        bedrooms: property.bedrooms,
        size: property.size_net_sqm,
        createdAt: property.createdAt.toISOString(),
      },
      message: `Property "${property.property_name}" created successfully`,
    });
  } catch (error) {
    console.error("[VOICE_CREATE_PROPERTY]", error);
    return NextResponse.json(
      { error: "Failed to create property" },
      { status: 500 }
    );
  }
}

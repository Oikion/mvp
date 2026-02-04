import { NextRequest, NextResponse } from "next/server";
import { getInternalApiContext } from "@/lib/internal-api-auth";
import { prismadb } from "@/lib/prisma";

/**
 * POST /api/internal/voice/search-properties
 * Internal API for voice assistant to search properties
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getInternalApiContext(request);

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, isAdminTest } = context;

    // Return mock data for admin testing
    if (isAdminTest) {
      return NextResponse.json({
        success: true,
        properties: [
          {
            id: "test-prop-1",
            name: "Test Apartment in Glyfada",
            type: "APARTMENT",
            transactionType: "SALE",
            status: "ACTIVE",
            price: 250000,
            priceFormatted: "€250.000",
            municipality: "Glyfada",
            area: "Attica",
            address: "Test Street 1",
            bedrooms: 2,
            bathrooms: 1,
            size: 85,
            lastUpdated: new Date().toISOString(),
          },
          {
            id: "test-prop-2",
            name: "Test House in Kifisia",
            type: "HOUSE",
            transactionType: "SALE",
            status: "ACTIVE",
            price: 450000,
            priceFormatted: "€450.000",
            municipality: "Kifisia",
            area: "Attica",
            address: "Test Avenue 5",
            bedrooms: 4,
            bathrooms: 2,
            size: 180,
            lastUpdated: new Date().toISOString(),
          },
        ],
        count: 2,
        message: "Found 2 properties (test mode)",
        _testMode: true,
      });
    }

    const body = await request.json();
    const {
      search,
      municipality,
      area,
      propertyType,
      transactionType,
      minPrice,
      maxPrice,
      minBedrooms,
      maxBedrooms,
      status,
      limit = 10,
    } = body;

    // Build where clause
    const where: Record<string, unknown> = {
      organizationId,
    };

    // Search term
    if (search) {
      where.OR = [
        { property_name: { contains: search, mode: "insensitive" } },
        { address_city: { contains: search, mode: "insensitive" } },
        { address_state: { contains: search, mode: "insensitive" } },
        { address_street: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Location filters
    if (municipality) {
      where.address_city = { contains: municipality, mode: "insensitive" };
    }
    if (area) {
      where.address_state = { contains: area, mode: "insensitive" };
    }

    // Type filters
    if (propertyType) {
      where.property_type = propertyType;
    }
    if (transactionType) {
      where.transaction_type = transactionType;
    }
    if (status) {
      where.property_status = status;
    }

    // Price range
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) (where.price as Record<string, number>).gte = minPrice;
      if (maxPrice) (where.price as Record<string, number>).lte = maxPrice;
    }

    // Bedrooms
    if (minBedrooms || maxBedrooms) {
      where.bedrooms = {};
      if (minBedrooms) (where.bedrooms as Record<string, number>).gte = minBedrooms;
      if (maxBedrooms) (where.bedrooms as Record<string, number>).lte = maxBedrooms;
    }

    // Fetch properties
    const properties = await prismadb.properties.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        property_name: true,
        property_type: true,
        transaction_type: true,
        property_status: true,
        price: true,
        address_city: true,
        address_state: true,
        address_street: true,
        bedrooms: true,
        bathrooms: true,
        size_net_sqm: true,
        updatedAt: true,
      },
    });

    // Format price for voice output
    const formatPrice = (price: number | null) => {
      if (!price) return null;
      return new Intl.NumberFormat("el-GR", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(price);
    };

    return NextResponse.json({
      success: true,
      properties: properties.map((property) => ({
        id: property.id,
        name: property.property_name,
        type: property.property_type,
        transactionType: property.transaction_type,
        status: property.property_status,
        price: property.price,
        priceFormatted: formatPrice(property.price),
        municipality: property.address_city,
        area: property.address_state,
        address: property.address_street,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        size: property.size_net_sqm,
        lastUpdated: property.updatedAt?.toISOString(),
      })),
      count: properties.length,
      message: properties.length === 0
        ? "No properties found matching your criteria"
        : properties.length === 1
        ? `Found 1 property: ${properties[0].property_name}`
        : `Found ${properties.length} properties`,
    });
  } catch (error) {
    console.error("[VOICE_SEARCH_PROPERTIES]", error);
    return NextResponse.json(
      { error: "Failed to search properties" },
      { status: 500 }
    );
  }
}

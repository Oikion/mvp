import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
    const {
      property_name,
      primary_email,
      property_type,
      property_status,
      transaction_type,
      is_exclusive,
      municipality,
      area,
      postal_code,
      address_privacy_level,
      address_street,
      address_city,
      address_state,
      address_zip,
      size_net_sqm,
      size_gross_sqm,
      floor,
      floors_total,
      plot_size_sqm,
      inside_city_plan,
      build_coefficient,
      coverage_ratio,
      frontage_m,
      bedrooms,
      bathrooms,
      heating_type,
      energy_cert_class,
      year_built,
      renovated_year,
      condition,
      elevator,
      building_permit_no,
      building_permit_year,
      land_registry_kaek,
      legalization_status,
      etaireia_diaxeirisis,
      monthly_common_charges,
      amenities,
      orientation,
      furnished,
      accessibility,
      price,
      price_type,
      available_from,
      accepts_pets,
      min_lease_months,
      portal_visibility,
      square_feet,
      lot_size,
      description,
      assigned_to,
      draft_status,
    } = body;

    const newProperty = await prismadb.properties.create({
      data: {
        v: 0,
        createdBy: user.id,
        updatedBy: user.id,
        organizationId,
        property_name,
        primary_email,
        property_type,
        property_status,
        transaction_type,
        is_exclusive,
        municipality,
        area,
        postal_code,
        address_privacy_level,
        address_street,
        address_city,
        address_state,
        address_zip,
        size_net_sqm,
        size_gross_sqm,
        floor,
        floors_total,
        plot_size_sqm,
        inside_city_plan,
        build_coefficient,
        coverage_ratio,
        frontage_m,
        bedrooms,
        bathrooms,
        heating_type,
        energy_cert_class,
        year_built,
        renovated_year,
        condition,
        elevator,
        building_permit_no,
        building_permit_year,
        land_registry_kaek,
        legalization_status,
        etaireia_diaxeirisis,
        monthly_common_charges,
        amenities,
        orientation,
        furnished,
        accessibility,
        price,
        price_type,
        available_from,
        accepts_pets,
        min_lease_months,
        portal_visibility,
        square_feet,
        lot_size,
        description,
        assigned_to,
        draft_status: draft_status ?? false,
      },
    });
    return NextResponse.json({ newProperty }, { status: 200 });
  } catch (error) {
    console.log("[NEW_PROPERTY_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
    const {
      id,
      property_name,
      primary_email,
      property_type,
      property_status,
      transaction_type,
      is_exclusive,
      municipality,
      area,
      postal_code,
      address_privacy_level,
      address_street,
      address_city,
      address_state,
      address_zip,
      size_net_sqm,
      size_gross_sqm,
      floor,
      floors_total,
      plot_size_sqm,
      inside_city_plan,
      build_coefficient,
      coverage_ratio,
      frontage_m,
      bedrooms,
      bathrooms,
      heating_type,
      energy_cert_class,
      year_built,
      renovated_year,
      condition,
      elevator,
      building_permit_no,
      building_permit_year,
      land_registry_kaek,
      legalization_status,
      etaireia_diaxeirisis,
      monthly_common_charges,
      amenities,
      orientation,
      furnished,
      accessibility,
      price,
      price_type,
      available_from,
      accepts_pets,
      min_lease_months,
      portal_visibility,
      square_feet,
      lot_size,
      description,
      assigned_to,
      draft_status,
    } = body;

    // Verify the property belongs to the current organization before updating
    const existingProperty = await prismadb.properties.findFirst({
      where: { id, organizationId },
    });

    if (!existingProperty) {
      return new NextResponse("Property not found or access denied", { status: 404 });
    }

    const updatedProperty = await prismadb.properties.update({
      where: { id },
      data: {
        updatedBy: user.id,
        property_name,
        primary_email,
        property_type,
        property_status,
        transaction_type,
        is_exclusive,
        municipality,
        area,
        postal_code,
        address_privacy_level,
        address_street,
        address_city,
        address_state,
        address_zip,
        size_net_sqm,
        size_gross_sqm,
        floor,
        floors_total,
        plot_size_sqm,
        inside_city_plan,
        build_coefficient,
        coverage_ratio,
        frontage_m,
        bedrooms,
        bathrooms,
        heating_type,
        energy_cert_class,
        year_built,
        renovated_year,
        condition,
        elevator,
        building_permit_no,
        building_permit_year,
        land_registry_kaek,
        legalization_status,
        etaireia_diaxeirisis,
        monthly_common_charges,
        amenities,
        orientation,
        furnished,
        accessibility,
        price,
        price_type,
        available_from,
        accepts_pets,
        min_lease_months,
        portal_visibility,
        square_feet,
        lot_size,
        description,
        assigned_to,
        draft_status: draft_status !== undefined ? draft_status : undefined,
      },
    });
    return NextResponse.json({ updatedProperty }, { status: 200 });
  } catch (error) {
    console.log("[UPDATE_PROPERTY_PUT]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

export async function GET() {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const properties = await prismadb.properties.findMany({
      where: { organizationId },
    });
    return NextResponse.json(properties, { status: 200 });
  } catch (error) {
    console.log("[PROPERTIES_GET]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}



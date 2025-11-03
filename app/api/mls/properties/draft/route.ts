import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
    
    // Extract all possible fields (including new Greece-specific ones)
    const {
      id, // If provided, update existing draft
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
    } = body;

    // Build data object with only provided fields
    const data: any = {
      updatedBy: user.id,
      draft_status: true, // Always mark as draft
    };

    // Only include fields that are provided (not undefined)
    if (property_name !== undefined) data.property_name = property_name;
    if (primary_email !== undefined) data.primary_email = primary_email;
    if (property_type !== undefined) data.property_type = property_type;
    if (property_status !== undefined) data.property_status = property_status;
    if (transaction_type !== undefined) data.transaction_type = transaction_type;
    if (is_exclusive !== undefined) data.is_exclusive = is_exclusive;
    if (municipality !== undefined) data.municipality = municipality;
    if (area !== undefined) data.area = area;
    if (postal_code !== undefined) data.postal_code = postal_code;
    if (address_privacy_level !== undefined) data.address_privacy_level = address_privacy_level;
    if (address_street !== undefined) data.address_street = address_street;
    if (address_city !== undefined) data.address_city = address_city;
    if (address_state !== undefined) data.address_state = address_state;
    if (address_zip !== undefined) data.address_zip = address_zip;
    if (size_net_sqm !== undefined) data.size_net_sqm = size_net_sqm;
    if (size_gross_sqm !== undefined) data.size_gross_sqm = size_gross_sqm;
    if (floor !== undefined) data.floor = floor;
    if (floors_total !== undefined) data.floors_total = floors_total;
    if (plot_size_sqm !== undefined) data.plot_size_sqm = plot_size_sqm;
    if (inside_city_plan !== undefined) data.inside_city_plan = inside_city_plan;
    if (build_coefficient !== undefined) data.build_coefficient = build_coefficient;
    if (coverage_ratio !== undefined) data.coverage_ratio = coverage_ratio;
    if (frontage_m !== undefined) data.frontage_m = frontage_m;
    if (bedrooms !== undefined) data.bedrooms = bedrooms;
    if (bathrooms !== undefined) data.bathrooms = bathrooms;
    if (heating_type !== undefined) data.heating_type = heating_type;
    if (energy_cert_class !== undefined) data.energy_cert_class = energy_cert_class;
    if (year_built !== undefined) data.year_built = year_built;
    if (renovated_year !== undefined) data.renovated_year = renovated_year;
    if (condition !== undefined) data.condition = condition;
    if (elevator !== undefined) data.elevator = elevator;
    if (building_permit_no !== undefined) data.building_permit_no = building_permit_no;
    if (building_permit_year !== undefined) data.building_permit_year = building_permit_year;
    if (land_registry_kaek !== undefined) data.land_registry_kaek = land_registry_kaek;
    if (legalization_status !== undefined) data.legalization_status = legalization_status;
    if (etaireia_diaxeirisis !== undefined) data.etaireia_diaxeirisis = etaireia_diaxeirisis;
    if (monthly_common_charges !== undefined) data.monthly_common_charges = monthly_common_charges;
    if (amenities !== undefined) data.amenities = amenities;
    if (orientation !== undefined) data.orientation = orientation;
    if (furnished !== undefined) data.furnished = furnished;
    if (accessibility !== undefined) data.accessibility = accessibility;
    if (price !== undefined) data.price = price;
    if (price_type !== undefined) data.price_type = price_type;
    if (available_from !== undefined) data.available_from = available_from;
    if (accepts_pets !== undefined) data.accepts_pets = accepts_pets;
    if (min_lease_months !== undefined) data.min_lease_months = min_lease_months;
    if (portal_visibility !== undefined) data.portal_visibility = portal_visibility;
    if (square_feet !== undefined) data.square_feet = square_feet;
    if (lot_size !== undefined) data.lot_size = lot_size;
    if (description !== undefined) data.description = description;
    if (assigned_to !== undefined) data.assigned_to = assigned_to;

    let property;

    if (id) {
      // Update existing draft
      const existingProperty = await prismadb.properties.findFirst({
        where: { id, organizationId },
      });

      if (!existingProperty) {
        return new NextResponse("Property not found or access denied", { status: 404 });
      }

      property = await prismadb.properties.update({
        where: { id },
        data,
      });
    } else {
      // Create new draft
      data.v = 0;
      data.createdBy = user.id;
      data.organizationId = organizationId;
      
      // Set minimum required fields for draft
      if (!data.property_name) {
        data.property_name = "Draft Property";
      }

      property = await prismadb.properties.create({
        data,
      });
    }

    await invalidateCache([
      "properties:list",
      id ? `property:${id}` : "",
      assigned_to ? `user:${assigned_to}` : "",
    ].filter(Boolean));

    return NextResponse.json({ property }, { status: 200 });
  } catch (error: any) {
    console.log("[PROPERTY_DRAFT_POST]", error);
    const errorMessage = error?.message || "Failed to save draft";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  // PUT is same as POST for drafts - updates existing or creates new
  return POST(req);
}


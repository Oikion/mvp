import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { generateFriendlyId } from "@/lib/friendly-id";

// Valid enum values
const VALID_PROPERTY_CONDITIONS = new Set(["EXCELLENT", "VERY_GOOD", "GOOD", "NEEDS_RENOVATION"]);
const VALID_HEATING_TYPES = new Set(["AUTONOMOUS", "CENTRAL", "NATURAL_GAS", "HEAT_PUMP", "ELECTRIC", "NONE"]);
const VALID_PROPERTY_STATUSES = new Set(["ACTIVE", "PENDING", "SOLD", "OFF_MARKET", "WITHDRAWN"]);
const VALID_PROPERTY_TYPES = new Set([
  "RESIDENTIAL", "COMMERCIAL", "LAND", "RENTAL", "VACATION",
  "APARTMENT", "HOUSE", "MAISONETTE", "WAREHOUSE", "PARKING",
  "PLOT", "FARM", "INDUSTRIAL", "OTHER"
]);
const VALID_ENERGY_CERT_CLASSES = new Set([
  "A_PLUS", "A", "B", "C", "D", "E", "F", "G", "H", "IN_PROGRESS"
]);
const VALID_TRANSACTION_TYPES = new Set(["SALE", "RENTAL", "SHORT_TERM", "EXCHANGE"]);
const VALID_ADDRESS_PRIVACY_LEVELS = new Set(["EXACT", "PARTIAL", "HIDDEN"]);
const VALID_LEGALIZATION_STATUSES = new Set(["LEGALIZED", "IN_PROGRESS", "UNDECLARED"]);
const VALID_FURNISHED_STATUSES = new Set(["NO", "PARTIALLY", "FULLY"]);
const VALID_PRICE_TYPES = new Set(["RENTAL", "SALE", "PER_ACRE", "PER_SQM"]);
const VALID_PORTAL_VISIBILITIES = new Set(["PRIVATE", "SELECTED", "PUBLIC"]);

// Map form property_status values to Prisma enum values
const PROPERTY_STATUS_MAP: Record<string, string> = {
  "AVAILABLE": "ACTIVE",
  "RESERVED": "PENDING",
  "NEGOTIATION": "PENDING",
  "RENTED": "ACTIVE",
  "SOLD": "SOLD",
};

// Helper function to convert string to number or null
function toNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

// Helper function to convert string to DateTime or null
function toDateTime(value: any): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Helper function to convert empty string to null
function nullIfEmpty(value: any): any {
  if (value === "") return null;
  return value;
}

export async function POST(req: Request) {
  let data: any = {};
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();
    
    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    
    // Extract all possible fields
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
    } = body;

    // Build data object with validated and converted fields
    data = {
      updatedBy: user.id,
      draft_status: true,
    };

    // String fields - convert empty strings to null
    if (property_name !== undefined) data.property_name = nullIfEmpty(property_name) || "Draft Property";
    if (primary_email !== undefined) data.primary_email = nullIfEmpty(primary_email);
    if (municipality !== undefined) data.municipality = nullIfEmpty(municipality);
    if (area !== undefined) data.area = nullIfEmpty(area);
    if (postal_code !== undefined) data.postal_code = nullIfEmpty(postal_code);
    if (address_street !== undefined) data.address_street = nullIfEmpty(address_street);
    if (address_city !== undefined) data.address_city = nullIfEmpty(address_city);
    if (address_state !== undefined) data.address_state = nullIfEmpty(address_state);
    if (address_zip !== undefined) data.address_zip = nullIfEmpty(address_zip);
    if (floor !== undefined) data.floor = nullIfEmpty(floor);
    if (building_permit_no !== undefined) data.building_permit_no = nullIfEmpty(building_permit_no);
    if (land_registry_kaek !== undefined) data.land_registry_kaek = nullIfEmpty(land_registry_kaek);
    if (etaireia_diaxeirisis !== undefined) data.etaireia_diaxeirisis = nullIfEmpty(etaireia_diaxeirisis);
    if (accessibility !== undefined) data.accessibility = nullIfEmpty(accessibility);
    if (description !== undefined) data.description = nullIfEmpty(description);
    if (assigned_to !== undefined) data.assigned_to = nullIfEmpty(assigned_to);

    // Enum fields - validate before setting
    if (property_type !== undefined && property_type !== null && property_type !== "") {
      // Only set if it's a valid PropertyType enum value
      if (VALID_PROPERTY_TYPES.has(property_type)) {
        data.property_type = property_type;
      }
      // Otherwise, ignore invalid values (might be location string sent by mistake)
    }
    if (property_status !== undefined && property_status !== null && property_status !== "") {
      // Map form values to Prisma enum values
      const mappedStatus = PROPERTY_STATUS_MAP[property_status] || property_status;
      if (VALID_PROPERTY_STATUSES.has(mappedStatus)) {
        data.property_status = mappedStatus;
      }
    }
    if (transaction_type !== undefined && transaction_type !== null && transaction_type !== "") {
      if (VALID_TRANSACTION_TYPES.has(transaction_type)) {
        data.transaction_type = transaction_type;
      }
    }
    if (address_privacy_level !== undefined && address_privacy_level !== null && address_privacy_level !== "") {
      if (VALID_ADDRESS_PRIVACY_LEVELS.has(address_privacy_level)) {
        data.address_privacy_level = address_privacy_level;
      }
    }
    if (heating_type !== undefined && heating_type !== null && heating_type !== "" && VALID_HEATING_TYPES.has(heating_type)) {
      data.heating_type = heating_type;
    }
    if (energy_cert_class !== undefined && energy_cert_class !== null && energy_cert_class !== "") {
      // Only set if it's a valid EnergyCertClass enum value (string, not number)
      const energyClassStr = String(energy_cert_class);
      if (VALID_ENERGY_CERT_CLASSES.has(energyClassStr)) {
        data.energy_cert_class = energyClassStr;
      }
      // Otherwise, ignore invalid values (might be number sent by mistake)
    }
    // Validate condition - only set if it's a valid PropertyCondition, not a HeatingType
    if (condition !== undefined && condition !== null && condition !== "") {
      if (VALID_PROPERTY_CONDITIONS.has(condition)) {
        data.condition = condition;
      }
      // If it's a heating type being sent as condition, ignore it
    }
    if (legalization_status !== undefined && legalization_status !== null && legalization_status !== "") {
      if (VALID_LEGALIZATION_STATUSES.has(legalization_status)) {
        data.legalization_status = legalization_status;
      }
    }
    if (furnished !== undefined && furnished !== null && furnished !== "") {
      if (VALID_FURNISHED_STATUSES.has(furnished)) {
        data.furnished = furnished;
      }
    }
    if (price_type !== undefined && price_type !== null && price_type !== "") {
      if (VALID_PRICE_TYPES.has(price_type)) {
        data.price_type = price_type;
      }
    }
    if (portal_visibility !== undefined && portal_visibility !== null && portal_visibility !== "") {
      if (VALID_PORTAL_VISIBILITIES.has(portal_visibility)) {
        data.portal_visibility = portal_visibility;
      }
    }

    // Boolean fields
    if (is_exclusive !== undefined) data.is_exclusive = is_exclusive === true || is_exclusive === "true";
    if (inside_city_plan !== undefined) data.inside_city_plan = inside_city_plan === true || inside_city_plan === "true";
    if (elevator !== undefined) data.elevator = elevator === true || elevator === "true";
    if (accepts_pets !== undefined) data.accepts_pets = accepts_pets === true || accepts_pets === "true";

    // Number fields - convert strings to numbers or null
    if (size_net_sqm !== undefined) data.size_net_sqm = toNumber(size_net_sqm);
    if (size_gross_sqm !== undefined) data.size_gross_sqm = toNumber(size_gross_sqm);
    if (floors_total !== undefined) data.floors_total = toNumber(floors_total);
    if (plot_size_sqm !== undefined) data.plot_size_sqm = toNumber(plot_size_sqm);
    if (build_coefficient !== undefined) data.build_coefficient = toNumber(build_coefficient);
    if (coverage_ratio !== undefined) data.coverage_ratio = toNumber(coverage_ratio);
    if (frontage_m !== undefined) data.frontage_m = toNumber(frontage_m);
    if (bedrooms !== undefined) data.bedrooms = toNumber(bedrooms);
    if (bathrooms !== undefined) data.bathrooms = toNumber(bathrooms);
    if (year_built !== undefined) data.year_built = toNumber(year_built);
    if (renovated_year !== undefined) data.renovated_year = toNumber(renovated_year);
    if (building_permit_year !== undefined) data.building_permit_year = toNumber(building_permit_year);
    if (monthly_common_charges !== undefined) data.monthly_common_charges = toNumber(monthly_common_charges);
    if (price !== undefined) data.price = toNumber(price);
    if (min_lease_months !== undefined) data.min_lease_months = toNumber(min_lease_months);
    if (square_feet !== undefined) data.square_feet = toNumber(square_feet);
    if (lot_size !== undefined) data.lot_size = toNumber(lot_size);

    // DateTime fields
    if (available_from !== undefined) {
      const dateValue = toDateTime(available_from);
      if (dateValue) data.available_from = dateValue;
    }

    // JSON fields (arrays)
    if (amenities !== undefined && amenities !== null) {
      data.amenities = Array.isArray(amenities) ? amenities : null;
    }
    if (orientation !== undefined && orientation !== null) {
      data.orientation = Array.isArray(orientation) ? orientation : null;
    }

    let property;

    if (id) {
      // Update existing draft
      const existingProperty = await prismadb.properties.findFirst({
        where: { id, organizationId },
      });

      if (!existingProperty) {
        return NextResponse.json(
          { error: "Property not found or access denied" },
          { status: 404 }
        );
      }

      property = await prismadb.properties.update({
        where: { id },
        data,
      });
    } else {
      // Create new draft
      data.createdBy = user.id;
      data.organizationId = organizationId;
      
      // Generate friendly ID
      const propertyId = await generateFriendlyId(prismadb, "Properties");
      data.id = propertyId;
      
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
    console.error("[PROPERTY_DRAFT_POST]", error);
    
    // Extract more detailed error information
    let errorMessage = "Failed to save draft";
    let errorDetails: any = null;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        message: error.message,
        name: error.name,
        stack: error.stack,
      };
    }
    
    // Check if it's a Prisma validation error
    if (error?.code === "P2002") {
      errorMessage = "A property with this information already exists";
    } else if (error?.code === "P2003") {
      errorMessage = "Invalid reference to related record";
    } else if (error?.meta?.target) {
      errorMessage = `Validation error on field: ${error.meta.target.join(", ")}`;
    }
    
    // Log the full error for debugging
    console.error("[PROPERTY_DRAFT_POST] Full error:", {
      error,
      errorMessage,
      errorDetails,
      dataKeys: Object.keys(data || {}),
    });
    
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: errorDetails || errorMessage,
        code: error?.code,
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  // PUT is same as POST for drafts - updates existing or creates new
  return POST(req);
}

import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { notifyPropertyCreated, notifyPropertyWatchers } from "@/lib/notifications";
import { generateFriendlyId } from "@/lib/friendly-id";
import { dispatchPropertyWebhook } from "@/lib/webhooks";
import { requireCanModify, checkAssignedToChange } from "@/lib/permissions/guards";

// Valid enum values
const VALID_PROPERTY_CONDITIONS = new Set(["EXCELLENT", "VERY_GOOD", "GOOD", "NEEDS_RENOVATION"]);
const VALID_HEATING_TYPES = new Set(["AUTONOMOUS", "CENTRAL", "NATURAL_GAS", "HEAT_PUMP", "ELECTRIC", "NONE"]);
const VALID_PROPERTY_STATUSES = new Set(["ACTIVE", "PENDING", "SOLD", "OFF_MARKET", "WITHDRAWN"]);

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

// Helper function to build validated property data
function buildPropertyData(body: any, user: any, organizationId: string, isUpdate: boolean = false) {
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

  const data: any = {};

  if (!isUpdate) {
    data.createdBy = user.id;
    data.organizationId = organizationId;
  }
  data.updatedBy = user.id;

  // String fields - convert empty strings to null
  if (property_name !== undefined) data.property_name = nullIfEmpty(property_name);
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
    data.property_type = property_type;
  }
  if (property_status !== undefined && property_status !== null && property_status !== "") {
    // Map form values to Prisma enum values
    const mappedStatus = PROPERTY_STATUS_MAP[property_status] || property_status;
    if (VALID_PROPERTY_STATUSES.has(mappedStatus)) {
      data.property_status = mappedStatus;
    }
  }
  if (transaction_type !== undefined && transaction_type !== null && transaction_type !== "") {
    data.transaction_type = transaction_type;
  }
  if (address_privacy_level !== undefined && address_privacy_level !== null && address_privacy_level !== "") {
    data.address_privacy_level = address_privacy_level;
  }
  if (heating_type !== undefined && heating_type !== null && heating_type !== "" && VALID_HEATING_TYPES.has(heating_type)) {
    data.heating_type = heating_type;
  }
  if (energy_cert_class !== undefined && energy_cert_class !== null && energy_cert_class !== "") {
    data.energy_cert_class = energy_cert_class;
  }
  // Validate condition - only set if it's a valid PropertyCondition
  if (condition !== undefined && condition !== null && condition !== "") {
    if (VALID_PROPERTY_CONDITIONS.has(condition)) {
      data.condition = condition;
    }
  }
  if (legalization_status !== undefined && legalization_status !== null && legalization_status !== "") {
    data.legalization_status = legalization_status;
  }
  if (furnished !== undefined && furnished !== null && furnished !== "") {
    data.furnished = furnished;
  }
  if (price_type !== undefined && price_type !== null && price_type !== "") {
    data.price_type = price_type;
  }
  if (portal_visibility !== undefined && portal_visibility !== null && portal_visibility !== "") {
    data.portal_visibility = portal_visibility;
  }

  // Boolean fields
  if (is_exclusive !== undefined) data.is_exclusive = is_exclusive === true || is_exclusive === "true";
  if (inside_city_plan !== undefined) data.inside_city_plan = inside_city_plan === true || inside_city_plan === "true";
  if (elevator !== undefined) data.elevator = elevator === true || elevator === "true";
  if (accepts_pets !== undefined) data.accepts_pets = accepts_pets === true || accepts_pets === "true";
  if (draft_status !== undefined) {
    data.draft_status = draft_status === true || draft_status === "true";
  } else if (!isUpdate) {
    data.draft_status = false;
  }

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

  return data;
}

export async function POST(req: Request) {
  try {
    // Permission check: Viewers cannot create properties
    const permissionError = await requireCanModify();
    if (permissionError) return permissionError;

    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();
    
    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    
    const { id } = body; // Check if updating existing draft

    // Build validated data
    const data = buildPropertyData(body, user, organizationId, !!id);

    // Ensure property_name exists
    if (!data.property_name) {
      data.property_name = "Untitled Property";
    }

    let property;

    if (id) {
      // Update existing draft/property
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
      // Create new property with friendly ID
      const propertyId = await generateFriendlyId(prismadb, "Properties");
      property = await prismadb.properties.create({
        data: {
          id: propertyId,
          ...data,
        },
      });
    }

    await invalidateCache([
      "properties:list",
      id ? `property:${id}` : "",
      data.assigned_to ? `user:${data.assigned_to}` : "",
    ].filter(Boolean));

    // Notify organization about new property (only for non-draft and new properties)
    if (!id && !data.draft_status) {
      await notifyPropertyCreated({
        entityType: "PROPERTY",
        entityId: property.id,
        entityName: property.property_name || "Untitled Property",
        creatorId: user.id,
        creatorName: user.name || user.email || "Someone",
        organizationId,
        assignedToId: data.assigned_to,
      });

      // Dispatch webhook for external integrations
      dispatchPropertyWebhook(organizationId, "property.created", property).catch(console.error);
    }

    return NextResponse.json({ newProperty: property }, { status: 200 });
  } catch (error) {
    console.error("[NEW_PROPERTY_POST]", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create property", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    // Permission check: Viewers cannot edit properties
    const permissionError = await requireCanModify();
    if (permissionError) return permissionError;

    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();
    
    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Property ID is required" },
        { status: 400 }
      );
    }

    // Verify the property belongs to the current organization before updating
    const existingProperty = await prismadb.properties.findFirst({
      where: { id, organizationId },
    });

    if (!existingProperty) {
      return NextResponse.json(
        { error: "Property not found or access denied" },
        { status: 404 }
      );
    }

    // Permission check: Members cannot change assigned agent
    const assignedToError = await checkAssignedToChange(body, existingProperty.assigned_to);
    if (assignedToError) return assignedToError;

    // Build validated data
    const data = buildPropertyData(body, user, organizationId, true);

    const updatedProperty = await prismadb.properties.update({
      where: { id },
      data,
    });

    await invalidateCache([
      "properties:list",
      `property:${id}`,
      data.assigned_to ? `user:${data.assigned_to}` : "",
    ].filter(Boolean));

    // Notify watchers about the update
    await notifyPropertyWatchers(
      id,
      organizationId,
      "PROPERTY_UPDATED",
      `Property "${updatedProperty.property_name}" was updated`,
      `${user.name || user.email} updated the property "${updatedProperty.property_name}"`,
      {
        updatedBy: user.id,
        updatedByName: user.name || user.email,
      }
    );

    // Dispatch webhook for external integrations
    dispatchPropertyWebhook(organizationId, "property.updated", updatedProperty).catch(console.error);

    return NextResponse.json({ updatedProperty }, { status: 200 });
  } catch (error) {
    console.error("[UPDATE_PROPERTY_PUT]", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to update property", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mls/properties
 * 
 * Supports cursor-based pagination for large datasets:
 * - ?cursor=<propertyId> - Start after this property ID
 * - ?limit=<number> - Number of items per page (default: 50, max: 100)
 * - ?status=<status> - Filter by property status
 * - ?search=<query> - Search by property name
 * 
 * Response includes:
 * - items: Array of properties
 * - nextCursor: ID of last item (use for next page), null if no more items
 * - hasMore: Boolean indicating if more items exist
 */
export async function GET(req: Request) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();
    
    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limitParam = searchParams.get("limit");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const minimal = searchParams.get("minimal") === "true";

    // For minimal mode (selectors), return just id and name - much faster
    if (minimal) {
      const where: Record<string, unknown> = { organizationId };
      if (search && search.trim()) {
        where.property_name = {
          contains: search.trim(),
          mode: "insensitive",
        };
      }
      
      const properties = await prismadb.properties.findMany({
        where,
        select: {
          id: true,
          property_name: true,
        },
        orderBy: { property_name: "asc" },
        take: 1000, // Limit for selector use cases
      });

      return NextResponse.json({
        items: properties,
        nextCursor: null,
        hasMore: false,
      }, { status: 200 });
    }

    // Validate and set limit (default 50, max 100)
    let limit = 50;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, 100);
      }
    }

    // Build where clause
    const where: Record<string, unknown> = { organizationId };
    
    if (status && VALID_PROPERTY_STATUSES.has(status)) {
      where.property_status = status;
    }
    
    if (search && search.trim()) {
      where.property_name = {
        contains: search.trim(),
        mode: "insensitive",
      };
    }

    // Fetch one extra to check if there are more items
    const properties = await prismadb.properties.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0, // Skip the cursor item itself
      orderBy: { createdAt: "desc" },
      include: {
        Users_Properties_assigned_toToUsers: { select: { name: true } },
        Documents: {
          where: {
            document_file_mimeType: {
              startsWith: "image/",
            },
          },
          select: {
            document_file_url: true,
          },
          take: 1,
        },
      },
    });

    // Check if there are more items
    const hasMore = properties.length > limit;
    const items = hasMore ? properties.slice(0, -1) : properties;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return NextResponse.json({
      items: JSON.parse(JSON.stringify(items)), // Serialize for client
      nextCursor,
      hasMore,
    }, { status: 200 });
  } catch (error) {
    console.error("[PROPERTIES_GET]", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch properties", details: errorMessage },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { generateFriendlyId } from "@/lib/friendly-id";
import { encryptMandateForOrg } from "@/lib/model-encryption";

// Valid enum values for mandate draft fields
const VALID_TRANSACTION_TYPES = new Set(["SALE", "RENTAL", "SHORT_TERM", "EXCHANGE"]);
const VALID_PROPERTY_TYPES = new Set([
  "RESIDENTIAL", "COMMERCIAL", "LAND", "RENTAL", "VACATION",
  "APARTMENT", "HOUSE", "MAISONETTE", "WAREHOUSE", "PARKING",
  "PLOT", "FARM", "INDUSTRIAL", "OTHER",
]);
const VALID_PROPERTY_PURPOSES = new Set(["RESIDENTIAL", "COMMERCIAL", "LAND", "PARKING", "OTHER"]);
const VALID_MANDATE_STATUSES = new Set(["DRAFT", "ACTIVE", "PAUSED", "FULFILLED", "EXPIRED", "CANCELLED"]);
const VALID_MANDATE_URGENCIES = new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const VALID_TIMELINES = new Set(["IMMEDIATE", "ONE_THREE_MONTHS", "THREE_SIX_MONTHS", "SIX_PLUS_MONTHS"]);
const VALID_PROPERTY_CONDITIONS = new Set(["EXCELLENT", "VERY_GOOD", "GOOD", "NEEDS_RENOVATION"]);
const VALID_HEATING_TYPES = new Set(["AUTONOMOUS", "CENTRAL", "NATURAL_GAS", "HEAT_PUMP", "ELECTRIC", "NONE"]);
const VALID_ENERGY_CERT_CLASSES = new Set(["A_PLUS", "A", "B", "C", "D", "E", "F", "G", "H", "IN_PROGRESS"]);
const VALID_FURNISHED_STATUSES = new Set(["NO", "PARTIALLY", "FULLY"]);

// Helper function to convert string to number or null
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

// Helper function to convert empty string to null
function nullIfEmpty(value: unknown): unknown {
  if (value === "") return null;
  return value;
}

export async function POST(req: Request) {
  let data: Record<string, unknown> = {};
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

    const {
      id,
      title,
      transaction_type,
      property_type,
      property_purpose,
      areas_of_interest,
      municipality,
      region,
      size_min_sqm,
      size_max_sqm,
      plot_size_min_sqm,
      plot_size_max_sqm,
      budget_min,
      budget_max,
      bedrooms_min,
      bedrooms_max,
      bathrooms_min,
      bathrooms_max,
      floor_min,
      floor_max,
      ground_floor_only,
      condition,
      year_built_min,
      year_built_max,
      heating_type,
      energy_cert_min,
      furnished,
      elevator,
      parking,
      pets_allowed,
      amenities,
      inside_city_plan,
      legalization_ok,
      status,
      urgency,
      timeline,
      expires_at,
      notes,
      communication_notes,
      clientId,
      assigned_to,
    } = body;

    // Build data object with validated and converted fields
    data = {
      updatedBy: user.id,
      draft_status: true,
    };

    // String fields - convert empty strings to null
    if (title !== undefined) data.title = nullIfEmpty(title) || "Draft Mandate";
    if (municipality !== undefined) data.municipality = nullIfEmpty(municipality);
    if (region !== undefined) data.region = nullIfEmpty(region);
    if (notes !== undefined) data.notes = nullIfEmpty(notes);
    if (assigned_to !== undefined) data.assigned_to = nullIfEmpty(assigned_to);
    if (clientId !== undefined) data.clientId = nullIfEmpty(clientId);

    // Enum fields - validate before setting
    if (transaction_type !== undefined && transaction_type !== null && transaction_type !== "") {
      if (VALID_TRANSACTION_TYPES.has(transaction_type)) {
        data.transaction_type = transaction_type;
      }
    }
    if (property_type !== undefined && property_type !== null && property_type !== "") {
      if (VALID_PROPERTY_TYPES.has(property_type)) {
        data.property_type = property_type;
      }
    }
    if (property_purpose !== undefined && property_purpose !== null && property_purpose !== "") {
      if (VALID_PROPERTY_PURPOSES.has(property_purpose)) {
        data.property_purpose = property_purpose;
      }
    }
    if (status !== undefined && status !== null && status !== "") {
      if (VALID_MANDATE_STATUSES.has(status)) {
        data.status = status;
      }
    }
    if (urgency !== undefined && urgency !== null && urgency !== "") {
      if (VALID_MANDATE_URGENCIES.has(urgency)) {
        data.urgency = urgency;
      }
    }
    if (timeline !== undefined && timeline !== null && timeline !== "") {
      if (VALID_TIMELINES.has(timeline)) {
        data.timeline = timeline;
      }
    }
    if (energy_cert_min !== undefined && energy_cert_min !== null && energy_cert_min !== "") {
      if (VALID_ENERGY_CERT_CLASSES.has(String(energy_cert_min))) {
        data.energy_cert_min = String(energy_cert_min);
      }
    }
    if (furnished !== undefined && furnished !== null && furnished !== "") {
      if (VALID_FURNISHED_STATUSES.has(furnished)) {
        data.furnished = furnished;
      }
    }

    // Array enum fields - validate each element
    if (condition !== undefined && condition !== null) {
      if (Array.isArray(condition)) {
        data.condition = condition.filter((c: string) => VALID_PROPERTY_CONDITIONS.has(c));
      }
    }
    if (heating_type !== undefined && heating_type !== null) {
      if (Array.isArray(heating_type)) {
        data.heating_type = heating_type.filter((h: string) => VALID_HEATING_TYPES.has(h));
      }
    }

    // Boolean fields
    if (ground_floor_only !== undefined) data.ground_floor_only = ground_floor_only === true || ground_floor_only === "true";
    if (elevator !== undefined) data.elevator = elevator === true || elevator === "true";
    if (parking !== undefined) data.parking = parking === true || parking === "true";
    if (pets_allowed !== undefined) data.pets_allowed = pets_allowed === true || pets_allowed === "true";
    if (inside_city_plan !== undefined) data.inside_city_plan = inside_city_plan === true || inside_city_plan === "true";
    if (legalization_ok !== undefined) data.legalization_ok = legalization_ok === true || legalization_ok === "true";

    // Decimal fields - convert strings to numbers or null
    if (size_min_sqm !== undefined) data.size_min_sqm = toNumber(size_min_sqm);
    if (size_max_sqm !== undefined) data.size_max_sqm = toNumber(size_max_sqm);
    if (plot_size_min_sqm !== undefined) data.plot_size_min_sqm = toNumber(plot_size_min_sqm);
    if (plot_size_max_sqm !== undefined) data.plot_size_max_sqm = toNumber(plot_size_max_sqm);
    if (budget_min !== undefined) data.budget_min = toNumber(budget_min);
    if (budget_max !== undefined) data.budget_max = toNumber(budget_max);

    // Int fields
    if (bedrooms_min !== undefined) data.bedrooms_min = toNumber(bedrooms_min);
    if (bedrooms_max !== undefined) data.bedrooms_max = toNumber(bedrooms_max);
    if (bathrooms_min !== undefined) data.bathrooms_min = toNumber(bathrooms_min);
    if (bathrooms_max !== undefined) data.bathrooms_max = toNumber(bathrooms_max);
    if (floor_min !== undefined) data.floor_min = toNumber(floor_min);
    if (floor_max !== undefined) data.floor_max = toNumber(floor_max);
    if (year_built_min !== undefined) data.year_built_min = toNumber(year_built_min);
    if (year_built_max !== undefined) data.year_built_max = toNumber(year_built_max);

    // DateTime fields
    if (expires_at !== undefined) {
      if (expires_at === null || expires_at === "") {
        data.expires_at = null;
      } else {
        const dateValue = new Date(expires_at);
        if (!Number.isNaN(dateValue.getTime())) {
          data.expires_at = dateValue;
        }
      }
    }

    // JSON fields (arrays)
    if (areas_of_interest !== undefined && areas_of_interest !== null) {
      data.areas_of_interest = Array.isArray(areas_of_interest) ? areas_of_interest : null;
    }
    if (amenities !== undefined && amenities !== null) {
      data.amenities = Array.isArray(amenities) ? amenities : null;
    }
    if (communication_notes !== undefined) {
      data.communication_notes = communication_notes;
    }

    // Encrypt sensitive fields with per-org DEK
    const encryptableFields: Record<string, unknown> = {};
    if (data.title !== undefined) encryptableFields.title = data.title;
    if (data.notes !== undefined) encryptableFields.notes = data.notes;
    if (data.communication_notes !== undefined)
      encryptableFields.communication_notes = data.communication_notes;

    const encrypted = await encryptMandateForOrg(encryptableFields, organizationId);
    Object.assign(data, encrypted);

    let mandate;

    if (id) {
      // Update existing draft
      const existingMandate = await prismadb.mandate.findFirst({
        where: { id, organizationId },
      });

      if (!existingMandate) {
        return NextResponse.json(
          { error: "Mandate not found or access denied" },
          { status: 404 }
        );
      }

      mandate = await prismadb.mandate.update({
        where: { id },
        data,
      });
    } else {
      // Create new draft
      data.createdBy = user.id;
      data.organizationId = organizationId;

      // Generate friendly ID
      const mandateId = await generateFriendlyId(prismadb, "Mandates", organizationId);
      data.id = mandateId;

      // Set minimum required fields for draft
      if (!data.title) {
        data.title = "Draft Mandate";
      }

      mandate = await prismadb.mandate.create({
        data: data as any,
      });
    }

    await invalidateCache(
      [
        "mandates:list",
        id ? `mandate:${id}` : "",
        assigned_to ? `user:${assigned_to}` : "",
      ].filter(Boolean)
    );

    return NextResponse.json({ id: mandate.id }, { status: 200 });
  } catch (error: any) {
    console.error("[MANDATE_DRAFT_POST]", error);

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
      errorMessage = "A mandate with this information already exists";
    } else if (error?.code === "P2003") {
      errorMessage = "Invalid reference to related record";
    } else if (error?.meta?.target) {
      errorMessage = `Validation error on field: ${error.meta.target.join(", ")}`;
    }

    console.error("[MANDATE_DRAFT_POST] Full error:", {
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

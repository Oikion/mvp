import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { generateFriendlyId } from "@/lib/friendly-id";
import { encryptRequestForOrg } from "@/lib/model-encryption";
import { validateAssignedTo } from "@/lib/validate-assigned-to";

// Valid enum values for request draft fields
const VALID_REQUEST_TYPES = new Set(["BUY", "RENT"]);
const VALID_PROPERTY_TYPES = new Set([
  "RESIDENTIAL", "COMMERCIAL", "LAND", "RENTAL", "VACATION",
  "APARTMENT", "HOUSE", "MAISONETTE", "WAREHOUSE", "PARKING",
  "PLOT", "FARM", "INDUSTRIAL", "OTHER",
]);
const VALID_PROPERTY_PURPOSES = new Set(["RESIDENTIAL", "COMMERCIAL", "LAND", "PARKING", "OTHER"]);
const VALID_REQUEST_STATUSES = new Set(["DRAFT", "ACTIVE", "PAUSED", "FULFILLED", "EXPIRED", "CANCELLED"]);
const VALID_REQUEST_URGENCIES = new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const VALID_TIMELINES = new Set(["IMMEDIATE", "ONE_THREE_MONTHS", "THREE_SIX_MONTHS", "SIX_PLUS_MONTHS"]);
const VALID_PROPERTY_CONDITIONS = new Set(["EXCELLENT", "VERY_GOOD", "GOOD", "NEEDS_RENOVATION"]);
const VALID_HEATING_TYPES = new Set(["AUTONOMOUS", "CENTRAL", "NATURAL_GAS", "HEAT_PUMP", "ELECTRIC", "NONE"]);
const VALID_ENERGY_CERT_CLASSES = new Set(["A_PLUS", "A", "B", "C", "D", "E", "F", "G", "H", "IN_PROGRESS"]);
const VALID_FURNISHED_STATUSES = new Set(["NO", "PARTIALLY", "FULLY"]);
const VALID_FINANCING_STATUSES = new Set(["NONE", "PRE_APPROVED", "APPROVED", "REQUIRED"]);

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
      requestType,
      propertyCategory,
      propertyTypes,
      surfaceMin,
      surfaceMax,
      plotSizeMin,
      plotSizeMax,
      budgetMin,
      budgetMax,
      bedroomsMin,
      bedroomsMax,
      bathroomsMin,
      bathroomsMax,
      floorMin,
      floorMax,
      groundFloorOnly,
      conditionPreference,
      constructionYearMin,
      constructionYearMax,
      heatingTypes,
      energyClassMin,
      furnished,
      requiresElevator,
      requiresParking,
      requiresStorage,
      requiresGarden,
      petFriendly,
      requiresAC,
      insideCityPlan,
      legalizationOk,
      amenities,
      viewTypes,
      orientationPref,
      balconyMinSqm,
      locationDisplayName,
      areasOfInterest,
      municipality,
      region,
      centerLatitude,
      centerLongitude,
      radiusKm,
      isInvestmentPurpose,
      expectedYieldPct,
      goldenVisaEligible,
      financingStatus,
      auctionInterest,
      status,
      urgency,
      timeline,
      expiresAt,
      notes,
      communicationNotes,
      assignedAgentId,
    } = body;

    // Build data object with validated and converted fields
    data = {
      updatedBy: user.id,
      draftStatus: true,
    };

    // String fields - convert empty strings to null
    if (title !== undefined) data.title = nullIfEmpty(title) || "Draft Request";
    if (locationDisplayName !== undefined) data.locationDisplayName = nullIfEmpty(locationDisplayName);
    if (municipality !== undefined) data.municipality = nullIfEmpty(municipality);
    if (region !== undefined) data.region = nullIfEmpty(region);
    if (notes !== undefined) data.notes = nullIfEmpty(notes);
    if (assignedAgentId !== undefined) data.assignedAgentId = await validateAssignedTo(assignedAgentId);

    // Enum fields - validate before setting
    if (requestType !== undefined && requestType !== null && requestType !== "") {
      if (VALID_REQUEST_TYPES.has(requestType)) {
        data.requestType = requestType;
      }
    }
    if (propertyCategory !== undefined && propertyCategory !== null && propertyCategory !== "") {
      if (VALID_PROPERTY_PURPOSES.has(propertyCategory)) {
        data.propertyCategory = propertyCategory;
      }
    }
    if (status !== undefined && status !== null && status !== "") {
      if (VALID_REQUEST_STATUSES.has(status)) {
        data.status = status;
      }
    }
    if (urgency !== undefined && urgency !== null && urgency !== "") {
      if (VALID_REQUEST_URGENCIES.has(urgency)) {
        data.urgency = urgency;
      }
    }
    if (timeline !== undefined && timeline !== null && timeline !== "") {
      if (VALID_TIMELINES.has(timeline)) {
        data.timeline = timeline;
      }
    }
    if (energyClassMin !== undefined && energyClassMin !== null && energyClassMin !== "") {
      if (VALID_ENERGY_CERT_CLASSES.has(String(energyClassMin))) {
        data.energyClassMin = String(energyClassMin);
      }
    }
    if (furnished !== undefined && furnished !== null && furnished !== "") {
      if (VALID_FURNISHED_STATUSES.has(furnished)) {
        data.furnished = furnished;
      }
    }
    if (financingStatus !== undefined && financingStatus !== null && financingStatus !== "") {
      if (VALID_FINANCING_STATUSES.has(financingStatus)) {
        data.financingStatus = financingStatus;
      }
    }

    // Array enum fields - validate each element
    if (propertyTypes !== undefined && propertyTypes !== null) {
      if (Array.isArray(propertyTypes)) {
        data.propertyTypes = propertyTypes.filter((t: string) => VALID_PROPERTY_TYPES.has(t));
      }
    }
    if (conditionPreference !== undefined && conditionPreference !== null) {
      if (Array.isArray(conditionPreference)) {
        data.conditionPreference = conditionPreference.filter((c: string) => VALID_PROPERTY_CONDITIONS.has(c));
      }
    }
    if (heatingTypes !== undefined && heatingTypes !== null) {
      if (Array.isArray(heatingTypes)) {
        data.heatingTypes = heatingTypes.filter((h: string) => VALID_HEATING_TYPES.has(h));
      }
    }

    // Boolean fields
    if (groundFloorOnly !== undefined) data.groundFloorOnly = groundFloorOnly === true || groundFloorOnly === "true";
    if (requiresElevator !== undefined) data.requiresElevator = requiresElevator === true || requiresElevator === "true";
    if (requiresParking !== undefined) data.requiresParking = requiresParking === true || requiresParking === "true";
    if (requiresStorage !== undefined) data.requiresStorage = requiresStorage === true || requiresStorage === "true";
    if (requiresGarden !== undefined) data.requiresGarden = requiresGarden === true || requiresGarden === "true";
    if (petFriendly !== undefined) data.petFriendly = petFriendly === true || petFriendly === "true";
    if (requiresAC !== undefined) data.requiresAC = requiresAC === true || requiresAC === "true";
    if (insideCityPlan !== undefined) data.insideCityPlan = insideCityPlan === true || insideCityPlan === "true";
    if (legalizationOk !== undefined) data.legalizationOk = legalizationOk === true || legalizationOk === "true";
    if (isInvestmentPurpose !== undefined) data.isInvestmentPurpose = isInvestmentPurpose === true || isInvestmentPurpose === "true";
    if (goldenVisaEligible !== undefined) data.goldenVisaEligible = goldenVisaEligible === true || goldenVisaEligible === "true";
    if (auctionInterest !== undefined) data.auctionInterest = auctionInterest === true || auctionInterest === "true";

    // Decimal / numeric fields
    if (surfaceMin !== undefined) data.surfaceMin = toNumber(surfaceMin);
    if (surfaceMax !== undefined) data.surfaceMax = toNumber(surfaceMax);
    if (plotSizeMin !== undefined) data.plotSizeMin = toNumber(plotSizeMin);
    if (plotSizeMax !== undefined) data.plotSizeMax = toNumber(plotSizeMax);
    if (budgetMin !== undefined) data.budgetMin = toNumber(budgetMin);
    if (budgetMax !== undefined) data.budgetMax = toNumber(budgetMax);
    if (balconyMinSqm !== undefined) data.balconyMinSqm = toNumber(balconyMinSqm);
    if (expectedYieldPct !== undefined) data.expectedYieldPct = toNumber(expectedYieldPct);
    if (centerLatitude !== undefined) data.centerLatitude = toNumber(centerLatitude);
    if (centerLongitude !== undefined) data.centerLongitude = toNumber(centerLongitude);
    if (radiusKm !== undefined) data.radiusKm = toNumber(radiusKm);

    // Int fields
    if (bedroomsMin !== undefined) data.bedroomsMin = toNumber(bedroomsMin);
    if (bedroomsMax !== undefined) data.bedroomsMax = toNumber(bedroomsMax);
    if (bathroomsMin !== undefined) data.bathroomsMin = toNumber(bathroomsMin);
    if (bathroomsMax !== undefined) data.bathroomsMax = toNumber(bathroomsMax);
    if (floorMin !== undefined) data.floorMin = toNumber(floorMin);
    if (floorMax !== undefined) data.floorMax = toNumber(floorMax);
    if (constructionYearMin !== undefined) data.constructionYearMin = toNumber(constructionYearMin);
    if (constructionYearMax !== undefined) data.constructionYearMax = toNumber(constructionYearMax);

    // DateTime fields
    if (expiresAt !== undefined) {
      if (expiresAt === null || expiresAt === "") {
        data.expiresAt = null;
      } else {
        const dateValue = new Date(expiresAt);
        if (!Number.isNaN(dateValue.getTime())) {
          data.expiresAt = dateValue;
        }
      }
    }

    // JSON / array fields
    if (areasOfInterest !== undefined && areasOfInterest !== null) {
      data.areasOfInterest = Array.isArray(areasOfInterest) ? areasOfInterest : null;
    }
    if (amenities !== undefined && amenities !== null) {
      data.amenities = Array.isArray(amenities) ? amenities : null;
    }
    if (viewTypes !== undefined && viewTypes !== null) {
      data.viewTypes = Array.isArray(viewTypes) ? viewTypes : null;
    }
    if (orientationPref !== undefined && orientationPref !== null) {
      data.orientationPref = Array.isArray(orientationPref) ? orientationPref : null;
    }
    if (communicationNotes !== undefined) {
      data.communicationNotes = communicationNotes;
    }

    // Encrypt sensitive fields with per-org DEK
    const encryptableFields: Record<string, unknown> = {};
    if (data.title !== undefined) encryptableFields.title = data.title;
    if (data.notes !== undefined) encryptableFields.notes = data.notes;
    if (data.locationDisplayName !== undefined) encryptableFields.locationDisplayName = data.locationDisplayName;
    if (data.communicationNotes !== undefined) encryptableFields.communicationNotes = data.communicationNotes;
    if (data.areasOfInterest !== undefined) encryptableFields.areasOfInterest = data.areasOfInterest;

    const encrypted = await encryptRequestForOrg(encryptableFields, organizationId);
    Object.assign(data, encrypted);

    let request;

    if (id) {
      // Update existing draft
      const existingRequest = await prismadb.request.findFirst({
        where: { id, organizationId },
      });

      if (!existingRequest) {
        return NextResponse.json(
          { error: "Request not found or access denied" },
          { status: 404 }
        );
      }

      request = await prismadb.request.update({
        where: { id },
        data,
      });
    } else {
      // Create new draft
      data.createdBy = user.id;
      data.organizationId = organizationId;

      // Generate friendly ID
      const requestFriendlyId = await generateFriendlyId(prismadb, "Request", organizationId);
      data.friendlyId = requestFriendlyId;

      // Set minimum required fields for draft
      if (!data.title) {
        data.title = "Draft Request";
      }

      // requestType is required by schema — default to BUY for drafts if not provided
      if (!data.requestType) {
        data.requestType = "BUY";
      }

      request = await prismadb.request.create({
        data: data as any,
      });
    }

    await invalidateCache(
      [
        "requests:list",
        id ? `request:${id}` : "",
        assignedAgentId ? `user:${assignedAgentId}` : "",
      ].filter(Boolean)
    );

    return NextResponse.json({ id: request.id, friendlyId: request.friendlyId }, { status: 200 });
  } catch (error: unknown) {
    console.error("[REQUEST_DRAFT_POST]", error);
    console.error("[REQUEST_DRAFT_POST] dataKeys:", Object.keys(data || {}));

    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as { code: string; meta?: { target?: string[] } };
      if (prismaError.code === "P2002") {
        return NextResponse.json(
          { error: "A request with this information already exists" },
          { status: 409 }
        );
      }
      if (prismaError.code === "P2003") {
        return NextResponse.json(
          { error: "Invalid reference to related record" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to save draft" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  // PUT is same as POST for drafts - updates existing or creates new
  return POST(req);
}

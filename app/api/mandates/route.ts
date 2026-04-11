import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { generateFriendlyId } from "@/lib/friendly-id";
import { canPerformAction, canPerformActionOnEntity } from "@/lib/permissions";
import { createMandateSchema, updateMandateSchema, mandateQuerySchema } from "@/lib/validations/mandates";
import { encryptMandateForOrg, decryptMandateForOrg } from "@/lib/model-encryption";
import { validateAssignedTo } from "@/lib/validate-assigned-to";
import { createChangeLogEntry } from "@/lib/entity-change-log";

/**
 * GET /api/mandates
 *
 * Supports cursor-based pagination for large datasets:
 * - ?cursor=<mandateId> - Start after this mandate ID
 * - ?limit=<number> - Number of items per page (default: 50, max: 100)
 * - ?status=<status> - Filter by mandate status (comma-separated)
 * - ?search=<query> - Search by mandate title
 * - ?minimal=true - Return { id, title } only (for selectors)
 * - ?linked=true|false - Filter by has/no linked client
 *
 * Response includes:
 * - data: Array of mandates
 * - meta: { cursor, hasMore }
 */
export async function GET(req: Request) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const { searchParams } = new URL(req.url);

    // Parse query params with Zod
    const queryResult = mandateQuerySchema.safeParse({
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      minimal: searchParams.get("minimal") ?? undefined,
      linked: searchParams.get("linked") ?? undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: queryResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { cursor, limit, status, search, minimal, linked } = queryResult.data;

    // For minimal mode (selectors), return just id and title - much faster
    if (minimal === "true") {
      const where: Record<string, unknown> = { organizationId };
      if (search && search.trim()) {
        where.title = {
          contains: search.trim(),
          mode: "insensitive",
        };
      }

      const mandates = await prismadb.mandate.findMany({
        where,
        select: {
          id: true,
          title: true,
        },
        orderBy: { title: "asc" },
        take: 500,
      });

      return NextResponse.json(
        {
          data: mandates,
          meta: { cursor: null, hasMore: false },
        },
        { status: 200 }
      );
    }

    // Build where clause
    const where: Record<string, unknown> = { organizationId };

    if (status) {
      // Support comma-separated statuses
      const statuses = status.split(",").map((s) => s.trim());
      if (statuses.length === 1) {
        where.status = statuses[0];
      } else {
        where.status = { in: statuses };
      }
    }

    if (search && search.trim()) {
      where.title = { contains: search.trim(), mode: "insensitive" };
    }

    // Mandate_Clients relation removed — linked filter is no longer supported

    // Fetch one extra to check if there are more items
    const mandates = await prismadb.mandate.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0, // Skip the cursor item itself
      orderBy: { createdAt: "desc" },
      include: {
        assigned_to_user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        Mandate_Properties: {
          include: {
            Properties: {
              select: { id: true, friendlyId: true, property_name: true, property_type: true, property_status: true },
            },
          },
        },
      },
    });

    // Check if there are more items
    const hasMore = mandates.length > limit;
    const items = hasMore ? mandates.slice(0, -1) : mandates;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    // Decrypt each record
    const decryptedItems = await Promise.all(
      items.map((m) => decryptMandateForOrg(m, organizationId))
    );

    return NextResponse.json(
      {
        data: JSON.parse(JSON.stringify(decryptedItems)),
        meta: { cursor: nextCursor, hasMore },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[MANDATES_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch mandates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mandates
 * Create a new mandate
 */
export async function POST(req: Request) {
  try {
    // Permission check: Users need client:create permission (mandates are CRM entities)
    const createCheck = await canPerformAction("client:create");
    if (!createCheck.allowed) {
      return NextResponse.json(
        { error: createCheck.reason || "Permission denied" },
        { status: 403 }
      );
    }

    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();

    // SECURITY: Validate input with Zod schema to prevent mass assignment
    const validationResult = createMandateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const validated = validationResult.data;

    // Generate friendly ID
    const mandateId = await generateFriendlyId(prismadb, "Mandates", organizationId);

    // Validate assigned_to is a real Users.id to prevent FK violations
    const validatedAssignedTo = await validateAssignedTo(validated.assigned_to);

    // Encrypt sensitive fields
    const encrypted = await encryptMandateForOrg(
      {
        title: validated.title,
        notes: validated.notes,
        communication_notes: validated.communication_notes,
      },
      organizationId
    );

    const newMandate = await prismadb.mandate.create({
      data: {
        friendlyId: mandateId,
        organizationId,
        createdBy: user.id,
        updatedBy: user.id,
        assigned_to: validatedAssignedTo,

        // Encrypted fields
        title: encrypted.title,
        notes: encrypted.notes,
        communication_notes: encrypted.communication_notes,

        // Core brief
        transaction_type: validated.transaction_type,
        property_type: validated.property_type,
        property_purpose: validated.property_purpose,

        // Location
        areas_of_interest: validated.areas_of_interest,
        municipality: validated.municipality,
        region: validated.region,

        // Size
        size_min_sqm: validated.size_min_sqm,
        size_max_sqm: validated.size_max_sqm,
        plot_size_min_sqm: validated.plot_size_min_sqm,
        plot_size_max_sqm: validated.plot_size_max_sqm,

        // Budget
        budget_min: validated.budget_min,
        budget_max: validated.budget_max,

        // Rooms
        bedrooms_min: validated.bedrooms_min,
        bedrooms_max: validated.bedrooms_max,
        bathrooms_min: validated.bathrooms_min,
        bathrooms_max: validated.bathrooms_max,
        floor_min: validated.floor_min,
        floor_max: validated.floor_max,
        ground_floor_only: validated.ground_floor_only,

        // Condition & quality
        condition: validated.condition,
        year_built_min: validated.year_built_min,
        year_built_max: validated.year_built_max,

        // Features
        heating_type: validated.heating_type,
        energy_cert_min: validated.energy_cert_min,
        furnished: validated.furnished,
        elevator: validated.elevator,
        parking: validated.parking,
        pets_allowed: validated.pets_allowed,
        amenities: validated.amenities,

        // Legal
        inside_city_plan: validated.inside_city_plan,
        legalization_ok: validated.legalization_ok,

        // Status & urgency
        status: validated.status ?? "DRAFT",
        urgency: validated.urgency,
        timeline: validated.timeline,
        expires_at: validated.expires_at,

        // Draft
        draft_status: validated.draft_status ?? false,
      },
    });

    createChangeLogEntry({
      organizationId,
      entityType: "REQUEST",
      entityId: newMandate.id,
      eventType: "CREATED",
      actorUserId: user.id,
    }).catch((err) => console.error("[MANDATE_CREATED_LOG]", err));

    await invalidateCache(
      [
        "mandates:list",
        validated.assigned_to ? `user:${validated.assigned_to}` : "",
      ].filter(Boolean)
    );

    return NextResponse.json({ mandate: newMandate }, { status: 200 });
  } catch (error: unknown) {
    console.error("[MANDATES_POST]", error);
    return NextResponse.json({ error: "Failed to create mandate" }, { status: 500 });
  }
}

/**
 * PUT /api/mandates
 * Update an existing mandate
 */
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();

    // SECURITY: Validate input with Zod schema to prevent mass assignment
    const validationResult = updateMandateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { id, ...validated } = validationResult.data;

    // Verify the mandate belongs to the current organization before updating
    const existingMandate = await prismadb.mandate.findFirst({
      where: { id, organizationId },
    });

    if (!existingMandate) {
      return NextResponse.json(
        { error: "Mandate not found or access denied" },
        { status: 404 }
      );
    }

    // Permission check: Users need client:update permission (with ownership check)
    const updateCheck = await canPerformActionOnEntity(
      "client:update",
      "client",
      id,
      existingMandate.assigned_to
    );
    if (!updateCheck.allowed) {
      return NextResponse.json(
        { error: updateCheck.reason || "Permission denied" },
        { status: 403 }
      );
    }

    // Permission check: Check if user can reassign agent
    if (
      validated.assigned_to !== undefined &&
      validated.assigned_to !== existingMandate.assigned_to
    ) {
      const reassignCheck = await canPerformAction("client:reassign_agent");
      if (!reassignCheck.allowed) {
        return NextResponse.json(
          {
            error: "You do not have permission to change the assigned agent",
          },
          { status: 403 }
        );
      }
    }

    // Encrypt sensitive fields
    const fieldsToEncrypt: Record<string, unknown> = {};
    if (validated.title !== undefined) fieldsToEncrypt.title = validated.title;
    if (validated.notes !== undefined) fieldsToEncrypt.notes = validated.notes;
    if (validated.communication_notes !== undefined)
      fieldsToEncrypt.communication_notes = validated.communication_notes;

    const encrypted = await encryptMandateForOrg(fieldsToEncrypt, organizationId);

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedBy: user.id,
      ...encrypted,
    };

    // Non-encrypted fields - only set if provided in the update
    if (validated.transaction_type !== undefined) updateData.transaction_type = validated.transaction_type;
    if (validated.property_type !== undefined) updateData.property_type = validated.property_type;
    if (validated.property_purpose !== undefined) updateData.property_purpose = validated.property_purpose;
    if (validated.areas_of_interest !== undefined) updateData.areas_of_interest = validated.areas_of_interest;
    if (validated.municipality !== undefined) updateData.municipality = validated.municipality;
    if (validated.region !== undefined) updateData.region = validated.region;
    if (validated.size_min_sqm !== undefined) updateData.size_min_sqm = validated.size_min_sqm;
    if (validated.size_max_sqm !== undefined) updateData.size_max_sqm = validated.size_max_sqm;
    if (validated.plot_size_min_sqm !== undefined) updateData.plot_size_min_sqm = validated.plot_size_min_sqm;
    if (validated.plot_size_max_sqm !== undefined) updateData.plot_size_max_sqm = validated.plot_size_max_sqm;
    if (validated.budget_min !== undefined) updateData.budget_min = validated.budget_min;
    if (validated.budget_max !== undefined) updateData.budget_max = validated.budget_max;
    if (validated.bedrooms_min !== undefined) updateData.bedrooms_min = validated.bedrooms_min;
    if (validated.bedrooms_max !== undefined) updateData.bedrooms_max = validated.bedrooms_max;
    if (validated.bathrooms_min !== undefined) updateData.bathrooms_min = validated.bathrooms_min;
    if (validated.bathrooms_max !== undefined) updateData.bathrooms_max = validated.bathrooms_max;
    if (validated.floor_min !== undefined) updateData.floor_min = validated.floor_min;
    if (validated.floor_max !== undefined) updateData.floor_max = validated.floor_max;
    if (validated.ground_floor_only !== undefined) updateData.ground_floor_only = validated.ground_floor_only;
    if (validated.condition !== undefined) updateData.condition = validated.condition;
    if (validated.year_built_min !== undefined) updateData.year_built_min = validated.year_built_min;
    if (validated.year_built_max !== undefined) updateData.year_built_max = validated.year_built_max;
    if (validated.heating_type !== undefined) updateData.heating_type = validated.heating_type;
    if (validated.energy_cert_min !== undefined) updateData.energy_cert_min = validated.energy_cert_min;
    if (validated.furnished !== undefined) updateData.furnished = validated.furnished;
    if (validated.elevator !== undefined) updateData.elevator = validated.elevator;
    if (validated.parking !== undefined) updateData.parking = validated.parking;
    if (validated.pets_allowed !== undefined) updateData.pets_allowed = validated.pets_allowed;
    if (validated.amenities !== undefined) updateData.amenities = validated.amenities;
    if (validated.inside_city_plan !== undefined) updateData.inside_city_plan = validated.inside_city_plan;
    if (validated.legalization_ok !== undefined) updateData.legalization_ok = validated.legalization_ok;
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.urgency !== undefined) updateData.urgency = validated.urgency;
    if (validated.timeline !== undefined) updateData.timeline = validated.timeline;
    if (validated.expires_at !== undefined) updateData.expires_at = validated.expires_at;
    if (validated.assigned_to !== undefined) updateData.assigned_to = await validateAssignedTo(validated.assigned_to);
    if (validated.draft_status !== undefined) updateData.draft_status = validated.draft_status;

    const updatedMandate = await prismadb.mandate.update({
      where: { id },
      data: updateData,
    });

    await invalidateCache(
      [
        "mandates:list",
        `mandate:${id}`,
        validated.assigned_to ? `user:${validated.assigned_to}` : "",
      ].filter(Boolean)
    );

    return NextResponse.json({ mandate: updatedMandate }, { status: 200 });
  } catch (error: unknown) {
    console.error("[MANDATES_PUT]", error);

    // Handle authentication errors
    if (
      error instanceof Error &&
      (error.message === "User not authenticated" ||
        error.message === "User not found in database")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Handle Prisma connection errors
    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as { code: string };
      if (prismaError.code === "P2024") {
        return NextResponse.json(
          { error: "Database connection error. Please try again." },
          { status: 503 }
        );
      }
      if (prismaError.code === "P2025") {
        return NextResponse.json(
          { error: "Mandate not found" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to update mandate" },
      { status: 500 }
    );
  }
}

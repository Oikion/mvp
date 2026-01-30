import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { notifyAccountWatchers as notifyWatchersLegacy } from "@/lib/notify-watchers";
import { notifyClientCreated, notifyAccountWatchers } from "@/lib/notifications";
import { generateFriendlyId } from "@/lib/friendly-id";
import { dispatchClientWebhook } from "@/lib/webhooks";
import { canPerformAction, canPerformActionOnEntity } from "@/lib/permissions";
import { createClientSchema, updateClientSchema } from "@/lib/validations/crm";

export async function POST(req: Request) {
  try {
    // Permission check: Users need client:create permission
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
    const validationResult = createClientSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Validation failed", 
          details: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }
    
    const {
      client_name,
      primary_email,
      primary_phone,
      secondary_phone,
      secondary_email,
      person_type,
      full_name,
      company_name,
      intent,
      channels,
      language,
      afm,
      doy,
      id_doc,
      company_gemi,
      purpose,
      areas_of_interest,
      budget_min,
      budget_max,
      timeline,
      financing_type,
      preapproval_bank,
      needs_mortgage_help,
      gdpr_consent,
      allow_marketing,
      lead_source,
      draft_status,
      client_type,
      client_status,
      property_preferences,
      communication_notes,
      office_phone,
      website,
      fax,
      company_id,
      vat,
      billing_street,
      billing_postal_code,
      billing_city,
      billing_state,
      billing_country,
      shipping_street,
      shipping_postal_code,
      shipping_city,
      shipping_state,
      shipping_country,
      description,
      assigned_to,
      member_of,
    } = validationResult.data;

    // Generate friendly ID
    const clientId = await generateFriendlyId(prismadb, "Clients");

    const newClient = await prismadb.clients.create({
      data: {
        id: clientId,
        createdBy: user.id,
        updatedBy: user.id,
        organizationId,
        client_name,
        primary_email,
        primary_phone,
        secondary_phone,
        secondary_email,
        person_type,
        full_name,
        company_name,
        intent,
        channels,
        language,
        afm,
        doy,
        id_doc,
        company_gemi,
        purpose,
        areas_of_interest,
        budget_min,
        budget_max,
        timeline,
        financing_type,
        preapproval_bank,
        needs_mortgage_help,
        gdpr_consent,
        allow_marketing,
        lead_source,
        draft_status: draft_status ?? false,
        client_type,
        client_status,
        property_preferences,
        communication_notes,
        office_phone,
        website,
        fax,
        company_id,
        vat,
        billing_street,
        billing_postal_code,
        billing_city,
        billing_state,
        billing_country,
        shipping_street,
        shipping_postal_code,
        shipping_city,
        shipping_state,
        shipping_country,
        description,
        assigned_to,
        member_of,
      },
    });

    await invalidateCache(["clients:list", "dashboard:accounts-count", assigned_to ? `user:${assigned_to}` : ""].filter(Boolean));

    // Notify organization about new client (only for non-draft clients)
    if (!draft_status) {
      await notifyClientCreated({
        entityType: "CLIENT",
        entityId: newClient.id,
        entityName: client_name,
        creatorId: user.id,
        creatorName: user.name || user.email || "Someone",
        organizationId,
        assignedToId: assigned_to,
      });

      // Dispatch webhook for external integrations
      dispatchClientWebhook(organizationId, "client.created", newClient).catch(console.error);
    }

    return NextResponse.json({ newClient }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to create client";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
    
    // SECURITY: Validate input with Zod schema to prevent mass assignment
    const validationResult = updateClientSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Validation failed", 
          details: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }
    
    const {
      id,
      client_name,
      primary_email,
      primary_phone,
      secondary_phone,
      secondary_email,
      person_type,
      full_name,
      company_name,
      intent,
      channels,
      language,
      afm,
      doy,
      id_doc,
      company_gemi,
      purpose,
      areas_of_interest,
      budget_min,
      budget_max,
      timeline,
      financing_type,
      preapproval_bank,
      needs_mortgage_help,
      gdpr_consent,
      allow_marketing,
      lead_source,
      draft_status,
      client_type,
      client_status,
      property_preferences,
      communication_notes,
      office_phone,
      website,
      fax,
      company_id,
      vat,
      billing_street,
      billing_postal_code,
      billing_city,
      billing_state,
      billing_country,
      shipping_street,
      shipping_postal_code,
      shipping_city,
      shipping_state,
      shipping_country,
      description,
      assigned_to,
      member_of,
    } = validationResult.data;

    // Verify the client belongs to the current organization before updating
    const existingClient = await prismadb.clients.findFirst({
      where: { id, organizationId },
    });

    if (!existingClient) {
      return new NextResponse("Client not found or access denied", { status: 404 });
    }

    // Permission check: Users need client:update permission (with ownership check)
    const updateCheck = await canPerformActionOnEntity(
      "client:update",
      "client",
      id,
      existingClient.assigned_to
    );
    if (!updateCheck.allowed) {
      return NextResponse.json(
        { error: updateCheck.reason || "Permission denied" },
        { status: 403 }
      );
    }

    // Permission check: Check if user can reassign agent
    if (assigned_to !== undefined && assigned_to !== existingClient.assigned_to) {
      const reassignCheck = await canPerformAction("client:reassign_agent");
      if (!reassignCheck.allowed) {
        return NextResponse.json(
          { error: "You do not have permission to change the assigned agent" },
          { status: 403 }
        );
      }
    }

    const updatedClient = await prismadb.clients.update({
      where: { id },
      data: {
        updatedBy: user.id,
        client_name,
        primary_email,
        primary_phone,
        secondary_phone,
        secondary_email,
        person_type,
        full_name,
        company_name,
        intent,
        channels,
        language,
        afm,
        doy,
        id_doc,
        company_gemi,
        purpose,
        areas_of_interest,
        budget_min,
        budget_max,
        timeline,
        financing_type,
        preapproval_bank,
        needs_mortgage_help,
        gdpr_consent,
        allow_marketing,
        lead_source,
        draft_status: draft_status !== undefined ? draft_status : undefined,
        client_type,
        client_status,
        property_preferences,
        communication_notes,
        office_phone,
        website,
        fax,
        company_id,
        vat,
        billing_street,
        billing_postal_code,
        billing_city,
        billing_state,
        billing_country,
        shipping_street,
        shipping_postal_code,
        shipping_city,
        shipping_state,
        shipping_country,
        description,
        assigned_to,
        member_of,
      },
    });

    await invalidateCache(["clients:list", `account:${id}`, assigned_to ? `user:${assigned_to}` : ""].filter(Boolean));

    // Notify watchers about the update using new notification system
    await notifyAccountWatchers(
      id,
      organizationId,
      "ACCOUNT_UPDATED",
      `Client "${updatedClient.client_name}" was updated`,
      `${user.name || user.email} updated the client "${updatedClient.client_name}"`,
      {
        updatedBy: user.id,
        updatedByName: user.name || user.email,
      }
    );

    // Dispatch webhook for external integrations
    dispatchClientWebhook(organizationId, "client.updated", updatedClient).catch(console.error);

    return NextResponse.json({ updatedClient }, { status: 200 });
  } catch (error) {
    return new NextResponse("Initial error", { status: 500 });
  }
}

/**
 * GET /api/crm/clients
 * 
 * Supports cursor-based pagination for large datasets:
 * - ?cursor=<clientId> - Start after this client ID
 * - ?limit=<number> - Number of items per page (default: 50, max: 100)
 * - ?status=<status> - Filter by client status
 * - ?search=<query> - Search by client name or email
 * 
 * Response includes:
 * - items: Array of clients
 * - nextCursor: ID of last item (use for next page), null if no more items
 * - hasMore: Boolean indicating if more items exist
 */
export async function GET(req: Request) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

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
        where.client_name = {
          contains: search.trim(),
          mode: "insensitive",
        };
      }
      
      const clients = await prismadb.clients.findMany({
        where,
        select: {
          id: true,
          client_name: true,
        },
        orderBy: { client_name: "asc" },
        take: 1000, // Limit for selector use cases
      });

      return NextResponse.json({
        items: clients,
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
    
    if (status) {
      where.client_status = status;
    }
    
    if (search && search.trim()) {
      where.OR = [
        { client_name: { contains: search.trim(), mode: "insensitive" } },
        { primary_email: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    // Fetch one extra to check if there are more items
    const clients = await prismadb.clients.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0, // Skip the cursor item itself
      orderBy: { createdAt: "desc" },
      include: {
        Users_Clients_assigned_toToUsers: { select: { name: true } },
        Client_Contacts: {
          select: {
            contact_first_name: true,
            contact_last_name: true,
          },
          take: 4,
        },
      },
    });

    // Check if there are more items
    const hasMore = clients.length > limit;
    const items = hasMore ? clients.slice(0, -1) : clients;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return NextResponse.json({
      items: JSON.parse(JSON.stringify(items)), // Serialize for client
      nextCursor,
      hasMore,
    }, { status: 200 });
  } catch (error) {
    console.error("[CLIENTS_GET]", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch clients", details: errorMessage },
      { status: 500 }
    );
  }
}



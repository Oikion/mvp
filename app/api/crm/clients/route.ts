import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { notifyAccountWatchers as notifyWatchersLegacy } from "@/lib/notify-watchers";
import { notifyClientCreated, notifyAccountWatchers } from "@/lib/notifications";
import { generateFriendlyId } from "@/lib/friendly-id";
import { dispatchClientWebhook } from "@/lib/webhooks";
import { canPerformAction, canPerformActionOnEntity } from "@/lib/permissions";
import { createClientSchema, updateClientSchema } from "@/lib/validations/crm";
import { encryptContactForOrg, decryptContactForOrg } from "@/lib/model-encryption";
import { validateAssignedTo } from "@/lib/validate-assigned-to";

// ── Legacy clients → Contact compatibility adapter ───────────────────────────
// The legacy `clients` / `client_Contacts` Prisma models were removed in the
// v2.0 migration. This route keeps its legacy client-shaped request/response
// contract (so consumers — QuickAddClient, CreateDealButton, NewPropertyForm —
// need no changes) but stores/reads via the canonical `Contact` model.
const CLIENT_TYPE_TO_CATEGORY: Record<string, string> = {
  BUYER: "BUYER", SELLER: "SELLER", RENTER: "TENANT", INVESTOR: "INVESTOR", REFERRAL_PARTNER: "BROKER",
};
const CLIENT_STATUS_TO_CONTACT: Record<string, string> = {
  LEAD: "LEAD", ACTIVE: "ACTIVE", INACTIVE: "INACTIVE", CONVERTED: "ACTIVE", LOST: "INACTIVE",
};
const LEAD_SOURCE_TO_CONTACT: Record<string, string> = {
  REFERRAL: "REFERRAL", WEB: "WEB", PORTAL: "PORTAL_LEAD", WALK_IN: "WALK_IN", SOCIAL: "SOCIAL_MEDIA",
};

function buildAddresses(f: Record<string, any>) {
  const out: any[] = [];
  if (f.billing_street || f.billing_city || f.billing_postal_code || f.billing_state || f.billing_country) {
    out.push({ type: "billing", street: f.billing_street ?? null, city: f.billing_city ?? null, state: f.billing_state ?? null, postalCode: f.billing_postal_code ?? null, country: f.billing_country ?? null });
  }
  if (f.shipping_street || f.shipping_city || f.shipping_postal_code || f.shipping_state || f.shipping_country) {
    out.push({ type: "shipping", street: f.shipping_street ?? null, city: f.shipping_city ?? null, state: f.shipping_state ?? null, postalCode: f.shipping_postal_code ?? null, country: f.shipping_country ?? null });
  }
  return out.length ? out : undefined;
}

// Maps a legacy client-shaped object to Contact fields. Only sets keys that are
// present, so it works for both create (full) and update (partial). Legacy-only
// fields with no Contact equivalent are intentionally dropped: website, fax,
// channels, draft_status, member_of.
function mapLegacyClientToContact(f: Record<string, any>) {
  const c: Record<string, any> = {};
  const setIf = (k: string, v: any) => { if (v !== undefined) c[k] = v; };
  setIf("friendlyId", f.friendlyId);
  setIf("createdBy", f.createdBy);
  setIf("updatedBy", f.updatedBy);
  setIf("organizationId", f.organizationId);
  // displayName is required on Contact — fall back to full_name / company_name.
  if (f.client_name !== undefined || f.full_name !== undefined || f.company_name !== undefined) {
    c.displayName = f.client_name ?? f.full_name ?? f.company_name ?? "";
  }
  setIf("companyName", f.company_name);
  setIf("email", f.primary_email);
  setIf("secondaryEmail", f.secondary_email);
  setIf("primaryPhone", f.primary_phone);
  setIf("secondaryPhone", f.secondary_phone);
  setIf("officePhone", f.office_phone);
  setIf("taxId", f.afm);
  setIf("doy", f.doy);
  setIf("vatNumber", f.vat);
  setIf("companyGemi", f.company_gemi);
  setIf("companyId", f.company_id);
  setIf("idDocument", f.id_doc);
  setIf("notes", f.description);
  setIf("communicationNotes", f.communication_notes);
  setIf("languagePreference", f.language);
  setIf("gdprConsentGiven", f.gdpr_consent);
  setIf("allowMarketing", f.allow_marketing);
  setIf("assignedAgentId", f.assigned_to);
  if (f.person_type !== undefined) c.isCompany = f.person_type === "COMPANY";
  if (f.client_type !== undefined) c.category = f.client_type ? [CLIENT_TYPE_TO_CATEGORY[f.client_type] ?? "OTHER"] : [];
  if (f.client_status !== undefined) c.status = CLIENT_STATUS_TO_CONTACT[f.client_status] ?? "LEAD";
  if (f.lead_source !== undefined && f.lead_source !== null) c.source = LEAD_SOURCE_TO_CONTACT[f.lead_source];
  const addresses = buildAddresses(f);
  if (addresses !== undefined) c.addresses = addresses;
  return c;
}

// Maps a (decrypted) Contact row back to the legacy client shape consumers read.
function mapContactToLegacy(c: Record<string, any>) {
  return {
    ...c,
    id: c.id,
    client_name: c.displayName ?? null,
    primary_email: c.email ?? null,
    primary_phone: c.primaryPhone ?? null,
    client_status: c.status ?? null,
    assigned_to: c.assignedAgentId ?? null,
  };
}

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
      channels,
      language,
      afm,
      doy,
      id_doc,
      company_gemi,
      gdpr_consent,
      allow_marketing,
      lead_source,
      draft_status,
      client_type,
      client_status,
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
    const friendlyId = await generateFriendlyId(prismadb, "Contact", organizationId);

    // Validate assigned_to is a real Users.id to prevent FK violations
    const validatedAssignedTo = await validateAssignedTo(assigned_to);

    const newClient = await prismadb.contact.create({
      data: (await encryptContactForOrg(
        mapLegacyClientToContact({
          friendlyId,
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
          language,
          afm,
          doy,
          id_doc,
          company_gemi,
          gdpr_consent,
          allow_marketing,
          lead_source,
          client_type,
          client_status,
          communication_notes,
          office_phone,
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
          assigned_to: validatedAssignedTo,
        }),
        organizationId
      )) as Prisma.ContactUncheckedCreateInput,
    });

    await invalidateCache(["clients:list", "dashboard:accounts-count", assigned_to ? `user:${assigned_to}` : ""].filter(Boolean));

    // Notify organization about new client (only for non-draft clients)
    if (!draft_status) {
      await notifyClientCreated({
        entityType: "CONTACT",
        entityId: newClient.id,
        entityName: client_name,
        creatorId: user.id,
        creatorName: user.name || user.email || "Someone",
        organizationId,
        assignedToId: assigned_to ?? undefined,
      });

      // Dispatch webhook for external integrations
      dispatchClientWebhook(organizationId, "client.created", mapContactToLegacy(newClient)).catch(console.error);
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
      channels,
      language,
      afm,
      doy,
      id_doc,
      company_gemi,
      gdpr_consent,
      allow_marketing,
      lead_source,
      draft_status,
      client_type,
      client_status,
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
    const existingClient = await prismadb.contact.findFirst({
      where: { id, organizationId },
    });

    if (!existingClient) {
      return new NextResponse("Client not found or access denied", { status: 404 });
    }

    // Permission check: Users need client:update permission (with ownership check)
    const updateCheck = await canPerformActionOnEntity(
      "client:update",
      "contact",
      id,
      existingClient.assignedAgentId
    );
    if (!updateCheck.allowed) {
      return NextResponse.json(
        { error: updateCheck.reason || "Permission denied" },
        { status: 403 }
      );
    }

    // Permission check: Check if user can reassign agent
    if (assigned_to !== undefined && assigned_to !== existingClient.assignedAgentId) {
      const reassignCheck = await canPerformAction("client:reassign_agent");
      if (!reassignCheck.allowed) {
        return NextResponse.json(
          { error: "You do not have permission to change the assigned agent" },
          { status: 403 }
        );
      }
    }

    // Validate assigned_to is a real Users.id to prevent FK violations
    const validatedAssignedTo = assigned_to !== undefined
      ? await validateAssignedTo(assigned_to)
      : undefined;

    const updatedClient = await prismadb.contact.update({
      where: { id },
      data: await encryptContactForOrg(
        mapLegacyClientToContact({
          updatedBy: user.id,
          client_name,
          primary_email,
          primary_phone,
          secondary_phone,
          secondary_email,
          person_type,
          full_name,
          company_name,
          language,
          afm,
          doy,
          id_doc,
          company_gemi,
          gdpr_consent,
          allow_marketing,
          lead_source,
          client_type,
          client_status,
          communication_notes,
          office_phone,
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
          assigned_to: validatedAssignedTo,
        }),
        organizationId
      ),
    });

    await invalidateCache(["clients:list", `account:${id}`, assigned_to ? `user:${assigned_to}` : ""].filter(Boolean));

    // Notify watchers about the update using new notification system
    await notifyAccountWatchers(
      id,
      organizationId,
      "ACCOUNT_UPDATED",
      `Client "${updatedClient.displayName}" was updated`,
      `${user.name || user.email} updated the client "${updatedClient.displayName}"`,
      {
        updatedBy: user.id,
        updatedByName: user.name || user.email,
      }
    );

    // Dispatch webhook for external integrations
    dispatchClientWebhook(organizationId, "client.updated", mapContactToLegacy(updatedClient)).catch(console.error);

    return NextResponse.json({ updatedClient }, { status: 200 });
  } catch (error: unknown) {
    console.error("[CLIENTS_PUT]", error);
    
    // Handle authentication errors
    if (error instanceof Error && (error.message === "User not authenticated" || error.message === "User not found in database")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Handle Prisma connection errors
    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as { code: string };
      if (prismaError.code === "P2024") {
        return NextResponse.json({ error: "Database connection error. Please try again." }, { status: 503 });
      }
      if (prismaError.code === "P2025") {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update client" },
      { status: 500 }
    );
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
        where.displayName = {
          contains: search.trim(),
          mode: "insensitive",
        };
      }

      const contacts = await prismadb.contact.findMany({
        where,
        select: {
          id: true,
          displayName: true,
        },
        orderBy: { displayName: "asc" },
        take: 1000, // Limit for selector use cases
      });

      // Decrypt displayName and return the legacy { id, client_name } shape.
      const items = await Promise.all(
        contacts.map(async (row) => {
          const dec = await decryptContactForOrg(row, organizationId);
          return { id: dec.id, client_name: dec.displayName };
        })
      );

      return NextResponse.json({
        items,
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
      where.status = status;
    }

    if (search && search.trim()) {
      where.OR = [
        { displayName: { contains: search.trim(), mode: "insensitive" } },
        { email: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    // Fetch one extra to check if there are more items
    const contacts = await prismadb.contact.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0, // Skip the cursor item itself
      orderBy: { createdAt: "desc" },
      include: {
        assignedAgent: { select: { name: true } },
      },
    });

    // Check if there are more items
    const hasMore = contacts.length > limit;
    const page = hasMore ? contacts.slice(0, -1) : contacts;
    const nextCursor = hasMore ? page[page.length - 1]?.id : null;

    // Decrypt each Contact and map back to the legacy client shape consumers read.
    const items = await Promise.all(
      page.map(async (row) => mapContactToLegacy(await decryptContactForOrg(row, organizationId)))
    );

    return NextResponse.json({
      items,
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



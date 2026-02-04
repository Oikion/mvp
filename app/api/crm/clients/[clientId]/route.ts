import { NextResponse } from "next/server";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { prismaForOrg } from "@/lib/tenant";
import { prismadb } from "@/lib/prisma";
import { invalidateCache } from "@/lib/cache-invalidate";
import { notifyAccountWatchers } from "@/lib/notifications";
import { canPerformAction, canPerformActionOnEntity } from "@/lib/permissions";

export async function GET(
  _req: Request,
  props: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await props.params;

  if (!clientId) {
    return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
  }

  try {
    // Permission check: Users need client:read permission
    const readCheck = await canPerformAction("client:read");
    if (!readCheck.allowed) {
      return NextResponse.json(
        { error: readCheck.reason || "Permission denied" },
        { status: 403 }
      );
    }

    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const prismaTenant = prismaForOrg(organizationId);

    const client = await prismaTenant.clients.findFirst({
      where: { 
        id: clientId,
        organizationId,
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Serialize to plain object (convert Decimal to number, Date to string)
    const serialized = JSON.parse(JSON.stringify(client));

    return NextResponse.json({ client: serialized }, { status: 200 });
  } catch (error) {
    console.error("[CLIENT_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  props: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await props.params;

  if (!clientId) {
    return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
  }

  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
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
    } = body;

    // Verify the client belongs to the current organization before updating
    const existingClient = await prismadb.clients.findFirst({
      where: { id: clientId, organizationId },
    });

    if (!existingClient) {
      return NextResponse.json({ error: "Client not found or access denied" }, { status: 404 });
    }

    // Permission check: Users need client:update permission (with ownership check)
    const updateCheck = await canPerformActionOnEntity(
      "client:update",
      "client",
      clientId,
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
      where: { id: clientId },
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

    await invalidateCache(["clients:list", `account:${clientId}`, assigned_to ? `user:${assigned_to}` : ""].filter(Boolean));

    // Notify watchers about the update using new notification system
    await notifyAccountWatchers(
      clientId,
      organizationId,
      "ACCOUNT_UPDATED",
      `Client "${updatedClient.client_name}" was updated`,
      `${user.name || user.email} updated the client "${updatedClient.client_name}"`,
      {
        updatedBy: user.id,
        updatedByName: user.name || user.email,
      }
    );

    return NextResponse.json({ updatedClient }, { status: 200 });
  } catch (error) {
    console.error("[CLIENT_PUT]", error);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}







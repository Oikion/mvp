import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { notifyAccountWatchers as notifyWatchersLegacy } from "@/lib/notify-watchers";
import { notifyClientCreated, notifyAccountWatchers } from "@/lib/notifications";
import { generateFriendlyId } from "@/lib/friendly-id";

export async function POST(req: Request) {
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
    }

    return NextResponse.json({ newClient }, { status: 200 });
  } catch (error: any) {
    console.log("[NEW_CLIENT_POST]", error);
    const errorMessage = error?.message || "Failed to create client";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
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
    } = body;

    // Verify the client belongs to the current organization before updating
    const existingClient = await prismadb.clients.findFirst({
      where: { id, organizationId },
    });

    if (!existingClient) {
      return new NextResponse("Client not found or access denied", { status: 404 });
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

    return NextResponse.json({ updatedClient }, { status: 200 });
  } catch (error) {
    console.log("[UPDATE_CLIENT_PUT]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

export async function GET() {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const clients = await prismadb.clients.findMany({
      where: { organizationId },
    });
    return NextResponse.json(clients, { status: 200 });
  } catch (error) {
    console.log("[CLIENTS_GET]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}



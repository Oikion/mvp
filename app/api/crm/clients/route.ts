import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
    const {
      client_name,
      primary_email,
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

    const newClient = await prismadb.clients.create({
      data: {
        createdBy: user.id,
        updatedBy: user.id,
        organizationId,
        client_name,
        primary_email,
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

    return NextResponse.json({ newClient }, { status: 200 });
  } catch (error) {
    console.log("[NEW_CLIENT_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
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



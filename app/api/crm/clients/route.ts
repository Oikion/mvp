import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { invalidateCache } from "@/lib/cache-invalidate";

// Create new client
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }
  try {
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
        createdBy: session.user.id,
        updatedBy: session.user.id,
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

    // Invalidate cache
    await invalidateCache(["clients:list", "dashboard:accounts-count", assigned_to ? `user:${assigned_to}` : ""].filter(Boolean));

    return NextResponse.json({ newClient }, { status: 200 });
  } catch (error) {
    console.log("[NEW_CLIENT_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

// Update client
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }
  try {
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

    const updatedClient = await prismadb.clients.update({
      where: { id },
      data: {
        updatedBy: session.user.id,
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

    // Invalidate cache
    await invalidateCache(["clients:list", `account:${id}`, assigned_to ? `user:${assigned_to}` : ""].filter(Boolean));

    return NextResponse.json({ updatedClient }, { status: 200 });
  } catch (error) {
    console.log("[UPDATE_CLIENT_PUT]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

// GET all clients
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }
  try {
    const clients = await prismadb.clients.findMany({});
    return NextResponse.json(clients, { status: 200 });
  } catch (error) {
    console.log("[CLIENTS_GET]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}



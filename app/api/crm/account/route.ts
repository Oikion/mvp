import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const {
      name,
      office_phone,
      website,
      fax,
      company_id,
      vat,
      email,
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
      status,
      annual_revenue,
      member_of,
      industry,
    } = body;

    const newAccount = await (prismadb as any).crm_Accounts.create({
      data: {
        createdBy: user.id,
        updatedBy: user.id,
        name,
        office_phone,
        website,
        fax,
        company_id,
        vat,
        email,
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
        status: "Active",
        annual_revenue,
        member_of,
        industry,
      },
    });

    return NextResponse.json({ newAccount }, { status: 200 });
  } catch (error) {
    return new NextResponse("Initial error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const {
      id,
      name,
      office_phone,
      website,
      fax,
      company_id,
      vat,
      email,
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
      status,
      annual_revenue,
      member_of,
      industry,
    } = body;

    const newAccount = await (prismadb as any).crm_Accounts.update({
      where: {
        id,
      },
      data: {
        updatedBy: user.id,
        name,
        office_phone,
        website,
        fax,
        company_id,
        vat,
        email,
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
        status: status,
        annual_revenue,
        member_of,
        industry,
      },
    });

    return NextResponse.json({ newAccount }, { status: 200 });
  } catch (error) {
    return new NextResponse("Initial error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await getCurrentUser();
    const accounts = await (prismadb as any).crm_Accounts.findMany({});
    return NextResponse.json(accounts, { status: 200 });
  } catch (error) {
    return new NextResponse("Initial error", { status: 500 });
  }
}

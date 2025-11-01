import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const {
      property_name,
      primary_email,
      property_type,
      property_status,
      address_street,
      address_city,
      address_state,
      address_zip,
      price,
      bedrooms,
      bathrooms,
      square_feet,
      lot_size,
      year_built,
      description,
      assigned_to,
    } = body;

    const newProperty = await prismadb.properties.create({
      data: {
        v: 0,
        createdBy: user.id,
        updatedBy: user.id,
        property_name,
        primary_email,
        property_type,
        property_status,
        address_street,
        address_city,
        address_state,
        address_zip,
        price,
        bedrooms,
        bathrooms,
        square_feet,
        lot_size,
        year_built,
        description,
        assigned_to,
      },
    });
    return NextResponse.json({ newProperty }, { status: 200 });
  } catch (error) {
    console.log("[NEW_PROPERTY_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const {
      id,
      property_name,
      primary_email,
      property_type,
      property_status,
      address_street,
      address_city,
      address_state,
      address_zip,
      price,
      bedrooms,
      bathrooms,
      square_feet,
      lot_size,
      year_built,
      description,
      assigned_to,
    } = body;

    const updatedProperty = await prismadb.properties.update({
      where: { id },
      data: {
        updatedBy: user.id,
        property_name,
        primary_email,
        property_type,
        property_status,
        address_street,
        address_city,
        address_state,
        address_zip,
        price,
        bedrooms,
        bathrooms,
        square_feet,
        lot_size,
        year_built,
        description,
        assigned_to,
      },
    });
    return NextResponse.json({ updatedProperty }, { status: 200 });
  } catch (error) {
    console.log("[UPDATE_PROPERTY_PUT]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

export async function GET() {
  try {
    await getCurrentUser();
    const properties = await prismadb.properties.findMany({});
    return NextResponse.json(properties, { status: 200 });
  } catch (error) {
    console.log("[PROPERTIES_GET]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}



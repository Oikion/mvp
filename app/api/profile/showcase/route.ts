import { NextResponse } from "next/server";
import {
  getShowcaseProperties,
  addShowcaseProperty,
  reorderShowcaseProperties,
} from "@/actions/social/showcase";

export async function GET() {
  try {
    const properties = await getShowcaseProperties();
    return NextResponse.json(properties);
  } catch (error: any) {
    console.error("Error fetching showcase properties:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch showcase properties" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { propertyId } = body;

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property ID is required" },
        { status: 400 }
      );
    }

    const result = await addShowcaseProperty(propertyId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error adding showcase property:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add property to showcase" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: "Ordered IDs must be an array" },
        { status: 400 }
      );
    }

    const result = await reorderShowcaseProperties(orderedIds);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error reordering showcase properties:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reorder properties" },
      { status: 500 }
    );
  }
}







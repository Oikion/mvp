import { NextResponse } from "next/server";
import { getPublicProperty } from "@/actions/mls/get-public-property";

export async function GET(
  req: Request,
  props: { params: Promise<{ propertyId: string }> }
) {
  try {
    const params = await props.params;
    const { propertyId } = params;

    if (!propertyId) {
      return new NextResponse("Property ID is required", { status: 400 });
    }

    const property = await getPublicProperty(propertyId);

    if (!property) {
      return new NextResponse("Property not found or not public", { status: 404 });
    }

    return NextResponse.json(property);
  } catch (error) {
    console.error("[PUBLIC_PROPERTY_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
















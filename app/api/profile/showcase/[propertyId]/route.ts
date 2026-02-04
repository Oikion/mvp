import { NextResponse } from "next/server";
import { removeShowcaseProperty } from "@/actions/social/showcase";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { propertyId } = await params;

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property ID is required" },
        { status: 400 }
      );
    }

    const result = await removeShowcaseProperty(propertyId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error removing showcase property:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove property from showcase" },
      { status: 500 }
    );
  }
}















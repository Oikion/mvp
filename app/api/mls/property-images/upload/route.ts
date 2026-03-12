import { NextResponse } from "next/server";
import { uploadPropertyImage } from "@/actions/mls/property-images/upload-property-image";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const propertyId = formData.get("propertyId") as string | null;
    const uploadSessionId = formData.get("uploadSessionId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    if (!propertyId && !uploadSessionId) {
      return NextResponse.json(
        { error: "Either propertyId or uploadSessionId is required" },
        { status: 400 }
      );
    }

    const result = await uploadPropertyImage({
      file,
      ...(propertyId ? { propertyId } : {}),
      ...(uploadSessionId ? { uploadSessionId } : {}),
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[PROPERTY_IMAGE_UPLOAD]", error);
    const errorMessage = error instanceof Error ? error.message : "Internal error";

    // Map known validation errors to 400
    const isValidationError =
      errorMessage.includes("File must be an image") ||
      errorMessage.includes("File size exceeds") ||
      errorMessage.includes("Maximum of") ||
      errorMessage === "Unauthorized";

    return NextResponse.json(
      { error: errorMessage },
      { status: isValidationError ? 400 : 500 }
    );
  }
}

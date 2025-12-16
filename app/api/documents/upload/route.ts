import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { uploadDocumentToBlob } from "@/lib/vercel-blob";

export async function POST(req: Request) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new NextResponse("File is required", { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Upload to org-scoped path: documents/{organizationId}/{filename}
    const blob = await uploadDocumentToBlob(organizationId, file.name, fileBuffer, {
      contentType: file.type,
      addRandomSuffix: true,
    });

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      size: fileBuffer.length,
      uploadedAt: new Date().toISOString(),
      organizationId,
    });
  } catch (error: unknown) {
    console.error("[DOCUMENT_UPLOAD]", error);
    const errorMessage = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}


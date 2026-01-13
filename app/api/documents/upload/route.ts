import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { uploadDocumentToBlob } from "@/lib/vercel-blob";
import { compressFile } from "@/lib/image-compression";

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

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    
    // Compress file (images: resize + WebP, text: gzip)
    const { 
      buffer: fileBuffer, 
      mimeType: finalMimeType, 
      fileName: finalFileName,
      originalSize,
      compressedSize,
      wasCompressed,
      compressionType 
    } = await compressFile(rawBuffer, file.type, file.name, "general");
    
    if (wasCompressed) {
      const savings = Math.round((1 - compressedSize / originalSize) * 100);
      console.log(`[DOCUMENT_UPLOAD] ${compressionType} compression: ${originalSize} -> ${compressedSize} bytes (${savings}% reduction)`);
    }

    // Upload to org-scoped path: documents/{organizationId}/{filename}
    const blob = await uploadDocumentToBlob(organizationId, finalFileName, fileBuffer, {
      contentType: finalMimeType,
      addRandomSuffix: true,
    });

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      size: compressedSize,
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


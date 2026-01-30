import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { uploadDocument } from "@/actions/upload";

// Allowed file types for document uploads
const ALLOWED_MIME_TYPES = [
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Archives (for bulk uploads)
  "application/zip",
  "application/x-zip-compressed",
];

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Dangerous file extensions that should be blocked
const DANGEROUS_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".sh", ".ps1", ".dll", 
  ".scr", ".msi", ".vbs", ".js", ".html", ".htm", ".php"
];

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

    // SECURITY: Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // SECURITY: Validate file type by MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed", allowedTypes: ALLOWED_MIME_TYPES },
        { status: 400 }
      );
    }

    // SECURITY: Additional check - validate extension matches MIME type
    const fileName = file.name.toLowerCase();
    if (DANGEROUS_EXTENSIONS.some(ext => fileName.endsWith(ext))) {
      return NextResponse.json(
        { error: "File extension not allowed for security reasons" },
        { status: 400 }
      );
    }

    // Upload with automatic compression via unified action
    const result = await uploadDocument({
      file,
      fileName: file.name,
      mimeType: file.type,
      organizationId,
      folder: "documents",
      preset: "general",
      addRandomSuffix: true,
    });

    return NextResponse.json({
      url: result.url,
      pathname: result.pathname,
      size: result.compressedSize,
      originalSize: result.originalSize,
      wasCompressed: result.wasCompressed,
      compressionType: result.compressionType,
      savingsPercent: result.savingsPercent,
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

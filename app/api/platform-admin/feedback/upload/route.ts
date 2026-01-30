import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { prismadb } from "@/lib/prisma";
import { uploadDocument } from "@/actions/upload";

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types for security
const ALLOWED_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  // Archives
  "application/zip",
  "application/x-rar-compressed",
]);

export async function POST(req: Request) {
  try {
    // Verify admin access
    await requirePlatformAdmin();

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const feedbackId = formData.get("feedbackId") as string;

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    if (!feedbackId) {
      return NextResponse.json(
        { error: "Feedback ID is required" },
        { status: 400 }
      );
    }

    // Get feedback to determine organization context
    const feedback = await prismadb.feedback.findUnique({
      where: { id: feedbackId },
      select: { organizationId: true },
    });

    if (!feedback) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed" },
        { status: 400 }
      );
    }

    // Use organization context from feedback, fallback to "platform" for platform-level feedback
    const organizationId = feedback.organizationId || "platform";

    // Upload with automatic compression via unified action
    const result = await uploadDocument({
      file,
      fileName: file.name,
      mimeType: file.type,
      organizationId,
      folder: "feedback",
      preset: "general",
      addRandomSuffix: true,
    });

    return NextResponse.json({
      url: result.url,
      fileName: result.fileName,
      fileSize: result.compressedSize,
      fileType: result.mimeType,
      wasCompressed: result.wasCompressed,
      compressionType: result.compressionType,
      savingsPercent: result.savingsPercent,
    });
  } catch (error: unknown) {
    console.error("[FEEDBACK_ATTACHMENT_UPLOAD]", error);
    const errorMessage = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

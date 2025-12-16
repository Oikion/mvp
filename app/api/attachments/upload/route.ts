import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { uploadToBlob } from "@/lib/vercel-blob";
import { prismadb } from "@/lib/prisma";

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
// Maximum attachments per entity
const MAX_ATTACHMENTS_PER_ENTITY = 5;

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const entityType = formData.get("entityType") as string;
    const entityId = formData.get("entityId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    if (!entityType) {
      return NextResponse.json(
        { error: "Entity type is required" },
        { status: 400 }
      );
    }

    // Validate entity type
    if (!["socialPost", "feedback"].includes(entityType)) {
      return NextResponse.json(
        { error: "Invalid entity type" },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // If entityId is provided, check attachment limit
    if (entityId) {
      const existingCount = await prismadb.attachment.count({
        where: entityType === "socialPost"
          ? { socialPostId: entityId }
          : { feedbackId: entityId },
      });

      if (existingCount >= MAX_ATTACHMENTS_PER_ENTITY) {
        return NextResponse.json(
          { error: `Maximum ${MAX_ATTACHMENTS_PER_ENTITY} attachments allowed` },
          { status: 400 }
        );
      }
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Upload to org-scoped path: attachments/{organizationId}/{filename}
    const blob = await uploadToBlob(file.name, fileBuffer, {
      contentType: file.type,
      addRandomSuffix: true,
      organizationId,
      folder: "attachments",
    });

    // Create attachment record
    const attachment = await prismadb.attachment.create({
      data: {
        organizationId,
        uploadedById: user.id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        url: blob.url,
        ...(entityType === "socialPost" && entityId ? { socialPostId: entityId } : {}),
        ...(entityType === "feedback" && entityId ? { feedbackId: entityId } : {}),
      },
    });

    return NextResponse.json({
      id: attachment.id,
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      fileType: attachment.fileType,
      url: attachment.url,
      createdAt: attachment.createdAt,
    });
  } catch (error: unknown) {
    console.error("[ATTACHMENT_UPLOAD]", error);
    const errorMessage = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

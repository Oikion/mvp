import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { deleteFromBlob } from "@/lib/vercel-blob";
import { prismadb } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ attachmentId: string }>;
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();
    const { attachmentId } = await params;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      );
    }

    // Find the attachment
    const attachment = await prismadb.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    // Verify ownership or organization membership
    if (attachment.uploadedById !== user.id && attachment.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "Not authorized to delete this attachment" },
        { status: 403 }
      );
    }

    // Delete from Vercel Blob
    try {
      await deleteFromBlob(attachment.url);
    } catch (blobError) {
      console.error("[ATTACHMENT_DELETE_BLOB]", blobError);
      // Continue with database deletion even if blob deletion fails
    }

    // Delete from database
    await prismadb.attachment.delete({
      where: { id: attachmentId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[ATTACHMENT_DELETE]", error);
    const errorMessage = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();
    const { attachmentId } = await params;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      );
    }

    const attachment = await prismadb.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    // Verify organization membership
    if (attachment.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "Not authorized to view this attachment" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: attachment.id,
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      fileType: attachment.fileType,
      url: attachment.url,
      createdAt: attachment.createdAt,
    });
  } catch (error: unknown) {
    console.error("[ATTACHMENT_GET]", error);
    const errorMessage = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { uploadMessageAttachment, deleteMessageAttachment } from "@/actions/messaging";

/**
 * POST /api/messaging/attachments
 * 
 * Upload a file attachment for messaging.
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const result = await uploadMessageAttachment(formData);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to upload file" },
        { status: 400 }
      );
    }

    return NextResponse.json({ attachment: result.attachment }, { status: 201 });
  } catch (error) {
    console.error("[API] Upload attachment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/messaging/attachments?url=xxx
 * 
 * Delete a file attachment.
 */
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const attachmentUrl = url.searchParams.get("url");

    if (!attachmentUrl) {
      return NextResponse.json(
        { error: "Attachment URL is required" },
        { status: 400 }
      );
    }

    const result = await deleteMessageAttachment(attachmentUrl);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to delete file" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Delete attachment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

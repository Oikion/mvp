import { NextResponse } from "next/server";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { uploadDocument } from "@/actions/upload";
import { deleteFromBlob } from "@/lib/vercel-blob";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);

export async function POST(req: Request) {
  try {
    const organizationId = await getCurrentOrgId();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, WebP, and SVG are allowed." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    const result = await uploadDocument({
      file,
      fileName: `logo-${organizationId}`,
      mimeType: file.type,
      organizationId,
      folder: "avatars",
      preset: "general",
      addRandomSuffix: true,
    });

    return NextResponse.json({ success: true, url: result.url });
  } catch (error) {
    console.error("[UPLOAD_AGENCY_LOGO]", error);
    return NextResponse.json(
      { error: "Failed to upload logo" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await getCurrentOrgId();

    const body = await req.json() as { url?: unknown };
    const url = body.url;

    if (
      typeof url === "string" &&
      url.includes("blob.vercel-storage.com")
    ) {
      await deleteFromBlob(url);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE_AGENCY_LOGO]", error);
    return NextResponse.json(
      { error: "Failed to delete logo" },
      { status: 500 }
    );
  }
}

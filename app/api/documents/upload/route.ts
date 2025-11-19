import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { uploadToBlob } from "@/lib/vercel-blob";

export async function POST(req: Request) {
  try {
    await getCurrentUser();

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new NextResponse("File is required", { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const blob = await uploadToBlob(file.name, fileBuffer, {
      contentType: file.type,
      addRandomSuffix: true,
      access: "public",
    });

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      size: fileBuffer.length,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[DOCUMENT_UPLOAD]", error);
    const errorMessage = error?.message || "Internal error";
    return NextResponse.json(
      { error: errorMessage },
      { status: error?.status || 500 }
    );
  }
}


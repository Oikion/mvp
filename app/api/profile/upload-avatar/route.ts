import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { uploadToBlob, deleteFromBlob } from "@/lib/vercel-blob";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Delete old avatar from blob storage if it exists and is a blob URL
    const currentUser = await prismadb.users.findUnique({
      where: { id: user.id },
      select: { avatar: true },
    });

    if (currentUser?.avatar?.includes("blob.vercel-storage.com")) {
      try {
        await deleteFromBlob(currentUser.avatar);
      } catch (e) {
        // Ignore deletion errors, continue with upload
      }
    }

    // Upload new avatar to Vercel Blob
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `avatars/${user.id}-${Date.now()}.${file.type.split("/")[1]}`;
    
    const blob = await uploadToBlob(fileName, buffer, {
      contentType: file.type,
      addRandomSuffix: false,
      access: "public",
    });

    // Update user avatar in database
    await prismadb.users.update({
      where: { id: user.id },
      data: { avatar: blob.url },
    });

    return NextResponse.json({ 
      success: true, 
      url: blob.url,
      message: "Profile photo updated successfully" 
    });
  } catch (error) {
    console.error("[UPLOAD_AVATAR]", error);
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    
    // Get current avatar
    const currentUser = await prismadb.users.findUnique({
      where: { id: user.id },
      select: { avatar: true },
    });

    // Delete from blob storage if it's a blob URL
    if (currentUser?.avatar?.includes("blob.vercel-storage.com")) {
      try {
        await deleteFromBlob(currentUser.avatar);
      } catch (e) {
        // Ignore deletion errors
      }
    }

    // Set avatar to null in database
    await prismadb.users.update({
      where: { id: user.id },
      data: { avatar: null },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Profile photo removed" 
    });
  } catch (error) {
    console.error("[DELETE_AVATAR]", error);
    return NextResponse.json(
      { error: "Failed to remove avatar" },
      { status: 500 }
    );
  }
}









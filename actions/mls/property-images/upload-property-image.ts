"use server";

import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { uploadDocument } from "@/actions/upload/upload-document";
import sharp from "sharp";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGES_PER_PROPERTY = 20;

interface UploadPropertyImageInput {
  file: File;
  propertyId?: string;
  uploadSessionId?: string;
  position?: number;
  caption?: string;
}

interface UploadPropertyImageResult {
  id: string;
  url: string;
  blobPathname: string;
  width: number | null;
  height: number | null;
  fileSize: number;
  originalFileSize: number;
  mimeType: string;
  originalFileName: string;
  position: number;
  isPrimary: boolean;
  savingsPercent: number;
}

export async function uploadPropertyImage(
  input: UploadPropertyImageInput
): Promise<UploadPropertyImageResult> {
  const { orgId, userId } = await auth();
  if (!orgId || !userId) {
    throw new Error("Unauthorized");
  }

  const { file, propertyId, uploadSessionId, position, caption } = input;

  // Validate file type
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size exceeds 10MB limit");
  }

  // Count existing images for property or session
  const existingCount = await prismadb.propertyImage.count({
    where: {
      organizationId: orgId,
      ...(propertyId ? { propertyId } : { uploadSessionId }),
    },
  });

  if (existingCount >= MAX_IMAGES_PER_PROPERTY) {
    throw new Error(`Maximum of ${MAX_IMAGES_PER_PROPERTY} images allowed`);
  }

  // Get image dimensions before compression
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width ?? null;
  const height = metadata.height ?? null;

  // Upload via unified upload function
  const uploadResult = await uploadDocument({
    file,
    fileName: file.name,
    mimeType: file.type,
    organizationId: orgId,
    folder: "property-images",
    preset: "property",
  });

  // Determine position
  const finalPosition = position ?? existingCount;

  // First image is automatically primary
  const isPrimary = existingCount === 0;

  // Create DB record
  const image = await prismadb.propertyImage.create({
    data: {
      propertyId: propertyId ?? null,
      organizationId: orgId,
      url: uploadResult.url,
      blobPathname: uploadResult.pathname,
      position: finalPosition,
      isPrimary,
      caption: caption ?? null,
      width,
      height,
      fileSize: uploadResult.compressedSize,
      originalFileSize: uploadResult.originalSize,
      mimeType: uploadResult.mimeType,
      originalFileName: file.name,
      uploadSessionId: uploadSessionId ?? null,
    },
  });

  return {
    id: image.id,
    url: image.url,
    blobPathname: image.blobPathname,
    width,
    height,
    fileSize: image.fileSize,
    originalFileSize: image.originalFileSize,
    mimeType: image.mimeType,
    originalFileName: image.originalFileName,
    position: image.position,
    isPrimary: image.isPrimary,
    savingsPercent: uploadResult.savingsPercent,
  };
}

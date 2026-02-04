"use server";

import { uploadToBlob, type BlobFolder } from "@/lib/vercel-blob";
import {
  compressFile,
  type ImagePreset,
  type FileCompressionResult,
} from "@/lib/image-compression";

// ============================================
// TYPES
// ============================================

export interface UploadDocumentInput {
  /** File to upload - can be a File object or Buffer */
  file: File | Buffer;
  /** Original filename */
  fileName: string;
  /** MIME type of the file */
  mimeType: string;
  /** Organization ID for scoped storage */
  organizationId: string;
  /** Storage folder */
  folder: BlobFolder | "messaging" | "feedback";
  /** Image compression preset (avatar: 512x512, general: 1920x1920) */
  preset?: ImagePreset;
  /** Whether to add random suffix to filename (default: true) */
  addRandomSuffix?: boolean;
  /** User ID - used for avatar naming */
  userId?: string;
}

export interface UploadDocumentResult {
  /** Public URL of the uploaded file */
  url: string;
  /** Storage path of the file */
  pathname: string;
  /** Original file size in bytes */
  originalSize: number;
  /** Final file size in bytes (after compression) */
  compressedSize: number;
  /** Final MIME type (may differ from input if converted) */
  mimeType: string;
  /** Final filename (may differ from input if extension changed) */
  fileName: string;
  /** Whether the file was compressed */
  wasCompressed: boolean;
  /** Type of compression applied: image (Sharp), svg (SVGO), text (gzip), or none */
  compressionType: FileCompressionResult["compressionType"];
  /** Compression savings percentage (0-100) */
  savingsPercent: number;
}

// ============================================
// MAIN UPLOAD FUNCTION
// ============================================

/**
 * Unified document upload action with automatic optimization.
 *
 * This is the single entry point for ALL file uploads in the application.
 * It automatically detects file types and applies appropriate compression:
 *
 * - Images (JPEG, PNG, WebP): Sharp resize + WebP conversion
 * - GIFs: Pass through (preserve animation)
 * - SVG: SVGO minification (when supported)
 * - Text files (CSV, JSON, XML, etc.): Gzip compression (if >1KB)
 * - Other files (PDF, Office, Archives): Pass through unchanged
 *
 * @param input - Upload configuration
 * @returns Upload result with URL and metadata
 *
 * @example
 * ```typescript
 * // Upload a document
 * const result = await uploadDocument({
 *   file: formData.get("file") as File,
 *   fileName: "report.pdf",
 *   mimeType: "application/pdf",
 *   organizationId: "org_123",
 *   folder: "documents",
 * });
 *
 * // Upload an avatar with compression preset
 * const result = await uploadDocument({
 *   file: imageBuffer,
 *   fileName: "avatar.jpg",
 *   mimeType: "image/jpeg",
 *   organizationId: "org_123",
 *   folder: "avatars",
 *   preset: "avatar",
 *   userId: "user_456",
 * });
 * ```
 */
export async function uploadDocument(
  input: UploadDocumentInput
): Promise<UploadDocumentResult> {
  const {
    file,
    fileName,
    mimeType,
    organizationId,
    folder,
    preset = "general",
    addRandomSuffix = true,
    userId,
  } = input;

  // Convert File to Buffer if needed
  let fileBuffer: Buffer;
  if (Buffer.isBuffer(file)) {
    fileBuffer = file;
  } else {
    // File type
    const arrayBuf = await (file as File).arrayBuffer();
    fileBuffer = Buffer.from(arrayBuf);
  }

  // Apply compression based on file type
  const compressionResult = await compressFile(
    fileBuffer,
    mimeType,
    fileName,
    preset
  );

  // Calculate savings percentage
  const savingsPercent =
    compressionResult.wasCompressed
      ? Math.round(
          (1 - compressionResult.compressedSize / compressionResult.originalSize) *
            100
        )
      : 0;

  // Log compression results for monitoring
  if (compressionResult.wasCompressed) {
    console.log(
      `[UPLOAD] ${compressionResult.compressionType} compression: ${compressionResult.originalSize} -> ${compressionResult.compressedSize} bytes (${savingsPercent}% reduction)`
    );
  }

  // Determine final filename
  let finalFileName = compressionResult.fileName;

  // Special handling for avatars - include userId and timestamp
  if (folder === "avatars" && userId) {
    const extension = compressionResult.mimeType.split("/")[1] || "webp";
    finalFileName = `${userId}-${Date.now()}.${extension}`;
  }

  // Map folder to BlobFolder type (messaging and feedback map to attachments)
  const blobFolder: BlobFolder =
    folder === "messaging" || folder === "feedback" ? "attachments" : folder;

  // Build the blob path for messaging (special path structure)
  let blobPath: string | undefined;
  if (folder === "messaging") {
    const timestamp = Date.now();
    const safeName = finalFileName.replaceAll(/[^a-zA-Z0-9.-]/g, "_");
    blobPath = `messaging/${organizationId}/${timestamp}-${safeName}`;
  }

  // Upload to Vercel Blob
  const blob = await uploadToBlob(
    blobPath || finalFileName,
    compressionResult.buffer,
    {
      contentType: compressionResult.mimeType,
      addRandomSuffix: folder === "avatars" ? false : addRandomSuffix,
      organizationId: blobPath ? undefined : organizationId, // Don't double-scope if we built path manually
      folder: blobPath ? undefined : blobFolder,
      access: "public",
    }
  );

  return {
    url: blob.url,
    pathname: blob.pathname,
    originalSize: compressionResult.originalSize,
    compressedSize: compressionResult.compressedSize,
    mimeType: compressionResult.mimeType,
    fileName: finalFileName,
    wasCompressed: compressionResult.wasCompressed,
    compressionType: compressionResult.compressionType,
    savingsPercent,
  };
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Upload a document file with general compression settings
 */
export async function uploadDocumentFile(
  file: File | Buffer,
  fileName: string,
  mimeType: string,
  organizationId: string
): Promise<UploadDocumentResult> {
  return uploadDocument({
    file,
    fileName,
    mimeType,
    organizationId,
    folder: "documents",
    preset: "general",
  });
}

/**
 * Upload an attachment file with general compression settings
 */
export async function uploadAttachmentFile(
  file: File | Buffer,
  fileName: string,
  mimeType: string,
  organizationId: string
): Promise<UploadDocumentResult> {
  return uploadDocument({
    file,
    fileName,
    mimeType,
    organizationId,
    folder: "attachments",
    preset: "general",
  });
}

/**
 * Upload an avatar image with avatar compression preset (512x512 max)
 */
export async function uploadAvatarFile(
  file: File | Buffer,
  mimeType: string,
  organizationId: string,
  userId: string
): Promise<UploadDocumentResult> {
  return uploadDocument({
    file,
    fileName: "avatar",
    mimeType,
    organizationId,
    folder: "avatars",
    preset: "avatar",
    userId,
    addRandomSuffix: false,
  });
}

/**
 * Upload a messaging attachment with general compression settings
 */
export async function uploadMessagingAttachment(
  file: File | Buffer,
  fileName: string,
  mimeType: string,
  organizationId: string
): Promise<UploadDocumentResult> {
  return uploadDocument({
    file,
    fileName,
    mimeType,
    organizationId,
    folder: "messaging",
    preset: "general",
    addRandomSuffix: false, // Messaging uses timestamp in path
  });
}

/**
 * Upload a feedback file (screenshot, logs) with compression
 */
export async function uploadFeedbackFile(
  file: File | Buffer,
  fileName: string,
  mimeType: string,
  organizationId: string
): Promise<UploadDocumentResult> {
  return uploadDocument({
    file,
    fileName,
    mimeType,
    organizationId,
    folder: "feedback",
    preset: "general",
    addRandomSuffix: false,
  });
}

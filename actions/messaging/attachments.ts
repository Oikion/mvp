"use server";

import { del } from "@vercel/blob";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { uploadMessagingAttachment } from "@/actions/upload";

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types for messaging
const ALLOWED_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // Text
  "text/plain",
  "text/csv",
  // Archives
  "application/zip",
]);

/**
 * Upload a file attachment for messaging with automatic compression
 */
export async function uploadMessageAttachment(formData: FormData): Promise<{
  success: boolean;
  attachment?: {
    id: string;
    url: string;
    name: string;
    size: number;
    type: string;
    wasCompressed?: boolean;
    compressionType?: string;
    savingsPercent?: number;
  };
  error?: string;
}> {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: "File size exceeds 10MB limit" };
    }

    // Validate file type
    if (!ALLOWED_TYPES.has(file.type)) {
      return { success: false, error: "File type not allowed" };
    }

    // Upload with automatic compression via unified action
    const result = await uploadMessagingAttachment(
      file,
      file.name,
      file.type,
      organizationId
    );

    const timestamp = Date.now();

    return {
      success: true,
      attachment: {
        id: `att_${timestamp}`,
        url: result.url,
        name: file.name,
        size: result.compressedSize,
        type: result.mimeType,
        wasCompressed: result.wasCompressed,
        compressionType: result.compressionType,
        savingsPercent: result.savingsPercent,
      },
    };
  } catch (error) {
    console.error("[MESSAGING] Upload attachment error:", error);
    return { success: false, error: "Failed to upload file" };
  }
}

/**
 * Delete a message attachment
 */
export async function deleteMessageAttachment(url: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await del(url);
    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Delete attachment error:", error);
    return { success: false, error: "Failed to delete file" };
  }
}

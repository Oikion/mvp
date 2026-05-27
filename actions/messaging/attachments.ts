"use server";

import { del } from "@vercel/blob";
import { auth } from "@clerk/nextjs/server";
import { getCurrentUserId, getCurrentOrgId } from "@/lib/get-current-user";
import { uploadMessagingAttachment } from "@/actions/upload";
import { prismadb } from "@/lib/prisma";

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
    const [userId, organizationId] = await Promise.all([
      getCurrentUserId(),
      getCurrentOrgId(),
    ]);

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

    // Upload with automatic compression via unified action.
    // userId is included in the blob path so orphaned files (message never sent)
    // can be identified and cleaned up per-org per-user.
    const result = await uploadMessagingAttachment(
      file,
      file.name,
      file.type,
      organizationId,
      userId
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
 * Verifies the caller is the original sender before removing the blob.
 */
export async function deleteMessageAttachment(url: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // 1. Resolve the Clerk identity to an internal Users row
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return { success: false, error: "Unauthorized" };
    }

    const internalUser = await prismadb.users.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });

    if (!internalUser) {
      return { success: false, error: "Unauthorized" };
    }

    // 2. Look up the attachment and its parent message's sender
    const attachment = await prismadb.messageAttachment.findFirst({
      where: { url },
      include: { message: { select: { senderId: true } } },
    });

    if (!attachment) {
      return { success: false, error: "Attachment not found" };
    }

    // 3. Ownership check — only the original sender may delete
    if (attachment.message.senderId !== internalUser.id) {
      return {
        success: false,
        error: "You do not have permission to delete this attachment",
      };
    }

    // 4. Safe to delete
    await del(url);
    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Delete attachment error:", error);
    return { success: false, error: "Failed to delete file" };
  }
}

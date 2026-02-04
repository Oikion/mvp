import { put, del, head, list } from "@vercel/blob";

/** Supported blob storage folder types */
export type BlobFolder = "documents" | "avatars" | "templates" | "attachments";

function getBlobToken() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not defined");
  }
  return process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Generate an organization-scoped path for blob storage
 * @param organizationId - The organization ID
 * @param fileName - The file name
 * @param folder - Optional folder within the org (e.g., 'documents', 'avatars')
 * @returns Formatted path: {folder}/{organizationId}/{fileName}
 */
export function getOrgBlobPath(
  organizationId: string,
  fileName: string,
  folder: BlobFolder = "documents"
): string {
  // Sanitize the filename to prevent path traversal
  const sanitizedFileName = fileName.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
  return `${folder}/${organizationId}/${sanitizedFileName}`;
}

/**
 * Upload a file to Vercel Blob storage
 * @param fileName - Name of the file (or full path if organizationId not provided)
 * @param file - File content (Buffer, ReadableStream, or Blob)
 * @param options - Additional options for upload
 * @returns Blob object with URL and metadata
 */
export async function uploadToBlob(
  fileName: string,
  file: Buffer | ReadableStream | Blob,
  options?: {
    contentType?: string;
    addRandomSuffix?: boolean;
    access?: "public" | "private";
    organizationId?: string;
    folder?: BlobFolder;
  }
) {
  try {
    const access = options?.access || "public";
    
    // Use org-scoped path if organizationId is provided
    const blobPath = options?.organizationId
      ? getOrgBlobPath(options.organizationId, fileName, options.folder || "documents")
      : fileName;

    const blob = await put(blobPath, file, {
      access: access as "public",
      addRandomSuffix: options?.addRandomSuffix ?? true,
      token: getBlobToken(),
      contentType: options?.contentType,
    });

    return blob;
  } catch (error) {
    console.error("Error uploading to Vercel Blob:", error);
    throw error;
  }
}

/**
 * Upload a document to Vercel Blob storage with organization scoping
 * @param organizationId - The organization ID
 * @param fileName - Name of the file
 * @param file - File content (Buffer, ReadableStream, or Blob)
 * @param options - Additional options for upload
 * @returns Blob object with URL and metadata
 */
export async function uploadDocumentToBlob(
  organizationId: string,
  fileName: string,
  file: Buffer | ReadableStream | Blob,
  options?: {
    contentType?: string;
    addRandomSuffix?: boolean;
  }
) {
  return uploadToBlob(fileName, file, {
    ...options,
    organizationId,
    folder: "documents",
    access: "public",
    addRandomSuffix: options?.addRandomSuffix ?? true,
  });
}

/**
 * Upload an avatar to Vercel Blob storage with organization scoping
 * @param organizationId - The organization ID
 * @param userId - The user ID (used to construct filename)
 * @param file - File content (Buffer, ReadableStream, or Blob)
 * @param options - Additional options for upload
 * @returns Blob object with URL and metadata
 */
export async function uploadAvatarToBlob(
  organizationId: string,
  userId: string,
  file: Buffer | ReadableStream | Blob,
  options?: {
    contentType?: string;
    fileExtension?: string;
  }
) {
  const extension = options?.fileExtension || "png";
  const fileName = `${userId}-${Date.now()}.${extension}`;
  
  return uploadToBlob(fileName, file, {
    contentType: options?.contentType,
    organizationId,
    folder: "avatars",
    access: "public",
    addRandomSuffix: false, // Use predictable names for avatars
  });
}

/**
 * Upload an attachment to Vercel Blob storage with organization scoping
 * @param organizationId - The organization ID
 * @param fileName - Name of the file
 * @param file - File content (Buffer, ReadableStream, or Blob)
 * @param options - Additional options for upload
 * @returns Blob object with URL and metadata
 */
export async function uploadAttachmentToBlob(
  organizationId: string,
  fileName: string,
  file: Buffer | ReadableStream | Blob,
  options?: {
    contentType?: string;
    addRandomSuffix?: boolean;
  }
) {
  return uploadToBlob(fileName, file, {
    ...options,
    organizationId,
    folder: "attachments",
    access: "public",
    addRandomSuffix: options?.addRandomSuffix ?? true,
  });
}

/**
 * Delete a file from Vercel Blob storage
 * @param url - URL of the blob to delete
 */
export async function deleteFromBlob(url: string) {
  try {
    await del(url, {
      token: getBlobToken(),
    });
  } catch (error) {
    console.error("Error deleting from Vercel Blob:", error);
    throw error;
  }
}

/**
 * Check if a blob exists
 * @param url - URL of the blob to check
 * @returns True if blob exists, false otherwise
 */
export async function blobExists(url: string): Promise<boolean> {
  try {
    await head(url, {
      token: getBlobToken(),
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get blob metadata
 * @param url - URL of the blob
 * @returns Blob metadata or null if not found
 */
export async function getBlobMetadata(url: string) {
  try {
    const metadata = await head(url, {
      token: getBlobToken(),
    });
    return metadata;
  } catch (error) {
    console.error("Error getting blob metadata:", error);
    return null;
  }
}

/**
 * List all blobs for an organization in a specific folder
 * @param organizationId - The organization ID
 * @param folder - The folder to list (documents, avatars, templates)
 * @returns Array of blob objects
 */
export async function listOrgBlobs(
  organizationId: string,
  folder: BlobFolder = "documents"
) {
  try {
    const prefix = `${folder}/${organizationId}/`;
    const result = await list({
      prefix,
      token: getBlobToken(),
    });
    return result.blobs;
  } catch (error) {
    console.error("Error listing organization blobs:", error);
    throw error;
  }
}

/**
 * Calculate total storage used by an organization
 * @param organizationId - The organization ID
 * @returns Total size in bytes
 */
export async function getOrgStorageUsage(organizationId: string): Promise<number> {
  try {
    const folders: BlobFolder[] = ["documents", "avatars", "templates", "attachments"];
    let totalSize = 0;

    for (const folder of folders) {
      const blobs = await listOrgBlobs(organizationId, folder);
      totalSize += blobs.reduce((sum, blob) => sum + blob.size, 0);
    }

    return totalSize;
  } catch (error) {
    console.error("Error calculating org storage usage:", error);
    return 0;
  }
}


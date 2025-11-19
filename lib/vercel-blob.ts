import { put, del, head } from "@vercel/blob";

function getBlobToken() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not defined");
  }
  return process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Upload a file to Vercel Blob storage
 * @param fileName - Name of the file
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
  }
) {
  try {
    const access = options?.access || "public";
    const blob = await put(fileName, file, {
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


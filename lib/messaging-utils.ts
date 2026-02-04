/**
 * Messaging Utility Functions
 * 
 * Helper functions for file handling and formatting in the messaging module.
 * These are client-safe utilities (not server actions).
 */

/**
 * Get file type category for display
 */
export function getFileCategory(mimeType: string): "image" | "document" | "archive" | "other" {
  if (mimeType.startsWith("image/")) return "image";
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("word") ||
    mimeType.includes("excel") ||
    mimeType.includes("text")
  ) {
    return "document";
  }
  if (mimeType.includes("zip")) return "archive";
  return "other";
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Check if a file type is allowed for messaging
 */
export function isAllowedFileType(mimeType: string): boolean {
  const ALLOWED_TYPES = [
    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
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
  ];
  return ALLOWED_TYPES.includes(mimeType);
}

/**
 * Maximum file size for messaging attachments (10MB)
 */
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

/**
 * Generate a safe filename for uploads
 */
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9.-]/g, "_");
}

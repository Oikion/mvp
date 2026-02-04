/**
 * Unified Upload Module
 *
 * This module provides a single, consistent interface for all file uploads
 * in the application with automatic optimization and compression.
 *
 * @example
 * ```typescript
 * import { uploadDocument, uploadAvatarFile } from "@/actions/upload";
 *
 * // Upload any document with auto-optimization
 * const result = await uploadDocument({
 *   file,
 *   fileName: "report.pdf",
 *   mimeType: "application/pdf",
 *   organizationId: "org_123",
 *   folder: "documents",
 * });
 *
 * // Upload avatar with preset compression
 * const avatar = await uploadAvatarFile(file, "image/jpeg", "org_123", "user_456");
 * ```
 */

export {
  // Main upload function
  uploadDocument,
  // Convenience functions
  uploadDocumentFile,
  uploadAttachmentFile,
  uploadAvatarFile,
  uploadMessagingAttachment,
  uploadFeedbackFile,
  // Types
  type UploadDocumentInput,
  type UploadDocumentResult,
} from "./upload-document";

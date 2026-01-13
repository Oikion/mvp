import sharp from "sharp";
import { gzip } from "node:zlib";
import { promisify } from "node:util";

const gzipAsync = promisify(gzip);

/** Supported image MIME types for compression */
const COMPRESSIBLE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

/** GIF should be kept as-is to preserve animations */
const GIF_TYPE = "image/gif";

/** Preset configurations for different use cases */
export const IMAGE_PRESETS = {
  avatar: { maxWidth: 512, maxHeight: 512, quality: 80 },
  general: { maxWidth: 1920, maxHeight: 1920, quality: 80 },
} as const;

export type ImagePreset = keyof typeof IMAGE_PRESETS;

export interface CompressionOptions {
  /** Maximum width in pixels (default: 1920) */
  maxWidth?: number;
  /** Maximum height in pixels (default: 1920) */
  maxHeight?: number;
  /** Quality 1-100 (default: 80) */
  quality?: number;
  /** Output format - defaults to webp for best compression */
  format?: "webp" | "jpeg" | "png" | "original";
}

export interface CompressionResult {
  /** Compressed image buffer */
  buffer: Buffer;
  /** Output MIME type (may differ from input if converted) */
  mimeType: string;
  /** Original file size in bytes */
  originalSize: number;
  /** Compressed file size in bytes */
  compressedSize: number;
  /** Whether the image was actually compressed */
  wasCompressed: boolean;
}

/**
 * Check if a MIME type is a compressible image
 */
export function isCompressibleImage(mimeType: string): boolean {
  return COMPRESSIBLE_IMAGE_TYPES.has(mimeType.toLowerCase());
}

/**
 * Check if a MIME type is any image type (including GIF)
 */
export function isImage(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith("image/");
}

/**
 * Compress and optionally resize an image using Sharp.
 * 
 * - Converts JPEG/PNG to WebP for better compression
 * - Resizes if dimensions exceed max (preserving aspect ratio)
 * - Auto-rotates based on EXIF orientation
 * - Returns original buffer for non-image files or GIFs
 * 
 * @param buffer - The image buffer to compress
 * @param mimeType - The MIME type of the input image
 * @param options - Compression options
 * @returns Compressed image data with metadata
 */
export async function compressImage(
  buffer: Buffer,
  mimeType: string,
  options?: CompressionOptions
): Promise<CompressionResult> {
  const originalSize = buffer.length;
  const normalizedMimeType = mimeType.toLowerCase();

  // Return original for non-image files
  if (!isImage(normalizedMimeType)) {
    return {
      buffer,
      mimeType,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
    };
  }

  // Return original for GIFs (to preserve animation)
  if (normalizedMimeType === GIF_TYPE) {
    return {
      buffer,
      mimeType,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
    };
  }

  // Return original for non-compressible image types
  if (!isCompressibleImage(normalizedMimeType)) {
    return {
      buffer,
      mimeType,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
    };
  }

  const {
    maxWidth = IMAGE_PRESETS.general.maxWidth,
    maxHeight = IMAGE_PRESETS.general.maxHeight,
    quality = IMAGE_PRESETS.general.quality,
    format = "webp",
  } = options ?? {};

  try {
    // Create Sharp instance with auto-rotation
    let pipeline = sharp(buffer).rotate(); // Auto-rotate based on EXIF

    // Get image metadata to check if resize is needed
    const metadata = await sharp(buffer).metadata();
    const currentWidth = metadata.width ?? 0;
    const currentHeight = metadata.height ?? 0;

    // Only resize if image exceeds max dimensions
    if (currentWidth > maxWidth || currentHeight > maxHeight) {
      pipeline = pipeline.resize(maxWidth, maxHeight, {
        fit: "inside", // Preserve aspect ratio, fit within bounds
        withoutEnlargement: true, // Don't upscale smaller images
      });
    }

    // Determine output format and apply compression
    let outputMimeType: string;
    let compressedBuffer: Buffer;

    if (format === "original") {
      // Keep original format
      if (normalizedMimeType === "image/png") {
        compressedBuffer = await pipeline
          .png({ quality, compressionLevel: 9 })
          .toBuffer();
        outputMimeType = "image/png";
      } else if (normalizedMimeType === "image/webp") {
        compressedBuffer = await pipeline
          .webp({ quality })
          .toBuffer();
        outputMimeType = "image/webp";
      } else {
        // Default to JPEG for jpeg/jpg
        compressedBuffer = await pipeline
          .jpeg({ quality, mozjpeg: true })
          .toBuffer();
        outputMimeType = "image/jpeg";
      }
    } else if (format === "jpeg") {
      compressedBuffer = await pipeline
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
      outputMimeType = "image/jpeg";
    } else if (format === "png") {
      compressedBuffer = await pipeline
        .png({ quality, compressionLevel: 9 })
        .toBuffer();
      outputMimeType = "image/png";
    } else {
      // Default to WebP for best compression
      compressedBuffer = await pipeline
        .webp({ quality })
        .toBuffer();
      outputMimeType = "image/webp";
    }

    return {
      buffer: compressedBuffer,
      mimeType: outputMimeType,
      originalSize,
      compressedSize: compressedBuffer.length,
      wasCompressed: true,
    };
  } catch (error) {
    // If compression fails, return original buffer
    console.error("[IMAGE_COMPRESSION] Failed to compress image:", error);
    return {
      buffer,
      mimeType,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
    };
  }
}

/**
 * Compress an image using a preset configuration
 * 
 * @param buffer - The image buffer to compress
 * @param mimeType - The MIME type of the input image
 * @param preset - The preset to use (avatar or general)
 * @returns Compressed image data with metadata
 */
export async function compressImageWithPreset(
  buffer: Buffer,
  mimeType: string,
  preset: ImagePreset
): Promise<CompressionResult> {
  const presetConfig = IMAGE_PRESETS[preset];
  return compressImage(buffer, mimeType, presetConfig);
}

/**
 * Update filename extension based on the new MIME type
 * 
 * @param originalName - Original filename
 * @param newMimeType - New MIME type after compression
 * @returns Updated filename with correct extension
 */
export function updateFilenameExtension(
  originalName: string,
  newMimeType: string
): string {
  if (newMimeType === "image/webp") {
    return originalName.replace(/\.(jpe?g|png)$/i, ".webp");
  }
  if (newMimeType === "image/jpeg") {
    return originalName.replace(/\.(png|webp)$/i, ".jpg");
  }
  if (newMimeType === "image/png") {
    return originalName.replace(/\.(jpe?g|webp)$/i, ".png");
  }
  return originalName;
}

// ============================================
// TEXT FILE COMPRESSION (GZIP)
// ============================================

/** Text-based MIME types that benefit from gzip compression */
const COMPRESSIBLE_TEXT_TYPES = new Set([
  "text/plain",
  "text/csv",
  "text/html",
  "text/css",
  "text/javascript",
  "text/xml",
  "text/markdown",
  "application/json",
  "application/xml",
  "application/javascript",
  "application/x-javascript",
]);

/** Minimum file size (in bytes) to compress - smaller files may expand with gzip */
const MIN_SIZE_FOR_COMPRESSION = 1024; // 1KB

export interface TextCompressionResult {
  /** Compressed buffer */
  buffer: Buffer;
  /** Output MIME type (application/gzip if compressed) */
  mimeType: string;
  /** Updated filename (with .gz extension if compressed) */
  fileName: string;
  /** Original file size in bytes */
  originalSize: number;
  /** Compressed file size in bytes */
  compressedSize: number;
  /** Whether the file was actually compressed */
  wasCompressed: boolean;
}

/**
 * Check if a MIME type is a compressible text type
 */
export function isCompressibleText(mimeType: string): boolean {
  return COMPRESSIBLE_TEXT_TYPES.has(mimeType.toLowerCase());
}

/**
 * Compress a text file using gzip.
 * 
 * - Only compresses files larger than 1KB (smaller files may expand)
 * - Only compresses if result is smaller than original
 * - Adds .gz extension to filename
 * - Sets MIME type to application/gzip
 * 
 * @param buffer - The file buffer to compress
 * @param mimeType - The MIME type of the input file
 * @param fileName - The original filename
 * @returns Compressed file data with metadata
 */
export async function compressTextFile(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<TextCompressionResult> {
  const originalSize = buffer.length;
  const normalizedMimeType = mimeType.toLowerCase();

  // Return original for non-text files
  if (!isCompressibleText(normalizedMimeType)) {
    return {
      buffer,
      mimeType,
      fileName,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
    };
  }

  // Skip compression for small files (may actually increase size)
  if (originalSize < MIN_SIZE_FOR_COMPRESSION) {
    return {
      buffer,
      mimeType,
      fileName,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
    };
  }

  try {
    // Compress with gzip (level 9 for maximum compression)
    const compressedBuffer = await gzipAsync(buffer, { level: 9 });

    // Only use compressed version if it's actually smaller
    if (compressedBuffer.length >= originalSize) {
      return {
        buffer,
        mimeType,
        fileName,
        originalSize,
        compressedSize: originalSize,
        wasCompressed: false,
      };
    }

    return {
      buffer: compressedBuffer,
      mimeType: "application/gzip",
      fileName: `${fileName}.gz`,
      originalSize,
      compressedSize: compressedBuffer.length,
      wasCompressed: true,
    };
  } catch (error) {
    console.error("[TEXT_COMPRESSION] Failed to compress text file:", error);
    return {
      buffer,
      mimeType,
      fileName,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
    };
  }
}

// ============================================
// UNIFIED FILE COMPRESSION
// ============================================

export interface FileCompressionResult {
  /** Compressed buffer */
  buffer: Buffer;
  /** Output MIME type */
  mimeType: string;
  /** Updated filename */
  fileName: string;
  /** Original file size in bytes */
  originalSize: number;
  /** Compressed file size in bytes */
  compressedSize: number;
  /** Whether the file was compressed */
  wasCompressed: boolean;
  /** Type of compression applied */
  compressionType: "image" | "text" | "none";
}

/**
 * Compress any file - automatically detects type and applies appropriate compression.
 * 
 * - Images: Sharp compression with resize and WebP conversion
 * - Text files: Gzip compression
 * - Other files: No compression
 * 
 * @param buffer - The file buffer to compress
 * @param mimeType - The MIME type of the input file
 * @param fileName - The original filename
 * @param imagePreset - Preset for image compression (default: "general")
 * @returns Compressed file data with metadata
 */
export async function compressFile(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  imagePreset: ImagePreset = "general"
): Promise<FileCompressionResult> {
  const normalizedMimeType = mimeType.toLowerCase();

  // Try image compression first
  if (isCompressibleImage(normalizedMimeType)) {
    const result = await compressImageWithPreset(buffer, mimeType, imagePreset);
    return {
      buffer: result.buffer,
      mimeType: result.mimeType,
      fileName: updateFilenameExtension(fileName, result.mimeType),
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
      wasCompressed: result.wasCompressed,
      compressionType: result.wasCompressed ? "image" : "none",
    };
  }

  // Try text compression
  if (isCompressibleText(normalizedMimeType)) {
    const result = await compressTextFile(buffer, mimeType, fileName);
    return {
      buffer: result.buffer,
      mimeType: result.mimeType,
      fileName: result.fileName,
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
      wasCompressed: result.wasCompressed,
      compressionType: result.wasCompressed ? "text" : "none",
    };
  }

  // Return original for other file types (GIF, PDF, etc.)
  return {
    buffer,
    mimeType,
    fileName,
    originalSize: buffer.length,
    compressedSize: buffer.length,
    wasCompressed: false,
    compressionType: "none",
  };
}



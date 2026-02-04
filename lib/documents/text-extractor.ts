// @ts-nocheck
// TODO: Fix type errors
/**
 * Document Text Extractor
 * 
 * Extracts text content from various document types (PDF, images, text files)
 */

/**
 * Extract text from a PDF buffer using pdf-parse
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import to avoid bundling issues
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text || "";
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

/**
 * Extract text from a URL (fetches and processes the document)
 */
export async function extractTextFromUrl(url: string): Promise<{ text: string; mimeType: string }> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    const buffer = Buffer.from(await response.arrayBuffer());

    // Handle based on content type
    if (contentType.includes("application/pdf")) {
      const text = await extractTextFromPdf(buffer);
      return { text, mimeType: "application/pdf" };
    }

    if (contentType.includes("text/plain") || contentType.includes("text/html")) {
      const text = buffer.toString("utf-8");
      // Strip HTML tags if HTML
      if (contentType.includes("text/html")) {
        return { text: stripHtmlTags(text), mimeType: "text/html" };
      }
      return { text, mimeType: "text/plain" };
    }

    if (contentType.includes("image/")) {
      // For images, we'll use AI vision in the analyzer
      return { text: "[Image document - requires AI vision analysis]", mimeType: contentType };
    }

    // Default: try to read as text
    return { text: buffer.toString("utf-8"), mimeType: contentType };
  } catch (error) {
    console.error("Error extracting text from URL:", error);
    throw error;
  }
}

/**
 * Strip HTML tags from text
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Chunk text into smaller pieces for processing
 */
export function chunkText(text: string, maxChunkSize: number = 4000): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = "";

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    } else {
      currentChunk += " " + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Get document text for a document record
 */
export async function getDocumentText(
  documentUrl: string,
  cachedText?: string | null
): Promise<string> {
  // Return cached text if available
  if (cachedText && cachedText.length > 0) {
    return cachedText;
  }

  // Extract from URL
  const { text } = await extractTextFromUrl(documentUrl);
  return text;
}

/**
 * Prepare document content for AI context
 */
export function prepareDocumentContext(
  text: string,
  maxLength: number = 8000
): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Truncate intelligently at sentence boundary
  const truncated = text.substring(0, maxLength);
  const lastSentenceEnd = truncated.lastIndexOf(".");
  
  if (lastSentenceEnd > maxLength * 0.8) {
    return truncated.substring(0, lastSentenceEnd + 1) + "\n\n[Document truncated...]";
  }

  return truncated + "...\n\n[Document truncated...]";
}

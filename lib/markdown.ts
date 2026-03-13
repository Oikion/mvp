import { marked } from "marked";
import { sanitizeHtml } from "@/lib/sanitize";

// Configure marked for safe rendering
marked.setOptions({
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // Convert \n to <br>
});

/**
 * Parse content that may contain markdown or HTML
 * If content starts with < it's likely HTML from the rich text editor
 * Otherwise, parse it as markdown
 *
 * All output is sanitized to prevent XSS.
 */
export function parseContent(content: string): string {
  if (!content) return "";

  // Check if content appears to be HTML (from rich text editor)
  const trimmed = content.trim();
  if (trimmed.startsWith("<") && (trimmed.startsWith("<p") || trimmed.startsWith("<h") || trimmed.startsWith("<div") || trimmed.startsWith("<ul") || trimmed.startsWith("<ol") || trimmed.startsWith("<blockquote"))) {
    // Content is already HTML — sanitize before returning
    return sanitizeHtml(content);
  }

  // Parse as markdown, then sanitize
  return sanitizeHtml(marked.parse(content) as string);
}

/**
 * Parse markdown to HTML synchronously
 * Output is sanitized to prevent XSS.
 */
export function parseMarkdown(markdown: string): string {
  if (!markdown) return "";
  return sanitizeHtml(marked.parse(markdown) as string);
}

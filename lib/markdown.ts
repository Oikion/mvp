import { marked } from "marked";

// Configure marked for safe rendering
marked.setOptions({
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // Convert \n to <br>
});

/**
 * Parse content that may contain markdown or HTML
 * If content starts with < it's likely HTML from the rich text editor
 * Otherwise, parse it as markdown
 */
export function parseContent(content: string): string {
  if (!content) return "";
  
  // Check if content appears to be HTML (from rich text editor)
  const trimmed = content.trim();
  if (trimmed.startsWith("<") && (trimmed.startsWith("<p") || trimmed.startsWith("<h") || trimmed.startsWith("<div") || trimmed.startsWith("<ul") || trimmed.startsWith("<ol") || trimmed.startsWith("<blockquote"))) {
    // Content is already HTML, return as-is
    return content;
  }
  
  // Parse as markdown
  return marked.parse(content) as string;
}

/**
 * Parse markdown to HTML synchronously
 */
export function parseMarkdown(markdown: string): string {
  if (!markdown) return "";
  return marked.parse(markdown) as string;
}

import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Uses DOMPurify with a strict allowlist of safe tags and attributes.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "blockquote", "code", "pre", "mark", "span",
      "table", "thead", "tbody", "tr", "th", "td",
      "img", "hr", "div", "sub", "sup", "del", "s",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class", "src", "alt", "width", "height"],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize HTML with a more permissive set for rich text editors (TipTap).
 * Still strips scripts and event handlers.
 */
export function sanitizeRichHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ["target", "rel"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "textarea"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
  });
}

/**
 * Escape HTML entities in plain text to prevent injection when
 * embedding text in HTML contexts (e.g., search highlight snippets).
 */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

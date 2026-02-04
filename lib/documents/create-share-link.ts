/**
 * Generate a unique shareable link slug for documents
 * Format: random alphanumeric string (default 12 characters)
 * @param length - Length of the slug (default: 12)
 * @returns Unique slug string
 */
export function createShareLink(length: number = 12): string {
  // Generate URL-safe random string using crypto
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  
  // Use crypto.getRandomValues for secure random generation
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    
    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length];
    }
  } else {
    // Fallback for environments without crypto
    const uuid = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    result = uuid.replaceAll("-", "").substring(0, length);
  }
  
  return result;
}

/**
 * Format the full shareable URL
 * @param slug - The shareable link slug
 * @param baseUrl - Base URL of the application (defaults to current origin)
 * @param locale - Optional locale prefix (defaults to 'en')
 * @returns Full shareable URL
 */
export function formatShareUrl(slug: string, baseUrl?: string, locale: string = "en"): string {
  const base = baseUrl || (typeof globalThis.window !== "undefined" ? globalThis.window.location.origin : "");
  // Share links work with any locale, default to 'en'
  return `${base}/${locale}/documents/share/${slug}`;
}


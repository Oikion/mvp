/**
 * Helper functions for generating org-scoped URLs
 */

/**
 * Generate a public property URL with org slug
 * @param orgSlug - Organization username/slug
 * @param propertySlug - Property slug
 * @param locale - Optional locale (defaults to "el")
 * @returns Full property URL path
 */
export function getPropertyPublicUrl(
  orgSlug: string,
  propertySlug: string,
  locale: string = "el"
): string {
  return `/${locale}/${orgSlug}/property/${propertySlug}`;
}

/**
 * Generate a public client URL with org slug (for future use)
 * @param orgSlug - Organization username/slug
 * @param clientSlug - Client slug
 * @param locale - Optional locale (defaults to "el")
 * @returns Full client URL path
 */
export function getClientPublicUrl(
  orgSlug: string,
  clientSlug: string,
  locale: string = "el"
): string {
  return `/${locale}/${orgSlug}/client/${clientSlug}`;
}

/**
 * Generate a public document URL with org slug (for future use)
 * @param orgSlug - Organization username/slug
 * @param documentSlug - Document slug
 * @param locale - Optional locale (defaults to "el")
 * @returns Full document URL path
 */
export function getDocumentPublicUrl(
  orgSlug: string,
  documentSlug: string,
  locale: string = "el"
): string {
  return `/${locale}/${orgSlug}/document/${documentSlug}`;
}

/**
 * Get organization slug from Clerk organizationId
 * This is a placeholder - in real usage, you'd need to fetch from Clerk or cache
 * @param organizationId - Clerk organization ID
 * @returns Organization slug (cached or fetched)
 */

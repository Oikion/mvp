import { slugify as baseSlugify, transliterateGreek } from "@/lib/export";
import { prismadb } from "@/lib/prisma";

export { transliterateGreek };

const RESERVED_SLUGS = [
  'admin', 'api', 'settings', 'new', 'edit', 'delete', 'app', 
  'property', 'client', 'document', 'task', 'deal', 'event',
  'calendar', 'crm', 'mls', 'dashboard', 'messages', 'notifications',
  'profile', 'organization', 'team', 'help', 'support', 'contact',
  'about', 'pricing', 'features', 'login', 'logout', 'register',
  'signup', 'signin', 'auth', 'oauth', 'callback', 'verify'
];

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

/**
 * Validate a slug against reserved words and pattern requirements
 */
export function validateSlug(slug: string): boolean {
  if (!slug) return false;
  if (RESERVED_SLUGS.includes(slug.toLowerCase())) return false;
  if (!SLUG_PATTERN.test(slug)) return false;
  if (slug.length < 3 || slug.length > 100) return false;
  return true;
}

/**
 * Generate a URL-safe slug from a text string
 * Handles Greek transliteration via existing baseSlugify
 */
export function generateSlug(text: string, maxLength = 100): string {
  if (!text) return 'untitled';
  
  const slug = baseSlugify(text).slice(0, maxLength);
  return slug || 'untitled';
}

/**
 * Generate a unique slug for an entity within an organization
 * Handles collisions by appending numeric suffixes (-2, -3, etc.)
 */
export async function generateUniqueSlug(
  model: 'properties' | 'clients' | 'documents' | 'calendarEvent' | 'crm_Accounts_Tasks' | 'deal',
  text: string,
  organizationId: string,
  existingId?: string
): Promise<string> {
  let baseSlug = generateSlug(text);
  
  // Ensure the base slug is valid
  if (!validateSlug(baseSlug)) {
    baseSlug = `item-${Date.now()}`;
  }
  
  let slug = baseSlug;
  let suffix = 1;
  
  // Keep trying until we find a unique slug
  while (true) {
    const candidate = suffix === 1 ? slug : `${baseSlug}-${suffix}`;
    
    // Check if slug is valid
    if (suffix > 1 && !validateSlug(candidate)) {
      suffix++;
      continue;
    }
    
    const modelDelegate = (prismadb[model as keyof typeof prismadb] as unknown) as {
      findFirst(args: unknown): Promise<{ id: string } | null>;
    };
    const existing = await modelDelegate.findFirst({
      where: { 
        organizationId, 
        slug: candidate,
        ...(existingId ? { NOT: { id: existingId } } : {})
      },
      select: { id: true }
    });
    
    if (!existing) {
      return candidate;
    }
    
    suffix++;
    
    // Prevent infinite loops (should never happen, but safety check)
    if (suffix > 1000) {
      return `${baseSlug}-${Date.now()}`;
    }
  }
}

/**
 * Regenerate slug for an existing entity when its name/title changes
 * Only updates if the new slug would be different
 */
export async function updateSlugIfNeeded(
  model: 'properties' | 'clients' | 'documents' | 'calendarEvent' | 'crm_Accounts_Tasks' | 'deal',
  entityId: string,
  newText: string,
  organizationId: string,
  currentSlug: string | null
): Promise<string | null> {
  const newBaseSlug = generateSlug(newText);
  
  // If the new slug would be the same as current, no update needed
  if (currentSlug && (newBaseSlug === currentSlug || newBaseSlug === currentSlug.replace(/-\d+$/, ''))) {
    return null;
  }
  
  // Generate a unique slug
  const newSlug = await generateUniqueSlug(model, newText, organizationId, entityId);
  
  return newSlug;
}

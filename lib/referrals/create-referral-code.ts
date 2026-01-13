/**
 * Generate a unique referral code
 * Format: 8 character alphanumeric string (uppercase for readability)
 * @param length - Length of the code (default: 8)
 * @returns Unique referral code string
 */
export function createReferralCode(length: number = 8): string {
  // Use uppercase alphanumeric for better readability when sharing verbally
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluded similar chars: I, O, 0, 1
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
    result = uuid.replaceAll("-", "").substring(0, length).toUpperCase();
  }
  
  return result;
}

/**
 * Format the full referral URL
 * @param code - The referral code
 * @param baseUrl - Base URL of the application (defaults to process.env.NEXT_PUBLIC_APP_URL)
 * @param locale - Optional locale prefix (defaults to 'en')
 * @returns Full referral URL
 */
export function formatReferralUrl(code: string, baseUrl?: string, locale: string = "en"): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "";
  return `${base}/${locale}/app/register?ref=${code}`;
}

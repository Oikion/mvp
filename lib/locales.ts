/**
 * Available locales configuration
 * This should match the JSON files in the /locales directory
 */
export const availableLocales = [
  { code: "en", name: "English", clerkLocale: "en-US" },
  { code: "el", name: "Greek", clerkLocale: "el-GR" },
] as const;

export type LocaleCode = typeof availableLocales[number]["code"];

/**
 * Get Clerk locale code from app locale code
 */
export function getClerkLocale(locale: string): string {
  const localeConfig = availableLocales.find((l) => l.code === locale);
  return localeConfig?.clerkLocale || locale;
}

/**
 * Get available locale codes
 */
export function getAvailableLocaleCodes(): string[] {
  return availableLocales.map((l) => l.code);
}


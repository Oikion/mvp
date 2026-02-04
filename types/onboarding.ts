import { Users } from "@prisma/client";

/**
 * Supported languages for user interface
 */
export type SupportedLanguage = "en" | "el" | "cz" | "de" | "uk";

/**
 * Supported themes for the application
 */
export type SupportedTheme = "light" | "dark" | "pearl-sand" | "twilight-lavender" | "system";

/**
 * User type with onboarding status
 * Extends Prisma Users model to ensure type safety
 */
export type UserWithOnboarding = Users & {
  onboardingCompleted: boolean;
};

/**
 * Simplified notification preferences for friendlier onboarding
 */
export interface OnboardingNotificationPreferences {
  remindAboutTasks: boolean;
  remindAboutCalendar: boolean;
  remindAboutDeals: boolean;
  notifyAboutTeamActivity: boolean;
  notifyAboutDocuments: boolean;
  preferEmail: boolean;
  preferInApp: boolean;
}

/**
 * Profile visibility options
 */
export type ProfileVisibility = "PERSONAL" | "SECURE" | "PUBLIC";

/**
 * Privacy preferences for onboarding
 */
export interface OnboardingPrivacyPreferences {
  profileVisibility: ProfileVisibility;
  analyticsConsent: boolean;
}

/**
 * Full notification settings for database storage
 */
export interface OnboardingNotificationSettings {
  socialEmailEnabled?: boolean;
  socialInAppEnabled?: boolean;
  crmEmailEnabled?: boolean;
  crmInAppEnabled?: boolean;
  calendarEmailEnabled?: boolean;
  calendarInAppEnabled?: boolean;
  tasksEmailEnabled?: boolean;
  tasksInAppEnabled?: boolean;
  dealsEmailEnabled?: boolean;
  dealsInAppEnabled?: boolean;
  documentsEmailEnabled?: boolean;
  documentsInAppEnabled?: boolean;
  systemEmailEnabled?: boolean;
  systemInAppEnabled?: boolean;
}

/**
 * Organization data for onboarding
 */
export interface OnboardingOrgData {
  name: string;
  slug: string;
}

/**
 * Complete onboarding data structure
 */
export interface OnboardingData {
  // From registration
  email: string;
  firstName: string;
  lastName: string;
  // Username - may be set during Clerk sign-up or during onboarding for legacy users
  username: string;
  // User preferences
  language: SupportedLanguage;
  theme: SupportedTheme;
  // Organization
  organization: OnboardingOrgData;
  // Notifications
  notificationPreferences: OnboardingNotificationPreferences;
  // Privacy
  privacyPreferences: OnboardingPrivacyPreferences;
}

/**
 * Username step data
 */
export interface UsernameStepData {
  username: string;
  firstName: string;
  lastName: string;
}

/**
 * Username and Organization step data
 */
export interface UsernameOrgStepData {
  firstName: string;
  lastName: string;
  /** Username - editable if not set from Clerk, read-only if already set */
  username: string;
  orgName: string;
  orgSlug: string;
}

/**
 * Language and Theme step data
 */
export interface LanguageThemeStepData {
  language: SupportedLanguage;
  theme: SupportedTheme;
}

/**
 * Username availability check result
 */
export interface UsernameAvailabilityResult {
  available: boolean;
  error?: string;
}

/**
 * Onboarding completion result
 */
export interface OnboardingCompletionResult {
  success: boolean;
  error?: string;
}

/**
 * Type guard to check if user has onboarding completed field
 */
export function hasOnboardingStatus(
  user: Users | null | undefined
): user is UserWithOnboarding {
  return user !== null && user !== undefined && "onboardingCompleted" in user;
}

/**
 * Safely get onboarding status from user
 * Returns false if field doesn't exist (for backward compatibility)
 */
export function getOnboardingStatus(user: Users | null | undefined): boolean {
  if (!user) return false;
  if (hasOnboardingStatus(user)) {
    return user.onboardingCompleted;
  }
  // Default to false for users without the field (new users)
  return false;
}

/**
 * Convert simplified notification preferences to full settings
 */
export function convertPreferencesToSettings(
  prefs: OnboardingNotificationPreferences
): OnboardingNotificationSettings {
  return {
    // Tasks
    tasksEmailEnabled: prefs.remindAboutTasks && prefs.preferEmail,
    tasksInAppEnabled: prefs.remindAboutTasks && prefs.preferInApp,
    // Calendar
    calendarEmailEnabled: prefs.remindAboutCalendar && prefs.preferEmail,
    calendarInAppEnabled: prefs.remindAboutCalendar && prefs.preferInApp,
    // Deals
    dealsEmailEnabled: prefs.remindAboutDeals && prefs.preferEmail,
    dealsInAppEnabled: prefs.remindAboutDeals && prefs.preferInApp,
    // Team/Social/CRM
    socialEmailEnabled: prefs.notifyAboutTeamActivity && prefs.preferEmail,
    socialInAppEnabled: prefs.notifyAboutTeamActivity && prefs.preferInApp,
    crmEmailEnabled: prefs.notifyAboutTeamActivity && prefs.preferEmail,
    crmInAppEnabled: prefs.notifyAboutTeamActivity && prefs.preferInApp,
    // Documents
    documentsEmailEnabled: prefs.notifyAboutDocuments && prefs.preferEmail,
    documentsInAppEnabled: prefs.notifyAboutDocuments && prefs.preferInApp,
    // System - always enabled for important updates
    systemEmailEnabled: prefs.preferEmail,
    systemInAppEnabled: prefs.preferInApp,
  };
}

/**
 * Default notification preferences (all enabled)
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: OnboardingNotificationPreferences = {
  remindAboutTasks: true,
  remindAboutCalendar: true,
  remindAboutDeals: true,
  notifyAboutTeamActivity: true,
  notifyAboutDocuments: true,
  preferEmail: true,
  preferInApp: true,
};

/**
 * Default privacy preferences (most private by default)
 */
export const DEFAULT_PRIVACY_PREFERENCES: OnboardingPrivacyPreferences = {
  profileVisibility: "PERSONAL",
  analyticsConsent: true,
};

/**
 * Greek to Latin character mapping for slug generation (Greeklish)
 */
const GREEK_TO_LATIN: Record<string, string> = {
  // Lowercase Greek letters
  'α': 'a', 'ά': 'a',
  'β': 'v',
  'γ': 'g',
  'δ': 'd',
  'ε': 'e', 'έ': 'e',
  'ζ': 'z',
  'η': 'i', 'ή': 'i',
  'θ': 'th',
  'ι': 'i', 'ί': 'i', 'ϊ': 'i', 'ΐ': 'i',
  'κ': 'k',
  'λ': 'l',
  'μ': 'm',
  'ν': 'n',
  'ξ': 'x',
  'ο': 'o', 'ό': 'o',
  'π': 'p',
  'ρ': 'r',
  'σ': 's', 'ς': 's',
  'τ': 't',
  'υ': 'y', 'ύ': 'y', 'ϋ': 'y', 'ΰ': 'y',
  'φ': 'f',
  'χ': 'ch',
  'ψ': 'ps',
  'ω': 'o', 'ώ': 'o',
  // Uppercase Greek letters
  'Α': 'a', 'Ά': 'a',
  'Β': 'v',
  'Γ': 'g',
  'Δ': 'd',
  'Ε': 'e', 'Έ': 'e',
  'Ζ': 'z',
  'Η': 'i', 'Ή': 'i',
  'Θ': 'th',
  'Ι': 'i', 'Ί': 'i', 'Ϊ': 'i',
  'Κ': 'k',
  'Λ': 'l',
  'Μ': 'm',
  'Ν': 'n',
  'Ξ': 'x',
  'Ο': 'o', 'Ό': 'o',
  'Π': 'p',
  'Ρ': 'r',
  'Σ': 's',
  'Τ': 't',
  'Υ': 'y', 'Ύ': 'y', 'Ϋ': 'y',
  'Φ': 'f',
  'Χ': 'ch',
  'Ψ': 'ps',
  'Ω': 'o', 'Ώ': 'o',
};

/**
 * Convert Greek characters to their Latin equivalents (Greeklish)
 */
function greekToGreeklish(text: string): string {
  return text
    .split('')
    .map(char => GREEK_TO_LATIN[char] ?? char)
    .join('');
}

/**
 * Generate slug from organization name
 * Supports Greek characters by transliterating to Greeklish
 */
export function generateOrgSlug(name: string): string {
  return greekToGreeklish(name)
    .toLowerCase()
    .replaceAll(/\s+/g, "-")
    .replaceAll(/[^a-z0-9-]/g, "")
    .slice(0, 50);
}


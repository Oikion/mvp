import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import { el, enUS } from "date-fns/locale";

/**
 * Supported locales
 */
export type DateLocale = "el" | "en";

/**
 * Get date-fns locale object from locale string
 */
export function getDateFnsLocale(locale: DateLocale) {
  return locale === "el" ? el : enUS;
}

/**
 * Get Intl locale string from locale
 */
export function getIntlLocale(locale: DateLocale): string {
  return locale === "el" ? "el-GR" : "en-US";
}

/**
 * Date format presets
 */
export const DATE_FORMATS = {
  /** Short date: 30/01/2026 (el) or 01/30/2026 (en) */
  short: "P",
  /** Medium date: 30 Ιαν 2026 (el) or Jan 30, 2026 (en) */
  medium: "PP",
  /** Long date: 30 Ιανουαρίου 2026 (el) or January 30, 2026 (en) */
  long: "PPP",
  /** Full date with day: Πέμπτη, 30 Ιανουαρίου 2026 */
  full: "PPPP",
  /** ISO date: 2026-01-30 */
  iso: "yyyy-MM-dd",
  /** Time: 14:30 */
  time: "HH:mm",
  /** Time with seconds: 14:30:45 */
  timeWithSeconds: "HH:mm:ss",
  /** Date and time: 30/01/2026, 14:30 */
  dateTime: "Pp",
  /** Full date and time: 30 Ιανουαρίου 2026 στις 14:30 */
  fullDateTime: "PPPp",
  /** Month and year: Ιανουάριος 2026 */
  monthYear: "MMMM yyyy",
  /** Short month and year: Ιαν 2026 */
  shortMonthYear: "MMM yyyy",
} as const;

export type DateFormatPreset = keyof typeof DATE_FORMATS;

/**
 * Parse a date value (string, Date, or number) to Date object
 */
export function parseDate(value: string | Date | number | null | undefined): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  if (typeof value === "number") {
    const date = new Date(value);
    return isValid(date) ? date : null;
  }

  // Try parsing as ISO string
  try {
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Format a date using a preset or custom format string
 *
 * @param value - Date value (string, Date, or number)
 * @param locale - Locale string ("el" or "en")
 * @param formatPreset - Preset name or custom format string
 * @returns Formatted date string or empty string if invalid
 *
 * @example
 * ```tsx
 * formatDate(new Date(), "el", "short") // "30/01/2026"
 * formatDate("2026-01-30", "en", "long") // "January 30, 2026"
 * formatDate(new Date(), "el", "yyyy-MM-dd") // "2026-01-30"
 * ```
 */
export function formatDate(
  value: string | Date | number | null | undefined,
  locale: DateLocale = "el",
  formatPreset: DateFormatPreset = "short"
): string {
  const date = parseDate(value);
  if (!date) return "";

  const formatStr =
    formatPreset in DATE_FORMATS
      ? DATE_FORMATS[formatPreset as DateFormatPreset]
      : formatPreset;

  try {
    return format(date, formatStr, { locale: getDateFnsLocale(locale) });
  } catch {
    return "";
  }
}

/**
 * Format a date as relative time (e.g., "2 hours ago")
 *
 * @param value - Date value (string, Date, or number)
 * @param locale - Locale string ("el" or "en")
 * @param options - Options for formatDistanceToNow
 * @returns Relative time string or empty string if invalid
 *
 * @example
 * ```tsx
 * formatRelativeTime(new Date(Date.now() - 3600000), "el") // "πριν από 1 ώρα"
 * formatRelativeTime(new Date(Date.now() - 86400000), "en") // "1 day ago"
 * ```
 */
export function formatRelativeTime(
  value: string | Date | number | null | undefined,
  locale: DateLocale = "el",
  options?: { addSuffix?: boolean; includeSeconds?: boolean }
): string {
  const date = parseDate(value);
  if (!date) return "";

  try {
    return formatDistanceToNow(date, {
      addSuffix: options?.addSuffix ?? true,
      includeSeconds: options?.includeSeconds ?? false,
      locale: getDateFnsLocale(locale),
    });
  } catch {
    return "";
  }
}

/**
 * Format a time from a date
 *
 * @param value - Date value (string, Date, or number)
 * @param locale - Locale string ("el" or "en")
 * @param includeSeconds - Whether to include seconds
 * @returns Formatted time string or empty string if invalid
 *
 * @example
 * ```tsx
 * formatTime(new Date(), "el") // "14:30"
 * formatTime(new Date(), "en", true) // "14:30:45"
 * ```
 */
export function formatTime(
  value: string | Date | number | null | undefined,
  locale: DateLocale = "el",
  includeSeconds = false
): string {
  return formatDate(
    value,
    locale,
    includeSeconds ? "timeWithSeconds" : "time"
  );
}

/**
 * Format a date and time
 *
 * @param value - Date value (string, Date, or number)
 * @param locale - Locale string ("el" or "en")
 * @param full - Whether to use full format
 * @returns Formatted date and time string or empty string if invalid
 *
 * @example
 * ```tsx
 * formatDateTime(new Date(), "el") // "30/01/2026, 14:30"
 * formatDateTime(new Date(), "el", true) // "30 Ιανουαρίου 2026 στις 14:30"
 * ```
 */
export function formatDateTime(
  value: string | Date | number | null | undefined,
  locale: DateLocale = "el",
  full = false
): string {
  return formatDate(value, locale, full ? "fullDateTime" : "dateTime");
}

/**
 * Format a date range
 *
 * @param start - Start date
 * @param end - End date
 * @param locale - Locale string ("el" or "en")
 * @returns Formatted date range string
 *
 * @example
 * ```tsx
 * formatDateRange(new Date(), new Date(Date.now() + 86400000), "el")
 * // "30 Ιαν - 31 Ιαν 2026"
 * ```
 */
export function formatDateRange(
  start: string | Date | number | null | undefined,
  end: string | Date | number | null | undefined,
  locale: DateLocale = "el"
): string {
  const startDate = parseDate(start);
  const endDate = parseDate(end);

  if (!startDate && !endDate) return "";
  if (!startDate) return formatDate(endDate, locale, "medium");
  if (!endDate) return formatDate(startDate, locale, "medium");

  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  // Same year - omit year from start date
  if (startYear === endYear) {
    const startFormatted = format(startDate, "d MMM", {
      locale: getDateFnsLocale(locale),
    });
    const endFormatted = format(endDate, "d MMM yyyy", {
      locale: getDateFnsLocale(locale),
    });
    return `${startFormatted} - ${endFormatted}`;
  }

  // Different years - show both
  return `${formatDate(startDate, locale, "medium")} - ${formatDate(
    endDate,
    locale,
    "medium"
  )}`;
}

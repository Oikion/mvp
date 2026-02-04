import { getIntlLocale, type DateLocale } from "./date";

/**
 * Format options for numbers
 */
export interface FormatNumberOptions {
  /**
   * Minimum decimal places. Default: 0
   */
  minimumFractionDigits?: number;
  /**
   * Maximum decimal places. Default: 2
   */
  maximumFractionDigits?: number;
  /**
   * Whether to use compact notation. Default: false
   */
  compact?: boolean;
  /**
   * Unit to display (e.g., "meter", "square-meter")
   */
  unit?: string;
  /**
   * Unit display style. Default: "short"
   */
  unitDisplay?: "short" | "long" | "narrow";
}

/**
 * Format a number with locale-aware separators
 *
 * @param value - Numeric value to format
 * @param locale - Locale string ("el" or "en")
 * @param options - Formatting options
 * @returns Formatted number string or empty string if invalid
 *
 * @example
 * ```tsx
 * formatNumber(1500, "el") // "1.500"
 * formatNumber(1500.5, "en") // "1,500.5"
 * formatNumber(1500000, "el", { compact: true }) // "1,5M"
 * ```
 */
export function formatNumber(
  value: number | string | null | undefined,
  locale: DateLocale = "el",
  options: FormatNumberOptions = {}
): string {
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    compact = false,
    unit,
    unitDisplay = "short",
  } = options;

  // Parse string to number if needed
  const numValue = typeof value === "string" ? parseFloat(value) : value;

  if (numValue === null || numValue === undefined || isNaN(numValue)) {
    return "";
  }

  try {
    const intlLocale = getIntlLocale(locale);

    // Use unit style if unit is provided
    if (unit) {
      const formatter = new Intl.NumberFormat(intlLocale, {
        style: "unit",
        unit,
        unitDisplay,
        minimumFractionDigits,
        maximumFractionDigits,
      });
      return formatter.format(numValue);
    }

    const formatter = new Intl.NumberFormat(intlLocale, {
      minimumFractionDigits,
      maximumFractionDigits,
      notation: compact ? "compact" : "standard",
      compactDisplay: compact ? "short" : undefined,
    });

    return formatter.format(numValue);
  } catch {
    // Fallback to simple format
    return numValue.toFixed(maximumFractionDigits);
  }
}

/**
 * Format a percentage
 *
 * @param value - Numeric value (0-100 or 0-1 depending on isDecimal)
 * @param locale - Locale string ("el" or "en")
 * @param options - Formatting options
 * @returns Formatted percentage string
 *
 * @example
 * ```tsx
 * formatPercentage(75, "el") // "75%"
 * formatPercentage(0.75, "el", { isDecimal: true }) // "75%"
 * formatPercentage(75.5, "en", { decimals: 1 }) // "75.5%"
 * ```
 */
export function formatPercentage(
  value: number | null | undefined,
  locale: DateLocale = "el",
  options?: {
    /** Whether value is already decimal (0-1) or percentage (0-100). Default: false */
    isDecimal?: boolean;
    /** Number of decimal places. Default: 0 */
    decimals?: number;
  }
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "";
  }

  const { isDecimal = false, decimals = 0 } = options ?? {};

  // Convert decimal to percentage if needed
  const percentValue = isDecimal ? value * 100 : value;

  try {
    const intlLocale = getIntlLocale(locale);

    const formatter = new Intl.NumberFormat(intlLocale, {
      style: "percent",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    // Intl percent expects decimal, so convert back
    return formatter.format(percentValue / 100);
  } catch {
    return `${percentValue.toFixed(decimals)}%`;
  }
}

/**
 * Format square meters with locale-aware formatting
 *
 * @param value - Area in square meters
 * @param locale - Locale string ("el" or "en")
 * @returns Formatted area string
 *
 * @example
 * ```tsx
 * formatArea(120, "el") // "120 τ.μ."
 * formatArea(120, "en") // "120 m²"
 * ```
 */
export function formatArea(
  value: number | null | undefined,
  locale: DateLocale = "el"
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "";
  }

  const formattedNumber = formatNumber(value, locale, {
    maximumFractionDigits: 0,
  });

  // Use Greek abbreviation for Greek locale
  const unit = locale === "el" ? "τ.μ." : "m²";

  return `${formattedNumber} ${unit}`;
}

/**
 * Format a large number with K, M, B suffixes
 *
 * @param value - Numeric value
 * @param locale - Locale string ("el" or "en")
 * @param decimals - Number of decimal places. Default: 1
 * @returns Formatted compact number string
 *
 * @example
 * ```tsx
 * formatCompactNumber(1500, "el") // "1,5K"
 * formatCompactNumber(1500000, "en") // "1.5M"
 * ```
 */
export function formatCompactNumber(
  value: number | null | undefined,
  locale: DateLocale = "el",
  decimals = 1
): string {
  return formatNumber(value, locale, {
    compact: true,
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format an ordinal number (1st, 2nd, 3rd, etc.)
 *
 * @param value - Numeric value
 * @param locale - Locale string ("el" or "en")
 * @returns Formatted ordinal string
 *
 * @example
 * ```tsx
 * formatOrdinal(1, "en") // "1st"
 * formatOrdinal(2, "en") // "2nd"
 * formatOrdinal(1, "el") // "1ος"
 * ```
 */
export function formatOrdinal(
  value: number | null | undefined,
  locale: DateLocale = "el"
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "";
  }

  if (locale === "el") {
    // Greek ordinals are simpler - just add suffix
    return `${value}ος`;
  }

  // English ordinals
  const suffixes = ["th", "st", "nd", "rd"];
  const v = value % 100;
  const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];

  return `${value}${suffix}`;
}

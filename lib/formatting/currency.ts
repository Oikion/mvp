import { getIntlLocale, type DateLocale } from "./date";

/**
 * Supported currencies
 */
export type Currency = "EUR" | "USD" | "GBP";

/**
 * Default currency for the application
 */
export const DEFAULT_CURRENCY: Currency = "EUR";

/**
 * Currency symbols for quick display
 */
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
};

/**
 * Format options for currency
 */
export interface FormatCurrencyOptions {
  /**
   * Currency code. Default: "EUR"
   */
  currency?: Currency;
  /**
   * Whether to show decimal places. Default: true
   */
  showDecimals?: boolean;
  /**
   * Number of decimal places. Default: 2
   */
  decimals?: number;
  /**
   * Whether to show the currency symbol. Default: true
   */
  showSymbol?: boolean;
  /**
   * Whether to use compact notation for large numbers. Default: false
   */
  compact?: boolean;
}

/**
 * Format a number as currency
 *
 * @param value - Numeric value to format
 * @param locale - Locale string ("el" or "en")
 * @param options - Formatting options
 * @returns Formatted currency string or empty string if invalid
 *
 * @example
 * ```tsx
 * formatCurrency(1500, "el") // "€1.500,00"
 * formatCurrency(1500, "en") // "€1,500.00"
 * formatCurrency(1500, "el", { showDecimals: false }) // "€1.500"
 * formatCurrency(1500000, "el", { compact: true }) // "€1,5M"
 * ```
 */
export function formatCurrency(
  value: number | string | null | undefined,
  locale: DateLocale = "el",
  options: FormatCurrencyOptions = {}
): string {
  const {
    currency = DEFAULT_CURRENCY,
    showDecimals = true,
    decimals = 2,
    showSymbol = true,
    compact = false,
  } = options;

  // Parse string to number if needed
  const numValue = typeof value === "string" ? Number.parseFloat(value) : value;

  if (numValue === null || numValue === undefined || Number.isNaN(numValue)) {
    return "";
  }

  try {
    const intlLocale = getIntlLocale(locale);

    const formatter = new Intl.NumberFormat(intlLocale, {
      style: showSymbol ? "currency" : "decimal",
      currency: showSymbol ? currency : undefined,
      minimumFractionDigits: showDecimals ? decimals : 0,
      maximumFractionDigits: showDecimals ? decimals : 0,
      notation: compact ? "compact" : "standard",
      compactDisplay: compact ? "short" : undefined,
    });

    return formatter.format(numValue);
  } catch {
    // Fallback to simple format
    const symbol = showSymbol ? CURRENCY_SYMBOLS[currency] : "";
    return `${symbol}${numValue.toFixed(showDecimals ? decimals : 0)}`;
  }
}

/**
 * Format a price (alias for formatCurrency with common defaults)
 *
 * @param value - Numeric value to format
 * @param locale - Locale string ("el" or "en")
 * @param options - Formatting options
 * @returns Formatted price string
 *
 * @example
 * ```tsx
 * formatPrice(250000, "el") // "€250.000"
 * formatPrice(1500000, "el") // "€1.500.000"
 * ```
 */
export function formatPrice(
  value: number | string | null | undefined,
  locale: DateLocale = "el",
  options?: Omit<FormatCurrencyOptions, "showDecimals" | "decimals">
): string {
  // Prices typically don't show decimals in real estate context
  return formatCurrency(value, locale, {
    ...options,
    showDecimals: false,
  });
}

/**
 * Format a price range
 *
 * @param min - Minimum price
 * @param max - Maximum price
 * @param locale - Locale string ("el" or "en")
 * @returns Formatted price range string
 *
 * @example
 * ```tsx
 * formatPriceRange(100000, 250000, "el") // "€100.000 - €250.000"
 * formatPriceRange(100000, null, "el") // "από €100.000"
 * formatPriceRange(null, 250000, "el") // "έως €250.000"
 * ```
 */
export function formatPriceRange(
  min: number | null | undefined,
  max: number | null | undefined,
  locale: DateLocale = "el"
): string {
  const fromLabel = locale === "el" ? "από" : "from";
  const toLabel = locale === "el" ? "έως" : "up to";

  if (min && max) {
    return `${formatPrice(min, locale)} - ${formatPrice(max, locale)}`;
  }

  if (min) {
    return `${fromLabel} ${formatPrice(min, locale)}`;
  }

  if (max) {
    return `${toLabel} ${formatPrice(max, locale)}`;
  }

  return "";
}

/**
 * Parse a currency string to number
 *
 * @param value - Currency string to parse
 * @returns Parsed number or null if invalid
 *
 * @example
 * ```tsx
 * parseCurrency("€1.500,00") // 1500
 * parseCurrency("$1,500.00") // 1500
 * parseCurrency("1500") // 1500
 * ```
 */
export function parseCurrency(value: string | null | undefined): number | null {
  if (!value) return null;

  // Remove currency symbols and whitespace
  let cleaned = value.replaceAll(/[€$£\s]/g, "");

  // Determine decimal separator (last . or , before digits)
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");

  if (lastComma > lastDot) {
    // European format: 1.500,00 -> 1500.00
    cleaned = cleaned.replaceAll(".", "").replace(",", ".");
  } else if (lastDot > lastComma) {
    // US format: 1,500.00 -> 1500.00
    cleaned = cleaned.replaceAll(",", "");
  } else {
    // No decimal separator, just remove commas
    cleaned = cleaned.replaceAll(",", "");
  }

  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
}

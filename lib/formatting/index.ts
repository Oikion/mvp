/**
 * Centralized Formatting Utilities
 *
 * This module provides consistent formatting for dates, times, numbers, and currency
 * across the application. All formatters are locale-aware and follow a consistent API.
 *
 * Usage:
 * ```tsx
 * import { formatDate, formatCurrency, formatRelativeTime } from "@/lib/formatting";
 *
 * // Date formatting
 * formatDate(new Date(), "el") // "30/01/2026"
 *
 * // Currency formatting
 * formatCurrency(1500, "el") // "€1.500,00"
 *
 * // Relative time
 * formatRelativeTime(new Date(Date.now() - 3600000), "el") // "πριν από 1 ώρα"
 * ```
 */

export * from "./date";
export * from "./currency";
export * from "./number";

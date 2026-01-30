/**
 * Changelog Category Colors - Oikion Design System
 *
 * Centralized color definitions for changelog categories and tags.
 * This is a feature-specific color palette that supports all Tailwind colors
 * for customizable changelog tags.
 *
 * Note: These are intentionally NOT semantic colors since changelog categories
 * need arbitrary user-selected colors for visual distinction.
 *
 * @example
 * ```tsx
 * import { getTagColorClasses, TAG_COLORS } from '@/lib/changelog/category-colors';
 *
 * <span className={getTagColorClasses("blue")}>Tag Name</span>
 * ```
 */

/**
 * Available color names for changelog tags
 */
export type TagColor =
  | "gray"
  | "red"
  | "orange"
  | "amber"
  | "yellow"
  | "lime"
  | "green"
  | "emerald"
  | "teal"
  | "cyan"
  | "sky"
  | "blue"
  | "indigo"
  | "violet"
  | "purple"
  | "fuchsia"
  | "pink"
  | "rose";

/**
 * Color classes for different styles
 */
export interface TagColorClasses {
  bg: string;
  text: string;
  border: string;
  /** Combined classes for convenience */
  combined: string;
}

/**
 * Color styles object (for structured access)
 */
export const TAG_COLOR_STYLES: Record<TagColor, TagColorClasses> = {
  gray: {
    bg: "bg-gray-500/10",
    text: "text-muted-foreground dark:text-muted-foreground",
    border: "border-gray-500/20",
    combined: "bg-gray-500/10 text-muted-foreground dark:text-muted-foreground border-gray-500/20",
  },
  red: {
    bg: "bg-destructive/10",
    text: "text-destructive dark:text-destructive",
    border: "border-destructive/20",
    combined: "bg-destructive/10 text-destructive dark:text-destructive border-destructive/20",
  },
  orange: {
    bg: "bg-warning/10",
    text: "text-warning dark:text-orange-400",
    border: "border-orange-500/20",
    combined: "bg-warning/10 text-warning dark:text-orange-400 border-orange-500/20",
  },
  amber: {
    bg: "bg-warning/10",
    text: "text-warning dark:text-warning",
    border: "border-warning/20",
    combined: "bg-warning/10 text-warning dark:text-warning border-warning/20",
  },
  yellow: {
    bg: "bg-warning/10",
    text: "text-warning dark:text-warning",
    border: "border-warning/20",
    combined: "bg-warning/10 text-warning dark:text-warning border-warning/20",
  },
  lime: {
    bg: "bg-lime-500/10",
    text: "text-lime-600 dark:text-lime-400",
    border: "border-lime-500/20",
    combined: "bg-lime-500/10 text-lime-600 dark:text-lime-400 border-lime-500/20",
  },
  green: {
    bg: "bg-success/10",
    text: "text-success dark:text-success",
    border: "border-success/20",
    combined: "bg-success/10 text-success dark:text-success border-success/20",
  },
  emerald: {
    bg: "bg-success/10",
    text: "text-success dark:text-success",
    border: "border-success/20",
    combined: "bg-success/10 text-success dark:text-success border-success/20",
  },
  teal: {
    bg: "bg-teal-500/10",
    text: "text-teal-600 dark:text-teal-400",
    border: "border-teal-500/20",
    combined: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-500/20",
    combined: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  },
  sky: {
    bg: "bg-sky-500/10",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-sky-500/20",
    combined: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  },
  blue: {
    bg: "bg-primary/10",
    text: "text-primary dark:text-primary",
    border: "border-primary/20",
    combined: "bg-primary/10 text-primary dark:text-primary border-primary/20",
  },
  indigo: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-500/20",
    combined: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  },
  violet: {
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    border: "border-violet-500/20",
    combined: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/20",
    combined: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  fuchsia: {
    bg: "bg-fuchsia-500/10",
    text: "text-fuchsia-600 dark:text-fuchsia-400",
    border: "border-fuchsia-500/20",
    combined: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20",
  },
  pink: {
    bg: "bg-pink-500/10",
    text: "text-pink-600 dark:text-pink-400",
    border: "border-pink-500/20",
    combined: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
  },
  rose: {
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-500/20",
    combined: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
};

/**
 * Get tag color classes by color name
 *
 * @param color - The tag color name
 * @returns Object with bg, text, border, and combined classes
 *
 * @example
 * ```tsx
 * const { bg, text, border } = getTagColorClasses("blue");
 * // Or use combined:
 * const { combined } = getTagColorClasses("blue");
 * ```
 */
export function getTagColorClasses(color: string): TagColorClasses {
  const tagColor = color as TagColor;
  return TAG_COLOR_STYLES[tagColor] || TAG_COLOR_STYLES.gray;
}

/**
 * Get combined classes string for a tag color
 *
 * @param color - The tag color name
 * @returns Combined class string
 *
 * @example
 * ```tsx
 * <span className={getTagColorString("blue")}>Tag</span>
 * ```
 */
export function getTagColorString(color: string): string {
  const tagColor = color as TagColor;
  return (TAG_COLOR_STYLES[tagColor] || TAG_COLOR_STYLES.gray).combined;
}

/**
 * List of all available tag colors for dropdowns/selectors
 */
export const TAG_COLOR_OPTIONS: TagColor[] = [
  "gray",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
];

/**
 * Semantic Color Tokens - Oikion Design System
 *
 * This module provides utilities for working with semantic color tokens.
 * Use these instead of hardcoded Tailwind colors (e.g., text-destructive).
 *
 * @example
 * ```tsx
 * // Instead of hardcoded colors
 * className="text-destructive bg-destructive/10"
 *
 * // Use semantic tokens
 * className="text-destructive bg-destructive/10"
 *
 * // Or use the utility
 * className={getStatusColorClasses("error")}
 * ```
 */

/**
 * Semantic color token names available in the design system
 */
export type SemanticColor =
  | "primary"
  | "secondary"
  | "destructive"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "muted"
  | "accent";

/**
 * Status-based color mapping
 */
export type StatusColor =
  | "error"
  | "success"
  | "warning"
  | "info"
  | "pending"
  | "active"
  | "inactive";

/**
 * Color class set for text, background, and border
 */
export interface ColorClasses {
  text: string;
  bg: string;
  bgSubtle: string;
  border: string;
}

/**
 * Map of semantic colors to their Tailwind class prefixes
 */
export const SEMANTIC_COLOR_MAP: Record<SemanticColor, ColorClasses> = {
  primary: {
    text: "text-primary",
    bg: "bg-primary",
    bgSubtle: "bg-primary/10",
    border: "border-primary",
  },
  secondary: {
    text: "text-secondary-foreground",
    bg: "bg-secondary",
    bgSubtle: "bg-secondary/50",
    border: "border-secondary",
  },
  destructive: {
    text: "text-destructive",
    bg: "bg-destructive",
    bgSubtle: "bg-destructive/10",
    border: "border-destructive",
  },
  success: {
    text: "text-success",
    bg: "bg-success",
    bgSubtle: "bg-success/10",
    border: "border-success",
  },
  warning: {
    text: "text-warning",
    bg: "bg-warning",
    bgSubtle: "bg-warning/10",
    border: "border-warning",
  },
  error: {
    text: "text-error",
    bg: "bg-error",
    bgSubtle: "bg-error/10",
    border: "border-error",
  },
  info: {
    text: "text-info",
    bg: "bg-info",
    bgSubtle: "bg-info/10",
    border: "border-info",
  },
  muted: {
    text: "text-muted-foreground",
    bg: "bg-muted",
    bgSubtle: "bg-muted/50",
    border: "border-muted",
  },
  accent: {
    text: "text-accent-foreground",
    bg: "bg-accent",
    bgSubtle: "bg-accent/50",
    border: "border-accent",
  },
};

/**
 * Map status types to semantic colors
 */
export const STATUS_TO_SEMANTIC: Record<StatusColor, SemanticColor> = {
  error: "destructive",
  success: "success",
  warning: "warning",
  info: "info",
  pending: "warning",
  active: "success",
  inactive: "muted",
};

/**
 * Get color classes for a semantic color
 *
 * @example
 * ```tsx
 * const colors = getSemanticColorClasses("destructive");
 * <span className={`${colors.text} ${colors.bgSubtle}`}>Error</span>
 * ```
 */
export function getSemanticColorClasses(color: SemanticColor): ColorClasses {
  return SEMANTIC_COLOR_MAP[color];
}

/**
 * Get color classes for a status
 *
 * @example
 * ```tsx
 * const colors = getStatusColorClasses("error");
 * <Badge className={`${colors.text} ${colors.bgSubtle} ${colors.border}`}>
 *   Error
 * </Badge>
 * ```
 */
export function getStatusColorClasses(status: StatusColor): ColorClasses {
  const semanticColor = STATUS_TO_SEMANTIC[status];
  return SEMANTIC_COLOR_MAP[semanticColor];
}

/**
 * Mapping from hardcoded Tailwind colors to semantic tokens
 * Use this as a reference for migration
 */
export const HARDCODED_TO_SEMANTIC: Record<string, string> = {
  // Red colors → destructive
  "text-destructive": "text-destructive",
  "bg-destructive/10": "bg-destructive/10",
  "bg-destructive/20": "bg-destructive/20",
  "bg-destructive": "bg-destructive",
  "border-red-200": "border-destructive/30",
  "border-destructive": "border-destructive",
  "text-rose-500": "text-destructive",
  "bg-rose-50": "bg-destructive/10",
  "border-rose-500": "border-destructive",

  // Green colors → success
  "text-success": "text-success",
  "bg-success/10": "bg-success/10",
  "bg-success/20": "bg-success/20",
  "bg-success": "bg-success",
  "border-success/30": "border-success/30",
  "border-success": "border-success",

  // Blue colors → primary or info
  "text-primary": "text-primary",
  "bg-primary/10": "bg-primary/10",
  "bg-primary/20": "bg-primary/20",
  "bg-primary": "bg-primary",
  "border-primary/30": "border-primary/30",
  "border-primary": "border-primary",

  // Yellow/Orange colors → warning
  "text-warning": "text-warning",
  "bg-warning/10": "bg-warning/10",
  "bg-warning/20": "bg-warning/20",
  "bg-warning": "bg-warning",
  "bg-orange-50": "bg-warning/10",
  "border-yellow-200": "border-warning/30",
  "border-warning": "border-warning",
  "border-orange-500": "border-warning",

  // Gray colors → muted
  "text-muted-foreground": "text-muted-foreground",
  "bg-muted": "bg-muted",
  "border-border": "border-border",
};

/**
 * Badge/Chip color variants for consistent styling
 */
export const BADGE_VARIANTS = {
  default: "bg-secondary text-secondary-foreground",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-info/10 text-info border-info/20",
  muted: "bg-muted text-muted-foreground",
} as const;

export type BadgeVariant = keyof typeof BADGE_VARIANTS;

/**
 * Get badge classes for a variant
 *
 * @example
 * ```tsx
 * <Badge className={getBadgeClasses("success")}>Active</Badge>
 * ```
 */
export function getBadgeClasses(variant: BadgeVariant): string {
  return BADGE_VARIANTS[variant];
}

/**
 * Status indicator colors for consistent status displays
 */
export const STATUS_INDICATOR_COLORS = {
  online: "bg-success",
  offline: "bg-muted-foreground",
  busy: "bg-warning",
  away: "bg-warning/70",
  error: "bg-destructive",
} as const;

export type StatusIndicator = keyof typeof STATUS_INDICATOR_COLORS;

/**
 * Get status indicator color class
 *
 * @example
 * ```tsx
 * <span className={`h-2 w-2 rounded-full ${getStatusIndicatorColor("online")}`} />
 * ```
 */
export function getStatusIndicatorColor(status: StatusIndicator): string {
  return STATUS_INDICATOR_COLORS[status];
}

/* ============================================
   PALETTE COLORS - Unified Color System
   16 named colors with 5 variants each
   Theme-aware and accessible across all themes
   ============================================ */

/**
 * Available palette colors in the unified color system
 * Similar to Notion's color picker
 */
export const PALETTE_COLORS = [
  "gray",
  "brown",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "teal",
  "cyan",
  "blue",
  "indigo",
  "violet",
  "fuchsia",
  "pink",
  "rose",
] as const;

/**
 * Type for palette color names
 */
export type PaletteColor = (typeof PALETTE_COLORS)[number];

/**
 * Palette color class variants
 */
export interface PaletteColorClasses {
  /** Text/icon color - accessible on theme background */
  text: string;
  /** Subtle background tint */
  bg: string;
  /** Solid background for badges/chips */
  bgSolid: string;
  /** Text color on solid background */
  bgSolidFg: string;
  /** Border color */
  border: string;
  /** Composed: solid badge (bg + text) */
  badge: string;
  /** Composed: chip style (subtle bg + text + border) */
  chip: string;
  /** Composed: outline style (text + border only) */
  outline: string;
}

/**
 * Get Tailwind classes for a palette color
 *
 * @example
 * ```tsx
 * // Get all classes for green
 * const colors = getPaletteClasses("green");
 *
 * // Use individual classes
 * <span className={colors.text}>Success message</span>
 * <div className={colors.bg}>Subtle background</div>
 *
 * // Use composed patterns
 * <Badge className={colors.badge}>New</Badge>
 * <Tag className={colors.chip}>Category</Tag>
 * <Button variant="outline" className={colors.outline}>Action</Button>
 * ```
 */
export function getPaletteClasses(color: PaletteColor): PaletteColorClasses {
  return {
    text: `text-palette-${color}`,
    bg: `bg-palette-${color}-subtle`,
    bgSolid: `bg-palette-${color}-solid`,
    bgSolidFg: `text-palette-${color}-solid-fg`,
    border: `border-palette-${color}-border`,
    // Composed patterns
    badge: `bg-palette-${color}-solid text-palette-${color}-solid-fg`,
    chip: `bg-palette-${color}-subtle text-palette-${color} border border-palette-${color}-border`,
    outline: `text-palette-${color} border border-palette-${color}-border bg-transparent`,
  };
}

/**
 * Human-readable labels for palette colors (for UI pickers)
 */
export const PALETTE_COLOR_LABELS: Record<PaletteColor, string> = {
  gray: "Gray",
  brown: "Brown",
  red: "Red",
  orange: "Orange",
  amber: "Amber",
  yellow: "Yellow",
  lime: "Lime",
  green: "Green",
  teal: "Teal",
  cyan: "Cyan",
  blue: "Blue",
  indigo: "Indigo",
  violet: "Violet",
  fuchsia: "Fuchsia",
  pink: "Pink",
  rose: "Rose",
};

/**
 * Get the label for a palette color
 *
 * @example
 * ```tsx
 * getPaletteColorLabel("green") // "Green"
 * ```
 */
export function getPaletteColorLabel(color: PaletteColor): string {
  return PALETTE_COLOR_LABELS[color];
}

/**
 * Suggested use cases for each palette color
 * Helps maintain consistency across the app
 */
export const PALETTE_COLOR_USE_CASES: Record<PaletteColor, string[]> = {
  gray: ["Neutral", "Disabled", "Secondary content"],
  brown: ["Archival", "Tags", "Earth tones"],
  red: ["Error", "Destructive", "Critical"],
  orange: ["Warning", "Pending", "Attention"],
  amber: ["Caution", "Highlight", "Gold"],
  yellow: ["Notice", "Bright highlight"],
  lime: ["Fresh", "Growth", "New"],
  green: ["Success", "Active", "Confirmed"],
  teal: ["Info-alt", "Ocean", "Secondary actions"],
  cyan: ["Tech", "Modern", "Links"],
  blue: ["Primary", "Info", "Actions"],
  indigo: ["Deep", "Professional"],
  violet: ["Premium", "Special", "Featured"],
  fuchsia: ["Vibrant", "Creative"],
  pink: ["Soft", "Decorative"],
  rose: ["Warm accent", "Love"],
};

/**
 * Map semantic intents to recommended palette colors
 */
export const INTENT_TO_PALETTE: Record<string, PaletteColor> = {
  // Status intents
  success: "green",
  error: "red",
  warning: "orange",
  info: "blue",
  pending: "amber",

  // Action intents
  primary: "blue",
  secondary: "gray",
  destructive: "red",

  // Feature intents
  new: "lime",
  premium: "violet",
  featured: "indigo",
  archived: "brown",
};

/**
 * Get the recommended palette color for an intent
 *
 * @example
 * ```tsx
 * const color = getIntentPaletteColor("success"); // "green"
 * const classes = getPaletteClasses(color);
 * ```
 */
export function getIntentPaletteColor(
  intent: keyof typeof INTENT_TO_PALETTE
): PaletteColor {
  return INTENT_TO_PALETTE[intent];
}

/**
 * Check if a string is a valid palette color
 */
export function isPaletteColor(color: string): color is PaletteColor {
  return PALETTE_COLORS.includes(color as PaletteColor);
}

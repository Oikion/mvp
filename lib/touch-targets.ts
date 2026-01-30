/**
 * Touch Target Utilities
 *
 * WCAG 2.5.5 requires touch targets to be at least 44x44 CSS pixels.
 * These utilities help ensure consistent touch target sizes across the app.
 *
 * Reference: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
 */

/**
 * Minimum touch target sizes
 *
 * - minimum: 44px (WCAG 2.5.5 minimum)
 * - recommended: 48px (Material Design recommendation)
 * - comfortable: 56px (Extra comfortable for primary actions)
 */
export const TOUCH_TARGET_SIZES = {
  /** 44px - WCAG 2.5.5 minimum requirement */
  minimum: "h-11 w-11",
  /** 48px - Material Design recommended */
  recommended: "h-12 w-12",
  /** 56px - Comfortable for primary actions */
  comfortable: "h-14 w-14",
} as const;

/**
 * Touch target height classes (for non-square buttons)
 */
export const TOUCH_TARGET_HEIGHTS = {
  minimum: "min-h-[44px]",
  recommended: "min-h-12",
  comfortable: "min-h-14",
} as const;

/**
 * Icon button sizes that meet touch target requirements
 *
 * These replace the common h-8 w-8 (32px) icon button pattern
 * which doesn't meet WCAG touch target minimums.
 */
export const ICON_BUTTON_SIZES = {
  /** Small visual but full touch target (icon: 16px, target: 44px) */
  sm: {
    button: "h-11 w-11",
    icon: "h-4 w-4",
  },
  /** Default visual and touch target (icon: 20px, target: 44px) */
  default: {
    button: "h-11 w-11",
    icon: "h-5 w-5",
  },
  /** Large visual and touch target (icon: 24px, target: 48px) */
  lg: {
    button: "h-12 w-12",
    icon: "h-6 w-6",
  },
} as const;

/**
 * Classes for ensuring minimum touch target on inline buttons
 *
 * Use these when you need a visually small button but must maintain
 * touch target accessibility. The `relative` positioning allows
 * the ::after pseudo-element to extend the hit area.
 *
 * @example
 * ```tsx
 * <button className={cn("h-8 w-8", TOUCH_TARGET_EXTEND.base)}>
 *   <X className="h-4 w-4" />
 * </button>
 *
 * // In CSS:
 * .touch-extend::after {
 *   content: '';
 *   position: absolute;
 *   top: 50%;
 *   left: 50%;
 *   transform: translate(-50%, -50%);
 *   min-width: 44px;
 *   min-height: 44px;
 * }
 * ```
 */
export const TOUCH_TARGET_EXTEND = {
  /** Base class for extended touch target */
  base: "relative after:absolute after:inset-0 after:min-h-[44px] after:min-w-[44px] after:-translate-x-1/2 after:-translate-y-1/2 after:left-1/2 after:top-1/2",
  /** For mobile only (uses md: breakpoint) */
  mobileOnly: "relative md:after:hidden after:absolute after:inset-0 after:min-h-[44px] after:min-w-[44px] after:-translate-x-1/2 after:-translate-y-1/2 after:left-1/2 after:top-1/2",
} as const;

/**
 * Spacing between touch targets
 *
 * WCAG recommends at least 8px between touch targets.
 */
export const TOUCH_TARGET_SPACING = {
  /** Minimum spacing between touch targets (8px) */
  minimum: "gap-2",
  /** Recommended spacing (12px) */
  recommended: "gap-3",
  /** Comfortable spacing (16px) */
  comfortable: "gap-4",
} as const;

/**
 * Check if a size value meets minimum touch target requirements
 *
 * @param heightPx - Height in pixels
 * @param widthPx - Width in pixels
 * @returns true if meets 44x44px minimum
 */
export function meetsTouchTargetMinimum(heightPx: number, widthPx: number = heightPx): boolean {
  return heightPx >= 44 && widthPx >= 44;
}

/**
 * Tailwind height classes to pixel values
 */
export const TAILWIND_HEIGHT_TO_PX: Record<string, number> = {
  "h-6": 24,
  "h-7": 28,
  "h-8": 32,
  "h-9": 36,
  "h-10": 40,
  "h-11": 44,
  "h-12": 48,
  "h-14": 56,
  "h-16": 64,
};

/**
 * Get the recommended touch target size class for a given visual size
 *
 * @param visualSize - Desired visual size (e.g., "h-8")
 * @returns Touch target size that meets WCAG requirements
 *
 * @example
 * ```tsx
 * // If you want a visually small button
 * const touchSize = getTouchTargetSize("h-8"); // Returns "h-11 w-11"
 * ```
 */
export function getTouchTargetSize(visualSize: string): string {
  const px = TAILWIND_HEIGHT_TO_PX[visualSize];
  if (!px || px >= 44) {
    // Already meets minimum or unknown size
    return `${visualSize} w-${visualSize.slice(2)}`;
  }
  // Upgrade to minimum touch target
  return TOUCH_TARGET_SIZES.minimum;
}

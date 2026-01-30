/**
 * Theme Utilities - Oikion Design System
 *
 * Centralized theme management and color token utilities.
 *
 * @example
 * ```tsx
 * import { getStatusColorClasses, BADGE_VARIANTS } from '@/lib/theme';
 * ```
 */

export {
  // Types
  type SemanticColor,
  type StatusColor,
  type ColorClasses,
  type BadgeVariant,
  type StatusIndicator,
  // Constants
  SEMANTIC_COLOR_MAP,
  STATUS_TO_SEMANTIC,
  HARDCODED_TO_SEMANTIC,
  BADGE_VARIANTS,
  STATUS_INDICATOR_COLORS,
  // Functions
  getSemanticColorClasses,
  getStatusColorClasses,
  getBadgeClasses,
  getStatusIndicatorColor,
} from "./color-tokens";

/**
 * Design System TypeScript Types - Oikion
 *
 * Strict types for design system components to prevent typos and ensure consistency.
 *
 * @example
 * ```tsx
 * import type { ButtonVariant, SemanticColor, TypographySize } from '@/types/design-system';
 * ```
 */

// ===========================================
// Button Types
// ===========================================

/**
 * Valid button variant names
 */
export type ButtonVariant =
  | "default"
  | "destructive"
  | "success"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

/**
 * Valid button size names
 */
export type ButtonSize = "default" | "sm" | "lg" | "icon";

// ===========================================
// Toast Types
// ===========================================

/**
 * Valid toast variant names
 */
export type ToastVariant =
  | "default"
  | "destructive"
  | "success"
  | "warning"
  | "info";

// ===========================================
// Color Types
// ===========================================

/**
 * Semantic color token names from the design system
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
 * Status-based colors
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
 * Badge/Chip variant names
 */
export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "success"
  | "warning"
  | "outline";

// ===========================================
// Typography Types
// ===========================================

/**
 * Semantic typography sizes from the design system
 *
 * - h1: 3rem (48px) - Main page headings
 * - h2: 2.25rem (36px) - Section headings
 * - h3: 1.875rem (30px) - Subsection headings
 * - h4: 1.5rem (24px) - Card/component headings
 * - body: 1rem (16px) - Body text
 * - caption: 0.875rem (14px) - Small text, labels
 */
export type TypographySize = "h1" | "h2" | "h3" | "h4" | "body" | "caption";

/**
 * Font weight options
 */
export type FontWeight = "normal" | "medium" | "semibold" | "bold";

// ===========================================
// Spacing Types
// ===========================================

/**
 * Standard spacing scale (based on 4px unit)
 */
export type SpacingScale =
  | "0"
  | "0.5"
  | "1"
  | "1.5"
  | "2"
  | "2.5"
  | "3"
  | "4"
  | "5"
  | "6"
  | "8"
  | "10"
  | "12"
  | "16";

// ===========================================
// Elevation Types
// ===========================================

/**
 * Shadow elevation levels
 */
export type Elevation = "0" | "1" | "2" | "3" | "4";

// ===========================================
// Animation Types
// ===========================================

/**
 * Standard animation durations
 */
export type AnimationDuration = "fast" | "default" | "slow";

/**
 * Loading spinner variants
 */
export type LoadingVariant =
  | "spinner"
  | "dots"
  | "pulse"
  | "orbit"
  | "wave"
  | "bars";

/**
 * Loading sizes
 */
export type LoadingSize = "xs" | "sm" | "md" | "lg" | "xl";

// ===========================================
// Form Types
// ===========================================

/**
 * Form validation modes
 */
export type ValidationMode = "onBlur" | "onChange" | "onSubmit" | "onTouched" | "all";

/**
 * Form field state
 */
export type FieldState = "idle" | "valid" | "invalid" | "validating";

/**
 * Input validation state
 */
export type InputValidation = "default" | "error" | "success" | "warning";

// ===========================================
// Theme Types
// ===========================================

/**
 * Available theme names
 */
export type ThemeName = "light" | "dark" | "pearl-sand" | "twilight-lavender" | "system";

// ===========================================
// Utility Types
// ===========================================

/**
 * Make specific properties required
 */
export type RequireProps<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make all properties optional except specified ones
 */
export type OptionalExcept<T, K extends keyof T> = Partial<T> & Required<Pick<T, K>>;

/**
 * Extract component props from a component type
 */
export type ComponentProps<T> = T extends React.ComponentType<infer P> ? P : never;

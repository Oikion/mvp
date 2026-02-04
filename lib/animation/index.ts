/**
 * Animation Tokens - Oikion Design System
 *
 * Standardized animation durations and easing functions for consistent motion
 * across the application. These tokens align with the Tailwind config.
 *
 * Usage guidelines:
 * - Use `instant` for micro-interactions (button active state)
 * - Use `fast` for tooltips, badges, small UI feedback
 * - Use `normal` for most UI transitions (modals, dropdowns)
 * - Use `slow` for page transitions, large elements
 * - Use `slowest` for emphasis animations, onboarding
 */

// Duration tokens (in milliseconds)
export const DURATION = {
  /** 0ms - No animation */
  instant: 0,
  /** 100ms - Micro-interactions, button press */
  fast: 100,
  /** 200ms - Standard UI transitions */
  normal: 200,
  /** 300ms - Modals, page transitions */
  slow: 300,
  /** 500ms - Emphasis, onboarding */
  slowest: 500,
} as const;

// CSS variable names for use in Tailwind classes
export const DURATION_CSS = {
  instant: "var(--duration-instant, 0ms)",
  fast: "var(--duration-fast, 100ms)",
  normal: "var(--duration-normal, 200ms)",
  slow: "var(--duration-slow, 300ms)",
  slowest: "var(--duration-slowest, 500ms)",
} as const;

// Easing tokens
export const EASING = {
  /** Default ease-out for entering elements */
  default: "ease-out",
  /** ease-in-out for continuous animations */
  inOut: "ease-in-out",
  /** ease-in for exiting elements */
  exit: "ease-in",
  /** Custom spring-like easing */
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  /** Smooth deceleration */
  decelerate: "cubic-bezier(0.0, 0.0, 0.2, 1)",
  /** Quick acceleration */
  accelerate: "cubic-bezier(0.4, 0.0, 1, 1)",
} as const;

// CSS variable names for easing
export const EASING_CSS = {
  default: "var(--easing-default, ease-out)",
  inOut: "var(--easing-in-out, ease-in-out)",
  exit: "var(--easing-exit, ease-in)",
  spring: "var(--easing-spring, cubic-bezier(0.34, 1.56, 0.64, 1))",
} as const;

/**
 * Get transition string for CSS
 *
 * @example
 * ```ts
 * getTransition("opacity", "normal")
 * // => "opacity 200ms ease-out"
 *
 * getTransition(["opacity", "transform"], "slow", "spring")
 * // => "opacity 300ms cubic-bezier(0.34, 1.56, 0.64, 1), transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)"
 * ```
 */
export function getTransition(
  properties: string | string[],
  duration: keyof typeof DURATION = "normal",
  easing: keyof typeof EASING = "default"
): string {
  const props = Array.isArray(properties) ? properties : [properties];
  const durationMs = DURATION[duration];
  const easingValue = EASING[easing];

  return props.map((prop) => `${prop} ${durationMs}ms ${easingValue}`).join(", ");
}

/**
 * Get Tailwind duration class
 *
 * @example
 * ```ts
 * getDurationClass("normal") // => "duration-200"
 * getDurationClass("slow") // => "duration-300"
 * ```
 */
export function getDurationClass(duration: keyof typeof DURATION): string {
  const map: Record<keyof typeof DURATION, string> = {
    instant: "duration-0",
    fast: "duration-100",
    normal: "duration-200",
    slow: "duration-300",
    slowest: "duration-500",
  };
  return map[duration];
}

/**
 * Presets for common animation patterns
 */
export const ANIMATION_PRESETS = {
  /** Fade in/out */
  fade: {
    enter: { opacity: 0 },
    enterActive: { opacity: 1, transition: getTransition("opacity", "normal") },
    exit: { opacity: 1 },
    exitActive: { opacity: 0, transition: getTransition("opacity", "normal", "exit") },
  },
  /** Slide up and fade */
  slideUp: {
    enter: { opacity: 0, transform: "translateY(8px)" },
    enterActive: {
      opacity: 1,
      transform: "translateY(0)",
      transition: getTransition(["opacity", "transform"], "normal"),
    },
    exit: { opacity: 1, transform: "translateY(0)" },
    exitActive: {
      opacity: 0,
      transform: "translateY(8px)",
      transition: getTransition(["opacity", "transform"], "normal", "exit"),
    },
  },
  /** Scale in/out */
  scale: {
    enter: { opacity: 0, transform: "scale(0.95)" },
    enterActive: {
      opacity: 1,
      transform: "scale(1)",
      transition: getTransition(["opacity", "transform"], "normal", "spring"),
    },
    exit: { opacity: 1, transform: "scale(1)" },
    exitActive: {
      opacity: 0,
      transform: "scale(0.95)",
      transition: getTransition(["opacity", "transform"], "fast", "exit"),
    },
  },
} as const;

/**
 * Reduced motion utilities
 *
 * Respects user's prefers-reduced-motion setting
 */
export function prefersReducedMotion(): boolean {
  if (typeof globalThis === "undefined" || !globalThis.matchMedia) {
    return false;
  }
  return globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Get duration with reduced motion support
 * Returns 0 if user prefers reduced motion
 */
export function getAccessibleDuration(duration: keyof typeof DURATION): number {
  if (prefersReducedMotion()) {
    return 0;
  }
  return DURATION[duration];
}

/**
 * Tailwind class helpers for common transition patterns
 */
export const TRANSITION_CLASSES = {
  /** Standard transition for most UI elements */
  default: "transition-all duration-200 ease-out",
  /** Fast transition for micro-interactions */
  fast: "transition-all duration-100 ease-out",
  /** Slow transition for page-level changes */
  slow: "transition-all duration-300 ease-out",
  /** Color-only transition */
  colors: "transition-colors duration-200 ease-out",
  /** Opacity-only transition */
  opacity: "transition-opacity duration-200 ease-out",
  /** Transform-only transition */
  transform: "transition-transform duration-200 ease-out",
  /** No transition (for reduced motion) */
  none: "transition-none",
} as const;

export default {
  DURATION,
  DURATION_CSS,
  EASING,
  EASING_CSS,
  ANIMATION_PRESETS,
  TRANSITION_CLASSES,
  getTransition,
  getDurationClass,
  prefersReducedMotion,
  getAccessibleDuration,
};

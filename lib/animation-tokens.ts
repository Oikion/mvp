/**
 * Animation Token System
 *
 * Centralized animation values for consistent motion design across the application.
 * Use these tokens instead of hardcoded values in components.
 *
 * @example
 * ```tsx
 * import { duration, easing, presets } from "@/lib/animation-tokens";
 *
 * // With framer-motion
 * <motion.div
 *   initial={presets.fadeIn.initial}
 *   animate={presets.fadeIn.animate}
 *   transition={{ duration: duration.normal / 1000, ease: easing.default }}
 * />
 *
 * // With Tailwind (uses CSS variables)
 * <div className="animate-fade-in" />
 * ```
 */

// =============================================================================
// Duration Tokens (in milliseconds)
// =============================================================================

/**
 * Duration scale for animations and transitions.
 * Values are in milliseconds for JavaScript usage.
 * CSS variables use these same values with 'ms' suffix.
 */
export const duration = {
  /** No animation - instant changes */
  instant: 0,
  /** Quick micro-interactions (hover states, button feedback) */
  fast: 150,
  /** Standard transitions (most UI elements) */
  normal: 200,
  /** Emphasis animations (modals, important state changes) */
  slow: 300,
  /** Page transitions, complex reveals */
  slower: 400,
  /** Complex multi-step animations */
  slowest: 500,
  /** Extended animations (loading states, continuous effects) */
  extended: 1000,
} as const;

export type DurationKey = keyof typeof duration;

// =============================================================================
// Easing Tokens
// =============================================================================

/**
 * Easing functions for animations.
 * Cubic bezier arrays for framer-motion, CSS equivalents provided.
 */
export const easing = {
  /** Standard ease-out - decelerating motion (most common) */
  default: [0.4, 0, 0.2, 1] as const,
  /** Ease-in - accelerating motion (elements leaving) */
  in: [0.4, 0, 1, 1] as const,
  /** Ease-out - decelerating motion (elements entering) */
  out: [0, 0, 0.2, 1] as const,
  /** Ease-in-out - smooth both ways (hover states) */
  inOut: [0.4, 0, 0.2, 1] as const,
  /** Linear - constant speed (progress bars, loaders) */
  linear: [0, 0, 1, 1] as const,
  /** Bounce effect for playful interactions */
  bounce: [0.68, -0.55, 0.265, 1.55] as const,
} as const;

/**
 * Spring configuration for framer-motion.
 * Use for more natural, physics-based animations.
 */
export const spring = {
  /** Default spring - balanced responsiveness */
  default: { type: "spring" as const, stiffness: 300, damping: 30 },
  /** Gentle spring - slower, softer motion */
  gentle: { type: "spring" as const, stiffness: 200, damping: 25 },
  /** Bouncy spring - playful, energetic */
  bouncy: { type: "spring" as const, stiffness: 400, damping: 20 },
  /** Stiff spring - quick, snappy */
  stiff: { type: "spring" as const, stiffness: 500, damping: 35 },
} as const;

export type EasingKey = keyof typeof easing;
export type SpringKey = keyof typeof spring;

// =============================================================================
// Distance Tokens (in pixels)
// =============================================================================

/**
 * Distance scale for translate animations.
 * Use these for consistent slide distances.
 */
export const distance = {
  /** Subtle movement (micro-interactions) */
  xs: 2,
  /** Small movement (hover states) */
  sm: 4,
  /** Medium movement (standard slides) */
  md: 10,
  /** Large movement (page transitions) */
  lg: 20,
  /** Extra large movement (dramatic entrances) */
  xl: 40,
} as const;

export type DistanceKey = keyof typeof distance;

// =============================================================================
// Scale Tokens
// =============================================================================

/**
 * Scale values for zoom/grow animations.
 */
export const scale = {
  /** Pressed/active state */
  pressed: 0.98,
  /** Subtle shrink */
  shrink: 0.95,
  /** No scale */
  normal: 1,
  /** Subtle grow */
  grow: 1.02,
  /** Hover lift effect */
  hover: 1.05,
} as const;

export type ScaleKey = keyof typeof scale;

// =============================================================================
// Stagger Tokens
// =============================================================================

/**
 * Stagger delays for sequential animations.
 * Values are in seconds for framer-motion.
 */
export const stagger = {
  /** Very fast stagger */
  fast: 0.05,
  /** Default stagger */
  default: 0.1,
  /** Slower, more dramatic stagger */
  slow: 0.15,
} as const;

export type StaggerKey = keyof typeof stagger;

// =============================================================================
// Animation Presets (Framer Motion)
// =============================================================================

/**
 * Pre-built animation presets for common patterns.
 * Use with framer-motion's initial/animate props.
 *
 * @example
 * ```tsx
 * <motion.div {...presets.fadeIn} />
 * // or with custom transition
 * <motion.div
 *   initial={presets.slideUp.initial}
 *   animate={presets.slideUp.animate}
 *   transition={{ duration: duration.slow / 1000 }}
 * />
 * ```
 */
export const presets = {
  // Fade animations
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  fadeOut: {
    initial: { opacity: 1 },
    animate: { opacity: 0 },
    exit: { opacity: 0 },
  },

  // Slide animations
  slideUp: {
    initial: { opacity: 0, y: distance.md },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -distance.md },
  },
  slideDown: {
    initial: { opacity: 0, y: -distance.md },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: distance.md },
  },
  slideLeft: {
    initial: { opacity: 0, x: distance.md },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -distance.md },
  },
  slideRight: {
    initial: { opacity: 0, x: -distance.md },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: distance.md },
  },

  // Scale animations
  scaleIn: {
    initial: { opacity: 0, scale: scale.shrink },
    animate: { opacity: 1, scale: scale.normal },
    exit: { opacity: 0, scale: scale.shrink },
  },
  scaleOut: {
    initial: { opacity: 1, scale: scale.normal },
    animate: { opacity: 0, scale: scale.shrink },
    exit: { opacity: 0, scale: scale.shrink },
  },

  // Combined animations
  popIn: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
  },
  slideUpFade: {
    initial: { opacity: 0, y: distance.lg },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -distance.sm },
  },
} as const;

export type PresetKey = keyof typeof presets;

// =============================================================================
// Transition Presets
// =============================================================================

/**
 * Pre-built transition configurations.
 * Combine with presets for complete animations.
 *
 * @example
 * ```tsx
 * <motion.div
 *   {...presets.fadeIn}
 *   transition={transitions.default}
 * />
 * ```
 */
export const transitions = {
  /** Default transition - normal duration, ease-out */
  default: {
    duration: duration.normal / 1000,
    ease: easing.default,
  },
  /** Fast transition for micro-interactions */
  fast: {
    duration: duration.fast / 1000,
    ease: easing.default,
  },
  /** Slow transition for emphasis */
  slow: {
    duration: duration.slow / 1000,
    ease: easing.default,
  },
  /** Page transition */
  page: {
    duration: duration.slower / 1000,
    ease: easing.inOut,
  },
  /** Spring-based transition */
  spring: spring.default,
  /** Bouncy spring transition */
  bouncy: spring.bouncy,
} as const;

export type TransitionKey = keyof typeof transitions;

// =============================================================================
// CSS Variables Export
// =============================================================================

/**
 * CSS custom properties for use in stylesheets and Tailwind.
 * These should be added to :root in globals.css.
 */
export const cssVariables = {
  // Durations
  "--duration-instant": `${duration.instant}ms`,
  "--duration-fast": `${duration.fast}ms`,
  "--duration-normal": `${duration.normal}ms`,
  "--duration-slow": `${duration.slow}ms`,
  "--duration-slower": `${duration.slower}ms`,
  "--duration-slowest": `${duration.slowest}ms`,
  "--duration-extended": `${duration.extended}ms`,

  // Easings (cubic-bezier format)
  "--easing-default": `cubic-bezier(${easing.default.join(", ")})`,
  "--easing-in": `cubic-bezier(${easing.in.join(", ")})`,
  "--easing-out": `cubic-bezier(${easing.out.join(", ")})`,
  "--easing-in-out": `cubic-bezier(${easing.inOut.join(", ")})`,
  "--easing-linear": `cubic-bezier(${easing.linear.join(", ")})`,
  "--easing-bounce": `cubic-bezier(${easing.bounce.join(", ")})`,

  // Distances
  "--distance-xs": `${distance.xs}px`,
  "--distance-sm": `${distance.sm}px`,
  "--distance-md": `${distance.md}px`,
  "--distance-lg": `${distance.lg}px`,
  "--distance-xl": `${distance.xl}px`,
} as const;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert milliseconds to seconds (for framer-motion).
 */
export function msToSeconds(ms: number): number {
  return ms / 1000;
}

/**
 * Get duration in seconds for framer-motion.
 */
export function getDuration(key: DurationKey): number {
  return msToSeconds(duration[key]);
}

/**
 * Create a staggered children animation config.
 *
 * @example
 * ```tsx
 * <motion.div
 *   variants={createStaggerConfig()}
 *   initial="hidden"
 *   animate="visible"
 * >
 *   {items.map(item => (
 *     <motion.div key={item.id} variants={staggerChildVariants} />
 *   ))}
 * </motion.div>
 * ```
 */
export function createStaggerConfig(
  staggerDelay: number = stagger.default,
  initialDelay: number = 0
) {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: initialDelay,
        staggerChildren: staggerDelay,
      },
    },
  };
}

/**
 * Child variants for staggered animations.
 */
export const staggerChildVariants = {
  hidden: { opacity: 0, y: distance.md },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: getDuration("normal"),
      ease: easing.default,
    },
  },
};

/**
 * Create a reduced motion safe animation.
 * Returns empty objects when reduced motion is preferred.
 */
export function createReducedMotionSafe<T extends object>(
  animation: T,
  prefersReducedMotion: boolean
): T | Record<string, never> {
  return prefersReducedMotion ? {} : animation;
}

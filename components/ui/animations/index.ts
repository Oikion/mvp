/**
 * Oikion Animation System
 * 
 * A comprehensive collection of animated components for creating
 * beautiful, smooth user interfaces with delightful microinteractions.
 * 
 * Built with Motion (Framer Motion) and respects user preferences
 * for reduced motion accessibility.
 */

// Animated Spinners - Multiple loading indicator variants
export { AnimatedSpinner } from "../animated-spinner";
export type { AnimatedSpinnerProps } from "../animated-spinner";

// Shimmer Skeletons - Beautiful loading placeholders
export {
  ShimmerSkeleton,
  ShimmerCard,
  ShimmerTableRow,
  ShimmerTable,
  ShimmerForm,
  ShimmerPageHeader,
} from "../shimmer-skeleton";

// Animated Containers - Page transitions and stagger animations
export {
  StaggerContainer,
  StaggerItem,
  PageTransition,
  FadeIn,
  ScaleIn,
  AnimatedPresenceWrapper,
  HoverCard,
  PulseIndicator,
  FloatingContainer,
} from "../animated-container";

// Animated Cards - Cards with hover effects
export {
  AnimatedCard,
  AnimatedCardHeader,
  AnimatedCardTitle,
  AnimatedCardDescription,
  AnimatedCardContent,
  AnimatedCardFooter,
  AnimatedStatCard,
} from "../animated-card";

// Animated Icons - Navigation icons with hover animations
export { HouseIcon } from "../HouseIcon";
export { DashboardIcon } from "../DashboardIcon";
export { CalendarIcon } from "../CalendarIcon";
export { FileTextIcon } from "../FileTextIcon";
export { UsersRoundIcon } from "../UsersRoundIcon";
export { SettingsIcon } from "../SettingsIcon";
export { SparklesIcon } from "../SparklesIcon";
export { ChartBarIcon } from "../ChartBarIcon";
export { ContactRoundIcon } from "../ContactRoundIcon";
export { FeedbackIcon } from "../FeedbackIcon";

/**
 * CSS Utility Classes for Microinteractions
 * 
 * Available in globals.css:
 * 
 * .hover-lift        - Subtle lift on hover with shadow
 * .hover-scale       - Scale up on hover with spring effect
 * .hover-glow        - Glow effect on hover
 * .press-effect      - Scale down on click
 * .shine-effect      - Shine sweep on hover
 * .border-glow       - Border highlight on hover
 * .focus-ring-animated - Animated focus ring
 * .text-gradient-animated - Animated gradient text
 * .stagger-children  - Auto-stagger children animations
 * .badge-pulse       - Pulsing notification badge
 * .shimmer           - Shimmer loading effect
 * .icon-spin-hover   - Spin icon on hover
 * .underline-animated - Animated underline on hover
 * 
 * Tailwind Animation Classes:
 * 
 * animate-fade-in
 * animate-fade-out
 * animate-slide-up
 * animate-slide-down
 * animate-slide-up-fade
 * animate-slide-right-fade
 * animate-scale-in
 * animate-spin-slow
 * animate-bounce-subtle
 * animate-wiggle
 * animate-pulse-subtle
 * animate-shimmer
 * animate-float
 * animate-glow
 */








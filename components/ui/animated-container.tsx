"use client";

import { cn } from "@/lib/utils";
import { motion, type Variants, AnimatePresence, useReducedMotion } from "motion/react";
import { forwardRef, type ReactNode } from "react";

// Stagger container for orchestrating child animations
interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  staggerDelay?: number;
}

export function StaggerContainer({
  children,
  className,
  delay = 0,
  staggerDelay = 0.1,
}: StaggerContainerProps) {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: delay,
        staggerChildren: shouldReduceMotion ? 0 : staggerDelay,
      },
    },
  };

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

// Stagger item for use within StaggerContainer
interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  variant?: "fade" | "slideUp" | "slideRight" | "scale" | "slideDown";
}

export function StaggerItem({
  children,
  className,
  variant = "slideUp",
}: StaggerItemProps) {
  const shouldReduceMotion = useReducedMotion();

  const itemVariants: Record<string, Variants> = {
    fade: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.4 } },
    },
    slideUp: {
      hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
    },
    slideDown: {
      hidden: { opacity: 0, y: shouldReduceMotion ? 0 : -20 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
    },
    slideRight: {
      hidden: { opacity: 0, x: shouldReduceMotion ? 0 : -20 },
      visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
    },
    scale: {
      hidden: { opacity: 0, scale: shouldReduceMotion ? 1 : 0.9 },
      visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
    },
  };

  return (
    <motion.div className={className} variants={itemVariants[variant]}>
      {children}
    </motion.div>
  );
}

// Page transition wrapper
interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// Fade in component for simple reveal
interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
}

export const FadeIn = forwardRef<HTMLDivElement, FadeInProps>(
  ({ children, className, delay = 0, duration = 0.4, direction = "up" }, ref) => {
    const shouldReduceMotion = useReducedMotion();

    const directionOffset = {
      up: { y: shouldReduceMotion ? 0 : 20 },
      down: { y: shouldReduceMotion ? 0 : -20 },
      left: { x: shouldReduceMotion ? 0 : 20 },
      right: { x: shouldReduceMotion ? 0 : -20 },
      none: {},
    };

    return (
      <motion.div
        ref={ref}
        className={className}
        initial={{ opacity: 0, ...directionOffset[direction] }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration, delay, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    );
  }
);

FadeIn.displayName = "FadeIn";

// Scale in component for popover/modal-like reveals
interface ScaleInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function ScaleIn({ children, className, delay = 0 }: ScaleInProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// Animated presence wrapper for mount/unmount animations
interface AnimatedPresenceWrapperProps {
  children: ReactNode;
  isVisible: boolean;
  className?: string;
  mode?: "sync" | "wait" | "popLayout";
}

export function AnimatedPresenceWrapper({
  children,
  isVisible,
  className,
  mode = "wait",
}: AnimatedPresenceWrapperProps) {
  return (
    <AnimatePresence mode={mode}>
      {isVisible && (
        <motion.div
          className={className}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hover lift card component
interface HoverCardProps {
  children: ReactNode;
  className?: string;
  hoverScale?: number;
  hoverY?: number;
}

export function HoverCard({
  children,
  className,
  hoverScale = 1.02,
  hoverY = -4,
}: HoverCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn("cursor-pointer", className)}
      whileHover={
        shouldReduceMotion
          ? {}
          : {
              scale: hoverScale,
              y: hoverY,
              transition: { duration: 0.2, ease: "easeOut" },
            }
      }
      whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
    >
      {children}
    </motion.div>
  );
}

// Pulsing notification indicator
interface PulseIndicatorProps {
  className?: string;
  color?: string;
  size?: number;
}

export function PulseIndicator({
  className,
  color = "bg-primary",
  size = 8,
}: PulseIndicatorProps) {
  return (
    <span className={cn("relative inline-flex", className)}>
      <motion.span
        className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", color)}
        animate={{ scale: [1, 1.5, 1.5], opacity: [0.75, 0, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{ width: size, height: size }}
      />
      <span
        className={cn("relative inline-flex rounded-full", color)}
        style={{ width: size, height: size }}
      />
    </span>
  );
}

// Floating action container with gentle bob animation
interface FloatingContainerProps {
  children: ReactNode;
  className?: string;
}

export function FloatingContainer({ children, className }: FloatingContainerProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      animate={
        shouldReduceMotion
          ? {}
          : {
              y: [0, -5, 0],
            }
      }
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
}








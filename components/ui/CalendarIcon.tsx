"use client";

import { cn } from "@/lib/utils";
import type { HTMLMotionProps, Variants } from "motion/react";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

export interface CalendarIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface CalendarIconProps extends HTMLMotionProps<"div"> {
  size?: number;
  duration?: number;
}

const CalendarIcon = forwardRef<CalendarIconHandle, CalendarIconProps>(
  (
    {
      onMouseEnter,
      onMouseLeave,
      className,
      size = 28,
      duration = 1,
      ...props
    },
    ref,
  ) => {
    const controls = useAnimation();
    const reduced = useReducedMotion();
    const isControlled = useRef(false);

    useImperativeHandle(ref, () => {
      isControlled.current = true;
      return {
        startAnimation: () =>
          reduced ? controls.start("normal") : controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleEnter = useCallback(
      (e?: React.MouseEvent<HTMLDivElement>) => {
        if (reduced) return;
        if (isControlled.current) {
          onMouseEnter?.(e as any);
        } else {
          controls.start("animate");
        }
      },
      [controls, reduced, onMouseEnter],
    );

    const handleLeave = useCallback(
      (e?: React.MouseEvent<HTMLDivElement>) => {
        if (isControlled.current) {
          onMouseLeave?.(e as any);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave],
    );

    // Page flip animation
    const pageFlipVariants: Variants = {
      normal: { rotateX: 0, originY: 0 },
      animate: {
        rotateX: [0, -15, 0],
        transition: {
          duration: 0.4 * duration,
          ease: "easeOut" as const,
        },
      },
    };

    // Calendar shake/wiggle
    const containerVariants: Variants = {
      normal: { rotate: 0 },
      animate: {
        rotate: [0, -3, 3, -2, 2, 0],
        transition: {
          duration: 0.5 * duration,
          ease: "easeInOut" as const,
        },
      },
    };

    // Day dots animation
    const dotVariants: Variants = {
      normal: { scale: 1, opacity: 1 },
      animate: (i: number) => ({
        scale: [1, 1.3, 1],
        opacity: [1, 0.6, 1],
        transition: {
          duration: 0.3 * duration,
          delay: i * 0.05,
          ease: "easeInOut" as const,
        },
      }),
    };

    return (
      <motion.div
        className={cn("inline-flex items-center justify-center", className)}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        {...props}
      >
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-calendar"
          variants={containerVariants}
          initial="normal"
          animate={controls}
        >
          {/* Calendar body */}
          <motion.rect
            width="18"
            height="18"
            x="3"
            y="4"
            rx="2"
            ry="2"
            variants={pageFlipVariants}
            initial="normal"
            animate={controls}
          />
          {/* Top hanging tabs */}
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          {/* Horizontal line */}
          <line x1="3" x2="21" y1="10" y2="10" />
          
          {/* Day dots - animated */}
          <motion.circle
            cx="8"
            cy="14"
            r="1"
            fill="currentColor"
            stroke="none"
            variants={dotVariants}
            initial="normal"
            animate={controls}
            custom={0}
          />
          <motion.circle
            cx="12"
            cy="14"
            r="1"
            fill="currentColor"
            stroke="none"
            variants={dotVariants}
            initial="normal"
            animate={controls}
            custom={1}
          />
          <motion.circle
            cx="16"
            cy="14"
            r="1"
            fill="currentColor"
            stroke="none"
            variants={dotVariants}
            initial="normal"
            animate={controls}
            custom={2}
          />
          <motion.circle
            cx="8"
            cy="18"
            r="1"
            fill="currentColor"
            stroke="none"
            variants={dotVariants}
            initial="normal"
            animate={controls}
            custom={3}
          />
          <motion.circle
            cx="12"
            cy="18"
            r="1"
            fill="currentColor"
            stroke="none"
            variants={dotVariants}
            initial="normal"
            animate={controls}
            custom={4}
          />
        </motion.svg>
      </motion.div>
    );
  },
);

CalendarIcon.displayName = "CalendarIcon";
export { CalendarIcon };





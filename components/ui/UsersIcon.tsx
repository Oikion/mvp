"use client";

import { cn } from "@/lib/utils";
import type { HTMLMotionProps, Variants } from "motion/react";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

export interface UsersIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface UsersIconProps extends HTMLMotionProps<"div"> {
  size?: number;
  duration?: number;
}

const UsersIcon = forwardRef<UsersIconHandle, UsersIconProps>(
  (
    {
      onMouseEnter,
      onMouseLeave,
      className,
      size = 28,
      duration = 0.6,
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
        startAnimation: () => {
          if (!reduced) controls.start("animate");
        },
        stopAnimation: () => {
          controls.start("normal");
        },
      };
    });

    const handleEnter = useCallback(
      (e?: React.MouseEvent<HTMLDivElement>) => {
        if (reduced) return;
        if (!isControlled.current) {
          controls.start("animate");
        } else onMouseEnter?.(e as any);
      },
      [controls, reduced, onMouseEnter],
    );

    const handleLeave = useCallback(
      (e?: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlled.current) {
          controls.start("normal");
        } else onMouseLeave?.(e as any);
      },
      [controls, onMouseLeave],
    );

    const pathVariants: Variants = {
      normal: { scale: 1, opacity: 1 },
      animate: {
        scale: [1, 1.1, 1],
        opacity: [1, 0.8, 1],
        transition: { duration, ease: "easeInOut" },
      },
    };

    return (
      <motion.div
        className={cn("inline-flex items-center justify-center", className)}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        {...props}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Users icon (group of people) */}
          <motion.path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" variants={pathVariants} animate={controls} />
          <motion.circle cx="9" cy="7" r="4" variants={pathVariants} animate={controls} />
          <motion.path d="M22 21v-2a4 4 0 0 0-3-3.87" variants={pathVariants} animate={controls} />
          <motion.path d="M16 3.13a4 4 0 0 1 0 7.75" variants={pathVariants} animate={controls} />
        </svg>
      </motion.div>
    );
  },
);

UsersIcon.displayName = "UsersIcon";
export { UsersIcon };









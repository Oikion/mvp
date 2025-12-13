"use client";

import { cn } from "@/lib/utils";
import type { HTMLMotionProps, Variants } from "motion/react";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

export interface ShieldIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ShieldIconProps extends HTMLMotionProps<"div"> {
  size?: number;
  duration?: number;
}

const ShieldIcon = forwardRef<ShieldIconHandle, ShieldIconProps>(
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
        if (!isControlled.current) controls.start("animate");
        else onMouseEnter?.(e as React.MouseEvent<HTMLDivElement>);
      },
      [controls, reduced, onMouseEnter],
    );

    const handleLeave = useCallback(
      (e?: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlled.current) controls.start("normal");
        else onMouseLeave?.(e as React.MouseEvent<HTMLDivElement>);
      },
      [controls, onMouseLeave],
    );

    const shieldVariants: Variants = {
      normal: { scale: 1, y: 0 },
      animate: {
        scale: [1, 1.1, 1],
        y: [0, -2, 0],
        transition: { duration: 0.5 * duration, ease: "easeInOut" },
      },
    };

    const checkVariants: Variants = {
      normal: { pathLength: 0, opacity: 0 },
      animate: {
        pathLength: 1,
        opacity: 1,
        transition: {
          duration: 0.4 * duration,
          ease: "easeOut",
          delay: 0.2,
        },
      },
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
          variants={shieldVariants}
          initial="normal"
          animate={controls}
        >
          {/* Shield outline */}
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          {/* Check mark inside shield */}
          <motion.path
            d="m9 12 2 2 4-4"
            variants={checkVariants}
            initial="normal"
            animate={controls}
            pathLength={1}
          />
        </motion.svg>
      </motion.div>
    );
  },
);

ShieldIcon.displayName = "ShieldIcon";
export { ShieldIcon };

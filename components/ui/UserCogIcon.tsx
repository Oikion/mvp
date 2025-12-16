"use client";

import { cn } from "@/lib/utils";
import type { HTMLMotionProps, Variants } from "motion/react";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

export interface UserCogIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface UserCogIconProps extends HTMLMotionProps<"div"> {
  size?: number;
  duration?: number;
}

const UserCogIcon = forwardRef<UserCogIconHandle, UserCogIconProps>(
  (
    {
      onMouseEnter,
      onMouseLeave,
      className,
      size = 28,
      duration = 0.8,
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

    const cogVariants: Variants = {
      normal: { rotate: 0 },
      animate: {
        rotate: 180,
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
          <circle cx="8" cy="6" r="4" />
          <path d="M2 18c0-3 3-5 6-5s6 2 6 5" />
          <motion.g variants={cogVariants} animate={controls} style={{ transformOrigin: "19px 16px" }}>
            <circle cx="19" cy="16" r="3" />
            <path d="M19 13v-1" />
            <path d="M19 20v1" />
            <path d="m22 16 .9-.2" />
            <path d="M15.2 16.2 16 16" />
            <path d="m21.2 13.8.6-.6" />
            <path d="m16.2 18.8-.6.6" />
            <path d="m21.2 18.2.6.6" />
            <path d="m16.2 13.2-.6-.6" />
          </motion.g>
        </svg>
      </motion.div>
    );
  },
);

UserCogIcon.displayName = "UserCogIcon";
export { UserCogIcon };










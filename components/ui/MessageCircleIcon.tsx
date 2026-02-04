"use client";

import { cn } from "@/lib/utils";
import type { HTMLMotionProps, Variants } from "motion/react";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

export interface MessageCircleHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface MessageCircleProps extends HTMLMotionProps<"div"> {
  size?: number;
  duration?: number;
}

const MessageCircleIcon = forwardRef<MessageCircleHandle, MessageCircleProps>(
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

    const bubbleVariants: Variants = {
      normal: { scale: 1, y: 0 },
      animate: {
        scale: [1, 1.1, 1],
        y: [0, -2, 0],
        transition: {
          duration: 0.4 * duration,
          ease: "easeInOut" as const,
        },
      },
    };

    const dotsVariants: Variants = {
      normal: { opacity: 1 },
      animate: (i: number) => ({
        opacity: [1, 0.3, 1],
        transition: {
          duration: 0.3 * duration,
          ease: "easeInOut" as const,
          delay: i * 0.15,
          repeat: 2,
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
          className="lucide lucide-message-circle"
          variants={bubbleVariants}
          initial="normal"
          animate={controls}
        >
          {/* Chat bubble */}
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
          {/* Animated dots for typing indicator effect */}
          <motion.circle
            cx="9"
            cy="12"
            r="1"
            fill="currentColor"
            stroke="none"
            variants={dotsVariants}
            initial="normal"
            animate={controls}
            custom={0}
          />
          <motion.circle
            cx="12"
            cy="12"
            r="1"
            fill="currentColor"
            stroke="none"
            variants={dotsVariants}
            initial="normal"
            animate={controls}
            custom={1}
          />
          <motion.circle
            cx="15"
            cy="12"
            r="1"
            fill="currentColor"
            stroke="none"
            variants={dotsVariants}
            initial="normal"
            animate={controls}
            custom={2}
          />
        </motion.svg>
      </motion.div>
    );
  },
);

MessageCircleIcon.displayName = "MessageCircleIcon";
export { MessageCircleIcon };

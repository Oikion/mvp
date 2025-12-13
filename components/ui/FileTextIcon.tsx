"use client";

import { cn } from "@/lib/utils";
import type { HTMLMotionProps, Variants } from "motion/react";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

export interface FileTextIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface FileTextIconProps extends HTMLMotionProps<"div"> {
  size?: number;
  duration?: number;
}

const FileTextIcon = forwardRef<FileTextIconHandle, FileTextIconProps>(
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

    // Paper unfold effect
    const paperVariants: Variants = {
      normal: { scaleY: 1, originY: 0, opacity: 1 },
      animate: {
        scaleY: [1, 1.02, 1],
        transition: {
          duration: 0.4 * duration,
          ease: "easeOut" as const,
        },
      },
    };

    // Text lines typing animation
    const lineVariants: Variants = {
      normal: { pathLength: 1, opacity: 1 },
      animate: (i: number) => ({
        pathLength: [0, 1],
        opacity: [0.3, 1],
        transition: {
          duration: 0.4 * duration,
          delay: i * 0.1,
          ease: "easeOut" as const,
        },
      }),
    };

    // Corner fold animation
    const foldVariants: Variants = {
      normal: { opacity: 1 },
      animate: {
        opacity: [1, 0.6, 1],
        transition: {
          duration: 0.3 * duration,
          ease: "easeInOut" as const,
        },
      },
    };

    // Container wiggle
    const containerVariants: Variants = {
      normal: { rotate: 0, y: 0 },
      animate: {
        rotate: [0, -2, 2, 0],
        y: [0, -2, 0],
        transition: {
          duration: 0.5 * duration,
          ease: "easeInOut" as const,
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
          className="lucide lucide-file-text"
          variants={containerVariants}
          initial="normal"
          animate={controls}
        >
          {/* Main paper body */}
          <motion.path
            d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"
            variants={paperVariants}
            initial="normal"
            animate={controls}
          />
          
          {/* Corner fold */}
          <motion.path
            d="M14 2v4a2 2 0 0 0 2 2h4"
            variants={foldVariants}
            initial="normal"
            animate={controls}
          />
          
          {/* Text lines - animated like typing */}
          <motion.line
            x1="8"
            x2="16"
            y1="13"
            y2="13"
            variants={lineVariants}
            initial="normal"
            animate={controls}
            custom={0}
            strokeDasharray="8"
            strokeDashoffset="0"
          />
          <motion.line
            x1="8"
            x2="16"
            y1="17"
            y2="17"
            variants={lineVariants}
            initial="normal"
            animate={controls}
            custom={1}
            strokeDasharray="8"
            strokeDashoffset="0"
          />
          <motion.line
            x1="8"
            x2="11"
            y1="9"
            y2="9"
            variants={lineVariants}
            initial="normal"
            animate={controls}
            custom={2}
            strokeDasharray="3"
            strokeDashoffset="0"
          />
        </motion.svg>
      </motion.div>
    );
  },
);

FileTextIcon.displayName = "FileTextIcon";
export { FileTextIcon };








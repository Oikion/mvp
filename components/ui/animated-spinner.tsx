"use client";

import { cn } from "@/lib/utils";
import { motion, type Variants } from "motion/react";
import { duration, distance, easing, stagger, getDuration } from "@/lib/animation-tokens";

export interface AnimatedSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "dots" | "pulse" | "orbit" | "wave" | "bars";
  className?: string;
  color?: string;
}

const sizeMap = {
  sm: 20,
  md: 32,
  lg: 48,
  xl: 64,
};

// Elegant dots spinner
function DotsSpinner({ size, className, color }: { size: number; className?: string; color?: string }) {
  const dotVariants: Variants = {
    initial: { y: 0, opacity: 0.4 },
    animate: (i: number) => ({
      y: [0, -distance.md * 0.8, 0],
      opacity: [0.4, 1, 0.4],
      transition: {
        duration: getDuration("slowest") + 0.1,
        repeat: Infinity,
        ease: easing.inOut,
        delay: i * stagger.default,
      },
    }),
  };

  const dotSize = size / 5;

  return (
    <motion.div
      className={cn("flex items-center justify-center gap-1", className)}
      style={{ height: size, width: size * 1.5 }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className={cn("rounded-full", color || "bg-primary")}
          style={{ width: dotSize, height: dotSize }}
          variants={dotVariants}
          initial="initial"
          animate="animate"
          custom={i}
        />
      ))}
    </motion.div>
  );
}

// Pulse ring spinner
function PulseSpinner({ size, className, color }: { size: number; className?: string; color?: string }) {
  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className={cn(
            "absolute inset-0 rounded-full border-2",
            color ? `border-current` : "border-primary"
          )}
          style={{ color }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{
            scale: [0.8, 1.2, 1.4],
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: duration.extended / 1000 * 1.5,
            repeat: Infinity,
            ease: easing.out,
            delay: i * stagger.slow,
          }}
        />
      ))}
      <motion.span
        className={cn(
          "absolute inset-[25%] rounded-full",
          color || "bg-primary"
        )}
        animate={{ scale: [1, 0.9, 1] }}
        transition={{ duration: getDuration("slowest") + 0.3, repeat: Infinity, ease: easing.inOut }}
      />
    </div>
  );
}

// Orbit spinner
function OrbitSpinner({ size, className, color }: { size: number; className?: string; color?: string }) {
  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <motion.span
        className={cn("absolute inset-0 rounded-full border-2 border-transparent", color ? "border-t-current" : "border-t-primary")}
        style={{ color }}
        animate={{ rotate: 360 }}
        transition={{ duration: duration.extended / 1000, repeat: Infinity, ease: easing.linear }}
      />
      <motion.span
        className={cn("absolute inset-[15%] rounded-full border-2 border-transparent opacity-60", color ? "border-t-current" : "border-t-primary")}
        style={{ color }}
        animate={{ rotate: -360 }}
        transition={{ duration: duration.extended / 1000 * 1.5, repeat: Infinity, ease: easing.linear }}
      />
      <motion.span
        className={cn("absolute inset-[30%] rounded-full border-2 border-transparent opacity-30", color ? "border-t-current" : "border-t-primary")}
        style={{ color }}
        animate={{ rotate: 360 }}
        transition={{ duration: duration.extended / 1000 * 2, repeat: Infinity, ease: easing.linear }}
      />
    </div>
  );
}

// Wave spinner
function WaveSpinner({ size, className, color }: { size: number; className?: string; color?: string }) {
  const barWidth = size / 8;
  const barHeight = size * 0.7;

  return (
    <motion.div
      className={cn("flex items-center justify-center gap-0.5", className)}
      style={{ height: size, width: size }}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className={cn("rounded-full", color || "bg-primary")}
          style={{ width: barWidth, height: barHeight }}
          animate={{
            scaleY: [0.4, 1, 0.4],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: getDuration("slowest") + 0.3,
            repeat: Infinity,
            ease: easing.inOut,
            delay: i * stagger.default,
          }}
        />
      ))}
    </motion.div>
  );
}

// Bars spinner
function BarsSpinner({ size, className, color }: { size: number; className?: string; color?: string }) {
  const barWidth = size / 6;

  return (
    <motion.div
      className={cn("flex items-end justify-center gap-0.5", className)}
      style={{ height: size, width: size }}
    >
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className={cn("rounded-t", color || "bg-primary")}
          style={{ width: barWidth }}
          animate={{
            height: [size * 0.3, size * 0.8, size * 0.3],
          }}
          transition={{
            duration: getDuration("slowest") + 0.1,
            repeat: Infinity,
            ease: easing.inOut,
            delay: i * stagger.slow,
          }}
        />
      ))}
    </motion.div>
  );
}

export function AnimatedSpinner({
  size = "md",
  variant = "dots",
  className,
  color,
}: AnimatedSpinnerProps) {
  const pixelSize = sizeMap[size];

  const spinnerProps = { size: pixelSize, className, color };

  switch (variant) {
    case "dots":
      return <DotsSpinner {...spinnerProps} />;
    case "pulse":
      return <PulseSpinner {...spinnerProps} />;
    case "orbit":
      return <OrbitSpinner {...spinnerProps} />;
    case "wave":
      return <WaveSpinner {...spinnerProps} />;
    case "bars":
      return <BarsSpinner {...spinnerProps} />;
    default:
      return <DotsSpinner {...spinnerProps} />;
  }
}
















"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

interface AnimatedCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: React.ReactNode;
  variant?: "lift" | "glow" | "border" | "scale" | "shine";
  delay?: number;
}

const AnimatedCard = React.forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ className, children, variant = "lift", delay = 0, ...props }, ref) => {
    const shouldReduceMotion = useReducedMotion();

    const baseClasses =
      "rounded-xl border bg-card text-card-foreground shadow-sm transition-colors";

    const getHoverAnimation = () => {
      if (shouldReduceMotion) return {};

      switch (variant) {
        case "lift":
          return {
            y: -4,
            boxShadow:
              "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          };
        case "glow":
          return {
            boxShadow:
              "0 0 30px rgba(var(--primary), 0.15), 0 0 60px rgba(var(--primary), 0.1)",
          };
        case "border":
          return {
            borderColor: "hsl(var(--primary) / 0.5)",
          };
        case "scale":
          return {
            scale: 1.02,
          };
        case "shine":
          return {
            scale: 1.01,
          };
        default:
          return {};
      }
    };

    return (
      <motion.div
        ref={ref}
        className={cn(baseClasses, variant === "shine" && "shine-effect", className)}
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.4,
          delay,
          ease: "easeOut",
        }}
        whileHover={getHoverAnimation()}
        whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

AnimatedCard.displayName = "AnimatedCard";

// Card Header with animation support
interface AnimatedCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const AnimatedCardHeader = React.forwardRef<
  HTMLDivElement,
  AnimatedCardHeaderProps
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  >
    {children}
  </div>
));

AnimatedCardHeader.displayName = "AnimatedCardHeader";

// Card Title with subtle animation
const AnimatedCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => {
  // Extract only the props we want to pass, excluding onDrag to avoid type conflicts
  const { onDrag, ...safeProps } = props as any;
  return (
    <motion.h3
      ref={ref}
      className={cn("font-semibold leading-none tracking-tight", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      {...safeProps}
    >
      {children}
    </motion.h3>
  );
});

AnimatedCardTitle.displayName = "AnimatedCardTitle";

// Card Description
const AnimatedCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  // Extract only the props we want to pass, excluding onDrag to avoid type conflicts
  const { onDrag, ...safeProps } = props as any;
  return (
    <motion.p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      {...safeProps}
    >
      {children}
    </motion.p>
  );
});

AnimatedCardDescription.displayName = "AnimatedCardDescription";

// Card Content
const AnimatedCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props}>
    {children}
  </div>
));

AnimatedCardContent.displayName = "AnimatedCardContent";

// Card Footer
const AnimatedCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  >
    {children}
  </div>
));

AnimatedCardFooter.displayName = "AnimatedCardFooter";

// Stat card with animated counter
interface AnimatedStatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
  delay?: number;
}

function AnimatedStatCard({
  title,
  value,
  description,
  icon,
  trend,
  trendValue,
  className,
  delay = 0,
}: AnimatedStatCardProps) {
  const shouldReduceMotion = useReducedMotion();

  const trendColors = {
    up: "text-success",
    down: "text-destructive",
    neutral: "text-muted-foreground",
  };

  return (
    <AnimatedCard className={cn("p-6", className)} delay={delay} variant="lift">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <motion.p
            className="text-2xl font-bold"
            initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: delay + 0.2, ease: "easeOut" }}
          >
            {value}
          </motion.p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {icon && (
          <motion.div
            className="rounded-full bg-primary/10 p-3"
            initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: delay + 0.1 }}
          >
            {icon}
          </motion.div>
        )}
      </div>
      {trend && trendValue && (
        <motion.div
          className="mt-4 flex items-center gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: delay + 0.3 }}
        >
          {trend === "up" && (
            <svg
              className="h-4 w-4 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
          )}
          {trend === "down" && (
            <svg
              className="h-4 w-4 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          )}
          <span className={cn("text-sm font-medium", trend && trendColors[trend])}>
            {trendValue}
          </span>
        </motion.div>
      )}
    </AnimatedCard>
  );
}

export {
  AnimatedCard,
  AnimatedCardHeader,
  AnimatedCardTitle,
  AnimatedCardDescription,
  AnimatedCardContent,
  AnimatedCardFooter,
  AnimatedStatCard,
};


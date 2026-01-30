"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

// ============================================
// TYPES
// ============================================

interface ThinkingTextAnimationProps {
  /** Property name to display */
  propertyName: string;
  /** Portal name being read */
  portalName: string;
  /** Whether animation is active */
  isActive?: boolean;
  /** Current step index (for progress) */
  stepIndex?: number;
  /** Total steps */
  totalSteps?: number;
  /** Custom class name */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Color variant */
  variant?: "default" | "primary" | "success" | "warning";
}

// ============================================
// ANIMATED THINKING DOTS
// ============================================

function ThinkingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 ml-1", className)}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1 h-1 rounded-full bg-current"
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [0.8, 1.1, 0.8],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.2,
          }}
        />
      ))}
    </span>
  );
}

// ============================================
// TYPEWRITER TEXT
// ============================================

function TypewriterText({ 
  text, 
  delay = 0,
  className,
}: { 
  text: string; 
  delay?: number;
  className?: string;
}) {
  const [displayedText, setDisplayedText] = React.useState("");
  const [isComplete, setIsComplete] = React.useState(false);

  React.useEffect(() => {
    setDisplayedText("");
    setIsComplete(false);
    
    const timeout = setTimeout(() => {
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayedText(text.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(interval);
          setIsComplete(true);
        }
      }, 30);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timeout);
  }, [text, delay]);

  return (
    <span className={className}>
      {displayedText}
      {!isComplete && (
        <motion.span
          className="inline-block w-0.5 h-[1em] bg-current ml-0.5 align-middle"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
    </span>
  );
}

// ============================================
// PULSE RING
// ============================================

function PulseRing({ className }: { className?: string }) {
  return (
    <div className={cn("relative w-10 h-10 flex items-center justify-center", className)}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full border-2 border-current opacity-20"
          animate={{
            scale: [1, 1.5, 2],
            opacity: [0.3, 0.15, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut",
            delay: i * 0.6,
          }}
        />
      ))}
      <motion.span
        className="w-3 h-3 rounded-full bg-current"
        animate={{
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

// ============================================
// SHIMMER LINE
// ============================================

function ShimmerLine({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-0.5 w-full overflow-hidden rounded bg-current/10", className)}>
      <motion.div
        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-current to-transparent"
        animate={{ x: ["-100%", "400%"] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ThinkingTextAnimation({
  propertyName,
  portalName,
  isActive = true,
  stepIndex,
  totalSteps,
  className,
  size = "md",
  variant = "default",
}: ThinkingTextAnimationProps) {
  const [currentPhrase, setCurrentPhrase] = React.useState(0);

  const phrases = React.useMemo(() => [
    `Reading ${portalName}`,
    `Preparing data`,
    `Validating fields`,
    `Formatting export`,
  ], [portalName]);

  // Cycle through phrases
  React.useEffect(() => {
    if (!isActive) return;
    
    const interval = setInterval(() => {
      setCurrentPhrase((prev) => (prev + 1) % phrases.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [isActive, phrases.length]);

  const sizeClasses = {
    sm: {
      container: "p-3 gap-3",
      property: "text-sm font-medium",
      status: "text-xs",
      icon: "w-8 h-8",
    },
    md: {
      container: "p-4 gap-4",
      property: "text-base font-semibold",
      status: "text-sm",
      icon: "w-10 h-10",
    },
    lg: {
      container: "p-5 gap-5",
      property: "text-lg font-bold",
      status: "text-base",
      icon: "w-12 h-12",
    },
  };

  const variantClasses = {
    default: "text-foreground",
    primary: "text-primary",
    success: "text-success dark:text-emerald-400",
    warning: "text-warning dark:text-amber-400",
  };

  const styles = sizeClasses[size];
  const colorClass = variantClasses[variant];

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "rounded-lg border bg-card/50 backdrop-blur-sm",
        styles.container,
        className
      )}
    >
      <div className="flex items-center gap-4">
        {/* Animated pulse ring */}
        <div className={cn(colorClass)}>
          <PulseRing className={styles.icon} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Progress indicator */}
          {typeof stepIndex === "number" && typeof totalSteps === "number" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{stepIndex + 1} / {totalSteps}</span>
              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className={cn("h-full rounded-full", 
                    variant === "default" ? "bg-primary" : 
                    variant === "primary" ? "bg-primary" :
                    variant === "success" ? "bg-success" : "bg-warning"
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          )}

          {/* Property name */}
          <motion.div
            key={propertyName}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className={cn("truncate", styles.property)}
          >
            {propertyName}
          </motion.div>

          {/* Animated status text */}
          <div className={cn("flex items-center", styles.status, "text-muted-foreground")}>
            <AnimatePresence mode="wait">
              <motion.span
                key={currentPhrase}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="inline-flex items-center"
              >
                {phrases[currentPhrase]}
                <ThinkingDots />
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Shimmer line */}
          <ShimmerLine className={colorClass} />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// MULTI-STEP PROGRESS ANIMATION
// ============================================

interface PortalStepProps {
  portal: {
    id: string;
    name: string;
    icon?: React.ReactNode;
  };
  status: "pending" | "processing" | "complete" | "error";
  propertyName?: string;
}

export function PortalStepAnimation({
  portal,
  status,
  propertyName,
}: PortalStepProps) {
  const statusConfig = {
    pending: {
      color: "text-muted-foreground",
      bg: "bg-muted/50",
    },
    processing: {
      color: "text-primary",
      bg: "bg-primary/10",
    },
    complete: {
      color: "text-success dark:text-emerald-400",
      bg: "bg-success/10",
    },
    error: {
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
  };

  const config = statusConfig[status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "rounded-lg border p-3 transition-colors",
        config.bg,
        status === "processing" && "border-primary/50"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Status indicator */}
        <div className={cn("relative", config.color)}>
          {status === "processing" ? (
            <PulseRing className="w-6 h-6" />
          ) : status === "complete" ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
          ) : status === "error" ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-current opacity-30" />
          )}
        </div>

        {/* Portal info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {portal.icon}
            <span className="font-medium text-sm">{portal.name}</span>
          </div>
          
          {status === "processing" && propertyName && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-1 text-xs text-muted-foreground flex items-center"
            >
              <span>Reading {propertyName}</span>
              <ThinkingDots />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// BATCH PROGRESS ANIMATION
// ============================================

interface BatchProgressProps {
  currentProperty?: string;
  currentPortal?: string;
  processedCount: number;
  totalCount: number;
  className?: string;
}

export function BatchProgressAnimation({
  currentProperty,
  currentPortal,
  processedCount,
  totalCount,
  className,
}: BatchProgressProps) {
  const percentage = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "rounded-xl border bg-gradient-to-br from-card to-card/80 p-5 shadow-lg",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-primary">
            <PulseRing className="w-8 h-8" />
          </div>
          <div>
            <h4 className="font-semibold">Processing</h4>
            <p className="text-xs text-muted-foreground">
              {processedCount} of {totalCount} complete
            </p>
          </div>
        </div>
        <div className="text-2xl font-bold text-primary">{percentage}%</div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Current item */}
      {currentProperty && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <motion.div
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-sm font-medium truncate">{currentProperty}</span>
          </div>
          
          {currentPortal && (
            <div className="text-sm text-muted-foreground flex items-center pl-4">
              <span>Reading {currentPortal}</span>
              <ThinkingDots />
            </div>
          )}
          
          <ShimmerLine className="text-primary" />
        </div>
      )}
    </motion.div>
  );
}

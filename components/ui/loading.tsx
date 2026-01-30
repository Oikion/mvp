"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedSpinner, type AnimatedSpinnerProps } from "./animated-spinner";

/**
 * Loading Component - Oikion Design System
 *
 * Unified loading indicator with multiple variants for different contexts:
 *
 * - **spinner**: Simple rotating spinner (Loader2) - use for buttons, inline loading
 * - **dots**: Animated bouncing dots - default, use for sections/pages
 * - **pulse**: Pulsing ring animation - use for important loading states
 * - **orbit**: Orbital spinning rings - use for long-running processes
 * - **wave**: Wave pattern - use for data loading
 * - **bars**: Bar pattern - use for progress-like loading
 *
 * Decision Tree:
 * - Button loading → variant="spinner" with size="sm"
 * - Inline loading → variant="spinner" with size="xs" or "sm"
 * - Section loading → variant="dots" or "pulse" with size="md" or "lg"
 * - Full page loading → variant="dots" or "orbit" with size="xl" and message
 *
 * @example
 * ```tsx
 * // Button loading
 * <Button disabled={isPending}>
 *   {isPending && <Loading variant="spinner" size="sm" />}
 *   Submit
 * </Button>
 *
 * // Section loading
 * <Loading variant="dots" size="lg" message="Loading data..." />
 *
 * // Full page loading
 * <Loading variant="orbit" size="xl" message="Please wait..." fullscreen />
 * ```
 */

export type LoadingVariant =
  | "spinner"
  | "dots"
  | "pulse"
  | "orbit"
  | "wave"
  | "bars";

export type LoadingSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface LoadingProps {
  /** Loading animation variant */
  readonly variant?: LoadingVariant;
  /** Size of the loading indicator */
  readonly size?: LoadingSize;
  /** Optional message to display below spinner */
  readonly message?: string;
  /** Whether to show the message */
  readonly showMessage?: boolean;
  /** Make the loading indicator cover the full screen */
  readonly fullscreen?: boolean;
  /** Additional className */
  readonly className?: string;
  /** Custom color for the spinner (uses CSS color value) */
  readonly color?: string;
  /** Accessible label for screen readers */
  readonly "aria-label"?: string;
}

// Size mapping for simple spinner
const spinnerSizeMap: Record<LoadingSize, string> = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

// Size mapping for AnimatedSpinner
const animatedSizeMap: Record<LoadingSize, AnimatedSpinnerProps["size"]> = {
  xs: "sm",
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
};

/**
 * Simple spinner using Loader2 from lucide-react
 * Best for: buttons, inline loading, small indicators
 */
function SimpleSpinner({
  size = "md",
  className,
  color,
}: {
  size?: LoadingSize;
  className?: string;
  color?: string;
}) {
  return (
    <Loader2
      className={cn(
        "animate-spin",
        spinnerSizeMap[size],
        color ? undefined : "text-current",
        className
      )}
      style={color ? { color } : undefined}
      aria-hidden="true"
    />
  );
}

export function Loading({
  variant = "dots",
  size = "md",
  message,
  showMessage = true,
  fullscreen = false,
  className,
  color,
  "aria-label": ariaLabel,
}: LoadingProps) {
  // Use simple spinner for "spinner" variant
  const loadingElement =
    variant === "spinner" ? (
      <SimpleSpinner size={size} className={className} color={color} />
    ) : (
      <AnimatedSpinner
        variant={variant}
        size={animatedSizeMap[size]}
        className={className}
        color={color}
      />
    );

  // Simple inline spinner without message wrapper
  if (variant === "spinner" && !message && !fullscreen) {
    return (
      <span role="status" aria-label={ariaLabel || "Loading"}>
        {loadingElement}
        <span className="sr-only">{ariaLabel || "Loading"}</span>
      </span>
    );
  }

  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        fullscreen ? "min-h-screen" : "min-h-[100px]",
        className
      )}
      role="status"
      aria-label={ariaLabel || message || "Loading"}
    >
      {loadingElement}
      {showMessage && message && (
        <p className="text-muted-foreground text-sm font-medium animate-pulse">
          {message}
        </p>
      )}
      {!message && <span className="sr-only">{ariaLabel || "Loading"}</span>}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Inline loading spinner for use within text or buttons
 * Convenience export for the most common use case
 *
 * @example
 * ```tsx
 * <Button disabled={isPending}>
 *   {isPending && <LoadingSpinner />}
 *   Submit
 * </Button>
 * ```
 */
export function LoadingSpinner({
  size = "sm",
  className,
}: {
  readonly size?: LoadingSize;
  readonly className?: string;
}) {
  return <Loading variant="spinner" size={size} className={className} />;
}

/**
 * Page loading component with centered message
 * Convenience export for full-section loading
 *
 * @example
 * ```tsx
 * if (isLoading) {
 *   return <PageLoading message="Loading your data..." />;
 * }
 * ```
 */
export function PageLoading({
  message = "Loading...",
  variant = "dots",
}: {
  readonly message?: string;
  readonly variant?: LoadingVariant;
}) {
  return <Loading variant={variant} size="xl" message={message} showMessage />;
}

// Re-export AnimatedSpinner for advanced use cases
export { AnimatedSpinner } from "./animated-spinner";

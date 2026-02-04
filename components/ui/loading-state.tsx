"use client";

/**
 * @deprecated Use the `Loading` component from `@/components/ui/loading` instead.
 *
 * This component duplicates functionality that is better served by:
 * - `Loading` - For spinner variants (dots, pulse, orbit, wave, bars, spinner)
 * - `Skeleton` - For skeleton loading states
 * - `Button` with `isLoading` prop - For button loading states
 *
 * Migration:
 * ```tsx
 * // Before
 * <LoadingState text="Loading..." />
 *
 * // After
 * <Loading variant="dots" message="Loading..." />
 *
 * // Before
 * <LoadingState variant="page" text="Loading..." />
 *
 * // After
 * <Loading variant="dots" message="Loading..." fullscreen />
 *
 * // Before
 * <LoadingOverlay text="Loading..." />
 *
 * // After
 * <Loading variant="dots" message="Loading..." fullscreen />
 *
 * // For buttons, use Button's built-in isLoading prop:
 * <Button isLoading={isPending}>Submit</Button>
 * ```
 */

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * @deprecated Use `Loading` from `@/components/ui/loading` instead.
 */

const loadingVariants = cva("flex items-center justify-center", {
  variants: {
    variant: {
      /** Default centered spinner */
      default: "flex-col gap-3",
      /** Full page overlay */
      page: "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex-col gap-4",
      /** Inline with text */
      inline: "gap-2",
      /** Card/container loading */
      card: "min-h-[200px] flex-col gap-3",
      /** Skeleton placeholder */
      skeleton: "flex-col gap-4 w-full",
    },
    size: {
      sm: "",
      default: "",
      lg: "",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

const spinnerSizes = {
  sm: "h-4 w-4",
  default: "h-6 w-6",
  lg: "h-8 w-8",
};

const textSizes = {
  sm: "text-xs",
  default: "text-sm",
  lg: "text-base",
};

export interface LoadingStateProps extends VariantProps<typeof loadingVariants> {
  /**
   * Loading text to display below spinner
   */
  text?: string;
  /**
   * Additional class name
   */
  className?: string;
  /**
   * Number of skeleton rows (only for skeleton variant)
   */
  skeletonRows?: number;
  /**
   * Whether to show the loading state
   */
  show?: boolean;
}

export function LoadingState({
  variant = "default",
  size = "default",
  text,
  className,
  skeletonRows = 3,
  show = true,
}: Readonly<LoadingStateProps>) {
  if (!show) return null;

  if (variant === "skeleton") {
    return (
      <div className={cn(loadingVariants({ variant, size }), className)}>
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <div key={i} className="space-y-2 w-full">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(loadingVariants({ variant, size }), className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2
        className={cn(
          spinnerSizes[size ?? "default"],
          "animate-spin text-muted-foreground"
        )}
      />
      {text && (
        <p
          className={cn(
            textSizes[size ?? "default"],
            "text-muted-foreground animate-pulse"
          )}
        >
          {text}
        </p>
      )}
      <span className="sr-only">{text || "Loading..."}</span>
    </div>
  );
}

/**
 * LoadingOverlay - Full page loading overlay
 *
 * Use for route transitions or major data loading operations.
 *
 * @example
 * ```tsx
 * {isLoading && <LoadingOverlay text="Loading..." />}
 * ```
 */
export function LoadingOverlay({
  text,
  className,
}: {
  text?: string;
  className?: string;
}) {
  return <LoadingState variant="page" size="lg" text={text} className={className} />;
}

/**
 * LoadingButton - Loading state for buttons
 *
 * Renders a spinner that can be used inside buttons.
 *
 * @example
 * ```tsx
 * <Button disabled={isLoading}>
 *   {isLoading ? <LoadingButton /> : "Save"}
 * </Button>
 * ```
 */
export function LoadingButton({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn("h-4 w-4 animate-spin", className)}
      aria-hidden="true"
    />
  );
}

/**
 * LoadingCard - Card-shaped loading placeholder
 *
 * @example
 * ```tsx
 * {isLoading ? <LoadingCard /> : <PropertyCard property={property} />}
 * ```
 */
export function LoadingCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 space-y-3",
        className
      )}
    >
      <Skeleton className="h-32 w-full rounded-md" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

/**
 * LoadingTable - Table-shaped loading placeholder
 *
 * @example
 * ```tsx
 * {isLoading ? <LoadingTable rows={5} /> : <DataTable data={data} />}
 * ```
 */
export function LoadingTable({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full rounded-md border", className)}>
      {/* Header */}
      <div className="border-b px-4 py-3 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b last:border-0 px-4 py-3 flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

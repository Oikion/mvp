import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

/**
 * Skeleton - Loading placeholder component
 *
 * @example
 * ```tsx
 * // Basic skeleton
 * <Skeleton className="h-4 w-full" />
 *
 * // With preset variant
 * <Skeleton variant="avatar" size="md" />
 * <Skeleton variant="button" />
 * <Skeleton variant="text" />
 *
 * // Circular skeleton
 * <Skeleton variant="circular" size="lg" />
 * ```
 */

const skeletonVariants = cva("animate-pulse bg-muted", {
  variants: {
    variant: {
      /** Default rectangular skeleton */
      default: "rounded-md",
      /** Circular skeleton for avatars */
      circular: "rounded-full",
      /** Text line skeleton */
      text: "rounded h-4",
      /** Button-shaped skeleton */
      button: "rounded-md h-10",
      /** Avatar skeleton */
      avatar: "rounded-full",
      /** Card image skeleton */
      image: "rounded-md aspect-video",
      /** Badge skeleton */
      badge: "rounded-full h-5",
    },
    size: {
      xs: "",
      sm: "",
      md: "",
      lg: "",
      xl: "",
      full: "w-full",
    },
  },
  compoundVariants: [
    // Avatar sizes
    { variant: "avatar", size: "xs", className: "h-6 w-6" },
    { variant: "avatar", size: "sm", className: "h-8 w-8" },
    { variant: "avatar", size: "md", className: "h-10 w-10" },
    { variant: "avatar", size: "lg", className: "h-12 w-12" },
    { variant: "avatar", size: "xl", className: "h-16 w-16" },
    // Circular sizes (same as avatar)
    { variant: "circular", size: "xs", className: "h-6 w-6" },
    { variant: "circular", size: "sm", className: "h-8 w-8" },
    { variant: "circular", size: "md", className: "h-10 w-10" },
    { variant: "circular", size: "lg", className: "h-12 w-12" },
    { variant: "circular", size: "xl", className: "h-16 w-16" },
    // Text widths
    { variant: "text", size: "xs", className: "w-16" },
    { variant: "text", size: "sm", className: "w-24" },
    { variant: "text", size: "md", className: "w-32" },
    { variant: "text", size: "lg", className: "w-48" },
    { variant: "text", size: "xl", className: "w-64" },
    // Button widths
    { variant: "button", size: "sm", className: "w-16" },
    { variant: "button", size: "md", className: "w-24" },
    { variant: "button", size: "lg", className: "w-32" },
    // Badge widths
    { variant: "badge", size: "sm", className: "w-12" },
    { variant: "badge", size: "md", className: "w-16" },
    { variant: "badge", size: "lg", className: "w-20" },
  ],
  defaultVariants: {
    variant: "default",
  },
})

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

function Skeleton({
  className,
  variant,
  size,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(skeletonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

/**
 * SkeletonText - Multiple lines of text skeleton
 *
 * @example
 * ```tsx
 * <SkeletonText lines={3} />
 * <SkeletonText lines={2} lastLineWidth="75%" />
 * ```
 */
function SkeletonText({
  lines = 3,
  lastLineWidth = "75%",
  className,
  gap = "gap-2",
}: {
  lines?: number;
  lastLineWidth?: string;
  className?: string;
  gap?: string;
}) {
  return (
    <div className={cn("space-y-0", gap, className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          size="full"
          style={i === lines - 1 ? { width: lastLineWidth } : undefined}
        />
      ))}
    </div>
  )
}

/**
 * SkeletonCard - Card-shaped loading skeleton
 *
 * @example
 * ```tsx
 * <SkeletonCard />
 * <SkeletonCard showImage={false} />
 * ```
 */
function SkeletonCard({
  showImage = true,
  className,
}: {
  showImage?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-card p-4 space-y-3", className)}>
      {showImage && <Skeleton variant="image" />}
      <Skeleton variant="text" size="lg" />
      <Skeleton variant="text" size="md" />
      <div className="flex gap-2">
        <Skeleton variant="badge" size="md" />
        <Skeleton variant="badge" size="lg" />
      </div>
    </div>
  )
}

/**
 * SkeletonRow - Table row skeleton
 *
 * @example
 * ```tsx
 * <SkeletonRow columns={4} />
 * ```
 */
function SkeletonRow({
  columns = 4,
  className,
}: {
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-4 px-4 py-3", className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  )
}

export { Skeleton, SkeletonText, SkeletonCard, SkeletonRow, skeletonVariants }

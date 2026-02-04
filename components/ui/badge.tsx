import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Badge variants using semantic color tokens from the design system.
 * These colors are defined in tailwind.config.js and support dark mode automatically.
 *
 * Semantic variants:
 * - success: Positive states (completed, active, approved)
 * - warning: Caution states (pending, attention needed)
 * - info: Informational states (new, in progress)
 * - destructive: Negative states (error, declined, deleted)
 *
 * Size variants:
 * - sm: Compact badges for tight spaces
 * - default: Standard badge size
 * - lg: Larger badges for emphasis
 */
const badgeVariants = cva(
  "inline-flex items-center whitespace-nowrap rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Semantic color variants using design system tokens
        success:
          "border-transparent bg-success/15 text-success hover:bg-success/25",
        warning:
          "border-transparent bg-warning/15 text-warning hover:bg-warning/25",
        info:
          "border-transparent bg-info/15 text-info hover:bg-info/25",
        // Accent variant for special highlighting (using purple)
        purple:
          "border-transparent bg-purple-500/15 text-purple-600 hover:bg-purple-500/25 dark:text-purple-400",
        gray:
          "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        default: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: Readonly<BadgeProps>) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

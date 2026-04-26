import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// CONSTRAINT: Do not render badge colors outside this CVA definition.
// Use <StatusBadge entityType="..." status="..." /> for all entity statuses.
// Use <Badge variant="..."> only with the typed BadgeVariant union.
// Never use raw Tailwind color classes (bg-blue-*, text-rose-*) on badge elements.
const badgeVariants = cva(
  "inline-flex items-center whitespace-nowrap rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-badge-gray-bg text-badge-gray-fg border-badge-gray-fg/20",
        destructive:
          "border-transparent bg-badge-destructive-bg text-badge-destructive-fg border-badge-destructive-fg/20",
        outline: "text-foreground",
        success:
          "border-transparent bg-badge-success-bg text-badge-success-fg border-badge-success-fg/20",
        warning:
          "border-transparent bg-badge-warning-bg text-badge-warning-fg border-badge-warning-fg/20",
        info:
          "border-transparent bg-badge-info-bg text-badge-info-fg border-badge-info-fg/20",
        purple:
          "border-transparent bg-badge-purple-bg text-badge-purple-fg border-badge-purple-fg/20",
        gray:
          "border-transparent bg-badge-gray-bg text-badge-gray-fg border-badge-gray-fg/20",
        // Category classifier variants
        teal:
          "border-transparent bg-badge-teal-bg text-badge-teal-fg border-badge-teal-fg/20",
        rose:
          "border-transparent bg-badge-rose-bg text-badge-rose-fg border-badge-rose-fg/20",
        amber:
          "border-transparent bg-badge-amber-bg text-badge-amber-fg border-badge-amber-fg/20",
        cyan:
          "border-transparent bg-badge-cyan-bg text-badge-cyan-fg border-badge-cyan-fg/20",
        violet:
          "border-transparent bg-badge-violet-bg text-badge-violet-fg border-badge-violet-fg/20",
        fuchsia:
          "border-transparent bg-badge-fuchsia-bg text-badge-fuchsia-fg border-badge-fuchsia-fg/20",
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

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>

export { Badge, badgeVariants }

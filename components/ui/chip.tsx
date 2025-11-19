import * as React from "react"
import { X } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Chip Component - Oikion Design System
 * 
 * Badge/chip component for filters, tags, and labels with:
 * - Variants: default, selected, outlined, filter
 * - States: hover, active, disabled
 * - Icon support (leading/trailing)
 * - Theme-aware colors
 * - Proper transitions (150-200ms ease-in-out)
 * - Accessibility: aria attributes, keyboard focus states
 * 
 * @example
 * <Chip variant="default">Default</Chip>
 * <Chip variant="selected">Selected</Chip>
 * <Chip variant="filter" onRemove={() => {}}>Filter</Chip>
 */
const chipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md text-xs font-medium transition-all duration-fast ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        selected: "bg-primary text-primary-foreground hover:bg-primary/90",
        outlined: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
        filter: "bg-accent text-accent-foreground hover:bg-accent/80",
      },
      size: {
        sm: "h-6 px-2 text-xs",
        md: "h-7 px-2.5 text-xs",
        lg: "h-8 px-3 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface ChipProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof chipVariants> {
  onRemove?: () => void
  removable?: boolean
}

const Chip = React.forwardRef<HTMLDivElement, ChipProps>(
  ({ className, variant, size, onRemove, removable, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(chipVariants({ variant, size }), className)}
        role="button"
        tabIndex={removable || onRemove ? 0 : -1}
        aria-label={removable || onRemove ? `Remove ${typeof children === 'string' ? children : 'chip'}` : undefined}
        {...props}
      >
        {children}
        {(removable || onRemove) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove?.()
            }}
            className="ml-1 rounded-sm hover:bg-background/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Remove ${typeof children === 'string' ? children : 'chip'}`}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    )
  }
)
Chip.displayName = "Chip"

export { Chip, chipVariants }


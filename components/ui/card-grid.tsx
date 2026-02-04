import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * CardGrid Component - Oikion Design System
 * 
 * Responsive card grid system
 * 
 * @example
 * <CardGrid>
 *   <Card>Card 1</Card>
 *   <Card>Card 2</Card>
 * </CardGrid>
 */
export interface CardGridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2 | 3 | 4
}

const CardGrid = React.forwardRef<HTMLDivElement, CardGridProps>(
  ({ className, columns = 3, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "grid gap-4 md:gap-6",
          columns === 1 && "grid-cols-1",
          columns === 2 && "grid-cols-1 md:grid-cols-2",
          columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
          columns === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CardGrid.displayName = "CardGrid"

export { CardGrid }


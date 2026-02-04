import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Container Component - Oikion Design System
 * 
 * Full-width container with max-width constraints
 * 
 * @example
 * <Container>
 *   <h1>Content</h1>
 * </Container>
 */
export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl" | "full"
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = "lg", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "w-full mx-auto px-4 sm:px-6 lg:px-8",
          size === "sm" && "max-w-screen-sm",
          size === "md" && "max-w-screen-md",
          size === "lg" && "max-w-screen-lg",
          size === "xl" && "max-w-screen-xl",
          size === "full" && "max-w-full",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Container.displayName = "Container"

export { Container }


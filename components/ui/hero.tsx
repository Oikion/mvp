import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Hero Component - Oikion Design System
 * 
 * Responsive hero section with theme-aware styling
 * 
 * @example
 * <Hero>
 *   <HeroTitle>Welcome to Oikion</HeroTitle>
 *   <HeroDescription>Your real estate management solution</HeroDescription>
 * </Hero>
 */
export interface HeroProps extends React.HTMLAttributes<HTMLElement> {
  variant?: "default" | "centered" | "minimal"
}

const Hero = React.forwardRef<HTMLElement, HeroProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <section
        ref={ref}
        className={cn(
          "w-full py-12 md:py-16 lg:py-24",
          variant === "centered" && "text-center",
          variant === "minimal" && "py-8 md:py-12",
          className
        )}
        {...props}
      >
        {children}
      </section>
    )
  }
)
Hero.displayName = "Hero"

const HeroTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h1
    ref={ref}
    className={cn(
      "text-h1 font-bold text-text-primary mb-4",
      className
    )}
    {...props}
  />
))
HeroTitle.displayName = "HeroTitle"

const HeroDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-body text-text-secondary max-w-2xl mb-6",
      className
    )}
    {...props}
  />
))
HeroDescription.displayName = "HeroDescription"

export { Hero, HeroTitle, HeroDescription }


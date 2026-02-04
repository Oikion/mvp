import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Button Component - Oikion Design System
 * 
 * Unified button component with:
 * - Clean, flat design with all states: default, hover, focus, active, disabled
 * - Variants: default, secondary, destructive, success, outline, ghost, link
 * - Smooth transitions and micro-interactions (active scale)
 * - Enhanced hover effects with shadow lift
 * - Built-in loading state with spinner
 * - Icon support (leftIcon, rightIcon)
 * - Full width option
 * - Disabled tooltip for UX clarity
 * - Accessibility: aria attributes, keyboard focus states
 * - WCAG contrast ratios ensured (WCAG AA compliant)
 * - Theme-aware colors via CSS variables
 * 
 * @example
 * // Basic usage
 * <Button variant="default" size="default">Click me</Button>
 * 
 * // With loading state
 * <Button isLoading={isPending}>Submit</Button>
 * 
 * // With icons
 * <Button leftIcon={<Save />} variant="success">Save</Button>
 * 
 * // Full width with disabled tooltip
 * <Button fullWidth disabled disabledTooltip="Complete the form first">
 *   Submit
 * </Button>
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not(.loading-spinner)]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-200 active:scale-[0.97] hover:[&_svg:not(.loading-spinner)]:scale-110",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md",
        success:
          "bg-success text-success-foreground shadow-sm hover:bg-success/90 hover:shadow-md",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/20",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all hover:after:w-full hover:no-underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-md px-10 text-base",
        icon: "h-10 w-10",
        // WCAG 2.5.5 compliant touch targets (44px minimum)
        "icon-touch": "h-11 w-11 min-h-[44px] min-w-[44px]",
        "touch": "h-11 min-h-[44px] px-4 py-2",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      fullWidth: false,
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    Omit<VariantProps<typeof buttonVariants>, "fullWidth"> {
  /** Render as a child component (Slot) */
  asChild?: boolean
  /** Icon to show on the left side */
  leftIcon?: React.ReactNode
  /** Icon to show on the right side */
  rightIcon?: React.ReactNode
  /** Show loading spinner and disable interactions */
  isLoading?: boolean
  /** Make button full width of container */
  fullWidth?: boolean
  /** Tooltip text to show when button is disabled */
  disabledTooltip?: string | React.ReactNode
}

/** Helper to build button inner content */
function buildButtonContent(
  isLoading: boolean,
  isIconOnly: boolean,
  leftIcon: React.ReactNode,
  rightIcon: React.ReactNode,
  children: React.ReactNode,
  asChild: boolean
): React.ReactNode {
  if (isIconOnly) {
    const iconElement = isLoading 
      ? <Loader2 className="loading-spinner h-4 w-4 animate-spin" />
      : leftIcon
    return asChild ? <span>{iconElement}</span> : iconElement
  }

  const content = (
    <>
      {isLoading && <Loader2 className="loading-spinner h-4 w-4 animate-spin" />}
      {!isLoading && leftIcon}
      {children}
      {rightIcon}
    </>
  )
  return asChild ? <span>{content}</span> : content
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    fullWidth = false,
    asChild = false, 
    leftIcon,
    rightIcon,
    children,
    isLoading = false,
    disabled,
    disabledTooltip,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button"
    const isDisabled = isLoading || disabled
    const isIconOnly = size === "icon" && !!leftIcon && !children && !rightIcon
    
    const buttonInnerContent = buildButtonContent(
      isLoading, isIconOnly, leftIcon, rightIcon, children, asChild
    )

    const buttonElement = (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={isDisabled}
        tabIndex={isDisabled ? -1 : 0}
        aria-disabled={isDisabled}
        aria-busy={isLoading}
        aria-label={isIconOnly ? props["aria-label"] || "Button" : undefined}
        data-slot="button"
        {...props}
      >
        {buttonInnerContent}
      </Comp>
    )

    // Wrap with tooltip if disabled and tooltip is provided
    if (isDisabled && disabledTooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild className="cursor-not-allowed">
              <div className="inline-flex">{buttonElement}</div>
            </TooltipTrigger>
            <TooltipContent>
              {disabledTooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return buttonElement
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

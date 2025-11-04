import * as React from "react"
import { AlertCircle, CheckCircle2 } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Input Component - Oikion Design System
 * 
 * Enhanced input with:
 * - Validation states: error, warning, success
 * - Human-friendly error messages
 * - Focus states with visible rings (theme-aware)
 * - Disabled states (proper opacity/contrast)
 * - Label associations for accessibility
 * - Icon support for states (error icon, success icon)
 * - Proper transitions (150-200ms ease-in-out)
 * 
 * @example
 * <Input error="This field is required" />
 * <Input success validationMessage="Looks good!" />
 */
export interface InputProps extends React.ComponentProps<"input"> {
  error?: string | boolean
  warning?: string | boolean
  success?: boolean
  validationMessage?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, warning, success, validationMessage, value, ...props }, ref) => {
    const hasError = !!error
    const hasWarning = !!warning
    const hasSuccess = success
    const validationText = error || warning || validationMessage
    
    // Ensure value is always a string to prevent uncontrolled/controlled warning
    // File inputs should not have a value prop (they're always uncontrolled)
    const isFileInput = type === 'file'
    const inputValue = value === undefined || value === null ? '' : value
    const inputProps = isFileInput 
      ? { ...props } 
      : { ...props, value: inputValue }
    
    return (
      <div className="w-full">
        <div className="relative">
      <input
        type={type}
        className={cn(
              "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground transition-all duration-fast ease-in-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              "md:text-sm",
              hasError && "border-error focus-visible:ring-error/50",
              hasWarning && "border-warning focus-visible:ring-warning/50",
              hasSuccess && "border-success focus-visible:ring-success/50",
              !hasError && !hasWarning && !hasSuccess && "border-input focus-visible:ring-ring focus-visible:ring-offset-2",
              validationText && "pr-10",
          className
        )}
        ref={ref}
            aria-invalid={hasError}
            aria-describedby={validationText ? `${props.id || 'input'}-validation` : undefined}
        {...inputProps}
      />
          {hasError && (
            <AlertCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-error" aria-hidden="true" />
          )}
          {hasWarning && !hasError && (
            <AlertCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warning" aria-hidden="true" />
          )}
          {hasSuccess && !hasError && !hasWarning && (
            <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-success" aria-hidden="true" />
          )}
        </div>
        {validationText && typeof validationText === 'string' && (
          <p
            id={`${props.id || 'input'}-validation`}
            className={cn(
              "mt-1.5 text-xs",
              hasError && "text-error",
              hasWarning && "text-warning",
              hasSuccess && "text-success"
            )}
            role="alert"
          >
            {validationText}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }

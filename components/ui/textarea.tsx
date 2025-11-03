import * as React from "react"
import { AlertCircle, CheckCircle2 } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Textarea Component - Oikion Design System
 * 
 * Enhanced textarea with:
 * - Validation states: error, warning, success
 * - Human-friendly error messages
 * - Focus states with visible rings (theme-aware)
 * - Disabled states (proper opacity/contrast)
 * - Label associations for accessibility
 * - Icon support for states
 * - Proper transitions (150-200ms ease-in-out)
 * 
 * @example
 * <Textarea error="This field is required" />
 * <Textarea success validationMessage="Looks good!" />
 */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string | boolean
  warning?: string | boolean
  success?: boolean
  validationMessage?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, warning, success, validationMessage, ...props }, ref) => {
    const hasError = !!error
    const hasWarning = !!warning
    const hasSuccess = success
    const validationText = error || warning || validationMessage
    
    return (
      <div className="w-full">
        <div className="relative">
      <textarea
        className={cn(
              "flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground transition-all duration-fast ease-in-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              hasError && "border-error focus-visible:ring-error/50",
              hasWarning && "border-warning focus-visible:ring-warning/50",
              hasSuccess && "border-success focus-visible:ring-success/50",
              !hasError && !hasWarning && !hasSuccess && "border-input focus-visible:ring-ring focus-visible:ring-offset-2",
              validationText && "pb-8",
          className
        )}
        ref={ref}
            aria-invalid={hasError}
            aria-describedby={validationText ? `${props.id || 'textarea'}-validation` : undefined}
        {...props}
      />
          {hasError && (
            <AlertCircle className="absolute right-3 top-3 h-4 w-4 text-error" aria-hidden="true" />
          )}
          {hasWarning && !hasError && (
            <AlertCircle className="absolute right-3 top-3 h-4 w-4 text-warning" aria-hidden="true" />
          )}
          {hasSuccess && !hasError && !hasWarning && (
            <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-success" aria-hidden="true" />
          )}
        </div>
        {validationText && typeof validationText === 'string' && (
          <p
            id={`${props.id || 'textarea'}-validation`}
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
Textarea.displayName = "Textarea"

export { Textarea }

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * FormFieldError Component - Oikion Design System
 *
 * Displays a single field error message with consistent styling.
 * Use this for custom form implementations outside of react-hook-form's FormMessage.
 *
 * For react-hook-form, prefer using FormMessage from @/components/ui/form
 * as it automatically connects to the form context.
 *
 * @example
 * ```tsx
 * // Standalone usage
 * <FormFieldError message={error} />
 *
 * // With field ID for accessibility
 * <Input aria-describedby="email-error" />
 * <FormFieldError id="email-error" message={errors.email} />
 * ```
 */
interface FormFieldErrorProps {
  /** Error message to display */
  readonly message?: string | null;
  /** ID for aria-describedby connection */
  readonly id?: string;
  /** Additional className */
  readonly className?: string;
  /** Show icon alongside error */
  readonly showIcon?: boolean;
}

export function FormFieldError({
  message,
  id,
  className,
  showIcon = true,
}: FormFieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      id={id}
      role="alert"
      aria-live="polite"
      className={cn(
        "text-sm font-medium text-destructive flex items-center gap-1.5 mt-1.5",
        className
      )}
    >
      {showIcon && (
        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      <span>{message}</span>
    </p>
  );
}

/**
 * FormFieldHint Component - Oikion Design System
 *
 * Displays helper/hint text below form fields.
 * Use for validation hints, format requirements, or additional context.
 *
 * @example
 * ```tsx
 * <Input type="email" />
 * <FormFieldHint>We'll never share your email with anyone else.</FormFieldHint>
 * ```
 */
interface FormFieldHintProps {
  /** Hint text to display */
  readonly children: React.ReactNode;
  /** Additional className */
  readonly className?: string;
}

export function FormFieldHint({ children, className }: FormFieldHintProps) {
  return (
    <p
      className={cn(
        "text-sm text-muted-foreground mt-1.5",
        className
      )}
    >
      {children}
    </p>
  );
}

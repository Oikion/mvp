import { XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * FormErrors Component - Oikion Design System
 *
 * Displays a list of field errors with consistent styling.
 * Uses semantic color tokens for theme compatibility.
 *
 * @example
 * ```tsx
 * <FormErrors id="email" errors={errors} />
 * ```
 */
interface FormErrorsProps {
  /** Field ID to look up errors for */
  id: string;
  /** Record of field errors (typically from server action) */
  errors?: Record<string, string[] | undefined>;
  /** Additional className */
  className?: string;
}

export const FormErrors = ({ id, errors, className }: FormErrorsProps) => {
  if (!errors) {
    return null;
  }

  const fieldErrors = errors[id];
  if (!fieldErrors || fieldErrors.length === 0) {
    return null;
  }

  return (
    <div
      id={`${id}-error`}
      aria-live="polite"
      role="alert"
      className={cn("mt-2 text-xs text-destructive space-y-1", className)}
    >
      {fieldErrors.map((error: string) => (
        <div
          key={error}
          className="flex items-center font-medium p-2 border border-destructive/50 bg-destructive/10 rounded-sm"
        >
          <XCircle className="h-4 w-4 mr-2 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ))}
    </div>
  );
};

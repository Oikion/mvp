/**
 * Centralized Form Error Handler - Oikion Design System
 *
 * This module provides standardized error handling utilities for forms.
 * It defines the decision tree for when to use which error display pattern:
 *
 * Decision Tree:
 * - Field-level validation errors → FormMessage (via react-hook-form)
 * - Form-level errors → Toast with error variant
 * - Server errors → Toast with detailed message
 * - Validation hints → Helper text below input
 *
 * @example
 * ```tsx
 * import { handleFormError, handleServerError } from '@/lib/form/error-handler';
 *
 * // In a form submission handler
 * try {
 *   await submitForm(data);
 *   toast.success("createSuccess");
 * } catch (error) {
 *   handleServerError(error, toast);
 * }
 * ```
 */

import { FieldErrors, FieldValues } from "react-hook-form";

/**
 * Error types for categorization
 */
export type ErrorType = "field" | "form" | "server" | "network" | "validation";

/**
 * Structured error with type and message
 */
export interface FormError {
  type: ErrorType;
  message: string;
  field?: string;
  code?: string;
}

/**
 * Toast interface (matches useAppToast return type)
 */
interface ToastMethods {
  error: (
    message: string,
    options?: { description?: string; isTranslationKey?: boolean }
  ) => void;
  warning: (
    message: string,
    options?: { description?: string; isTranslationKey?: boolean }
  ) => void;
}

/**
 * Extract a user-friendly error message from various error types
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "An unexpected error occurred";
}

/**
 * Categorize an error based on its characteristics
 */
export function categorizeError(error: unknown): FormError {
  const message = extractErrorMessage(error);
  const lowerMessage = message.toLowerCase();

  // Network errors
  if (
    lowerMessage.includes("network") ||
    lowerMessage.includes("fetch") ||
    lowerMessage.includes("connection") ||
    lowerMessage.includes("timeout")
  ) {
    return { type: "network", message, code: "NETWORK_ERROR" };
  }

  // Validation errors
  if (
    lowerMessage.includes("validation") ||
    lowerMessage.includes("invalid") ||
    lowerMessage.includes("required")
  ) {
    return { type: "validation", message, code: "VALIDATION_ERROR" };
  }

  // Server errors
  if (
    lowerMessage.includes("server") ||
    lowerMessage.includes("500") ||
    lowerMessage.includes("internal")
  ) {
    return { type: "server", message, code: "SERVER_ERROR" };
  }

  // Default to form error
  return { type: "form", message, code: "FORM_ERROR" };
}

/**
 * Handle server errors by displaying appropriate toast
 *
 * Use this for errors that occur during form submission to API
 */
export function handleServerError(
  error: unknown,
  toast: ToastMethods,
  options?: {
    /** Custom error message to show instead of extracted one */
    customMessage?: string;
    /** Translation key from common.json toast namespace */
    translationKey?: string;
    /** Additional description text */
    description?: string;
  }
): void {
  const categorized = categorizeError(error);

  if (options?.translationKey) {
    toast.error(options.translationKey, {
      description: options.description,
      isTranslationKey: true,
    });
    return;
  }

  if (options?.customMessage) {
    toast.error(options.customMessage, {
      description: options.description,
      isTranslationKey: false,
    });
    return;
  }

  // Use categorized error with appropriate translation key
  switch (categorized.type) {
    case "network":
      toast.error("networkError", { isTranslationKey: true });
      break;
    case "validation":
      toast.error(categorized.message, { isTranslationKey: false });
      break;
    case "server":
      toast.error("somethingWentWrong", {
        description: categorized.message,
        isTranslationKey: true,
      });
      break;
    default:
      toast.error(categorized.message, { isTranslationKey: false });
  }
}

/**
 * Handle form-level errors (not field-specific)
 *
 * Use this for errors that apply to the entire form, not a specific field
 */
export function handleFormError(
  error: unknown,
  toast: ToastMethods,
  options?: {
    /** Translation key for error message */
    translationKey?: string;
    /** Additional description */
    description?: string;
  }
): void {
  if (options?.translationKey) {
    toast.error(options.translationKey, {
      description: options.description,
      isTranslationKey: true,
    });
    return;
  }

  const message = extractErrorMessage(error);
  toast.error(message, {
    description: options?.description,
    isTranslationKey: false,
  });
}

/**
 * Check if form has any field errors
 */
export function hasFieldErrors<T extends FieldValues>(
  errors: FieldErrors<T>
): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Get first error message from field errors
 */
export function getFirstFieldError<T extends FieldValues>(
  errors: FieldErrors<T>
): string | undefined {
  const firstKey = Object.keys(errors)[0];
  if (firstKey) {
    const error = errors[firstKey as keyof T];
    if (error && typeof error === "object" && "message" in error) {
      const message = error.message;
      return typeof message === "string" ? message : undefined;
    }
  }
  return undefined;
}

/**
 * Standard validation mode configuration for react-hook-form
 *
 * - mode: "onBlur" - Validate when user leaves field
 * - reValidateMode: "onChange" - Re-validate on change after first error
 *
 * @example
 * ```tsx
 * const form = useForm({
 *   ...validationConfig,
 *   resolver: zodResolver(schema),
 * });
 * ```
 */
export const validationConfig = {
  mode: "onBlur" as const,
  reValidateMode: "onChange" as const,
};

/**
 * Standard form submission wrapper with error handling
 *
 * @example
 * ```tsx
 * const onSubmit = withErrorHandling(
 *   async (data) => {
 *     await createItem(data);
 *     toast.success("createSuccess");
 *   },
 *   toast
 * );
 * ```
 */
export function withErrorHandling<T>(
  handler: (data: T) => Promise<void>,
  toast: ToastMethods,
  options?: {
    onError?: (error: unknown) => void;
    translationKey?: string;
  }
): (data: T) => Promise<void> {
  return async (data: T) => {
    try {
      await handler(data);
    } catch (error) {
      handleServerError(error, toast, {
        translationKey: options?.translationKey,
      });
      options?.onError?.(error);
    }
  };
}

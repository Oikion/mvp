/**
 * Form Utilities - Oikion Design System
 *
 * Centralized form error handling, validation configuration, and utilities.
 *
 * @example
 * ```tsx
 * import {
 *   handleServerError,
 *   validationConfig,
 *   withErrorHandling,
 * } from '@/lib/form';
 * ```
 */

export {
  extractErrorMessage,
  categorizeError,
  handleServerError,
  handleFormError,
  hasFieldErrors,
  getFirstFieldError,
  validationConfig,
  withErrorHandling,
  type ErrorType,
  type FormError,
} from "./error-handler";

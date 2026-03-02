/**
 * Error Code Detection Utilities
 * Maps common error patterns to standardized error codes
 */

export type ErrorCode =
  | "ERR_NETWORK"
  | "ERR_TIMEOUT"
  | "ERR_UNAUTHORIZED"
  | "ERR_FORBIDDEN"
  | "ERR_NOT_FOUND"
  | "ERR_SERVER"
  | "ERR_DATABASE"
  | "ERR_VALIDATION"
  | "ERR_RATE_LIMIT"
  | "ERR_MAINTENANCE"
  | "ERR_UNKNOWN";

/**
 * Detect error code from error object
 */
export function detectErrorCode(error: Error & { digest?: string }): ErrorCode {
  const message = error.message?.toLowerCase() || "";
  const name = error.name?.toLowerCase() || "";

  // Network errors
  if (
    message.includes("network") ||
    message.includes("fetch failed") ||
    message.includes("failed to fetch") ||
    name.includes("networkerror")
  ) {
    return "ERR_NETWORK";
  }

  // Timeout errors
  if (
    message.includes("timeout") ||
    message.includes("timed out") ||
    name.includes("timeouterror")
  ) {
    return "ERR_TIMEOUT";
  }

  // Authentication errors (401)
  if (
    message.includes("unauthorized") ||
    message.includes("401") ||
    message.includes("unauthenticated") ||
    message.includes("session expired")
  ) {
    return "ERR_UNAUTHORIZED";
  }

  // Authorization errors (403)
  if (
    message.includes("forbidden") ||
    message.includes("403") ||
    message.includes("access denied") ||
    message.includes("permission denied")
  ) {
    return "ERR_FORBIDDEN";
  }

  // Not found errors (404)
  if (
    message.includes("not found") ||
    message.includes("404") ||
    message.includes("does not exist")
  ) {
    return "ERR_NOT_FOUND";
  }

  // Database errors
  if (
    message.includes("database") ||
    message.includes("prisma") ||
    message.includes("connection") ||
    message.includes("query failed")
  ) {
    return "ERR_DATABASE";
  }

  // Validation errors
  if (
    message.includes("validation") ||
    message.includes("invalid") ||
    message.includes("required") ||
    name.includes("validationerror")
  ) {
    return "ERR_VALIDATION";
  }

  // Rate limit errors (429)
  if (
    message.includes("rate limit") ||
    message.includes("429") ||
    message.includes("too many requests")
  ) {
    return "ERR_RATE_LIMIT";
  }

  // Maintenance mode (503)
  if (
    message.includes("maintenance") ||
    message.includes("503") ||
    message.includes("service unavailable")
  ) {
    return "ERR_MAINTENANCE";
  }

  // Server errors (500)
  if (
    message.includes("server error") ||
    message.includes("500") ||
    message.includes("internal error")
  ) {
    return "ERR_SERVER";
  }

  return "ERR_UNKNOWN";
}

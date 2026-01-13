/**
 * Platform Admin Utility Functions
 * 
 * Synchronous utility functions for platform admin operations.
 * These are NOT server actions - they're pure utility functions.
 */

/**
 * Mask sensitive data for display
 * e.g., "john@example.com" -> "j***@example.com"
 */
export function maskEmail(email: string): string {
  if (!email?.includes("@")) {
    return "***";
  }
  const [local, domain] = email.split("@");
  if (local.length <= 1) {
    return `*@${domain}`;
  }
  return `${local[0]}${"*".repeat(Math.min(local.length - 1, 3))}@${domain}`;
}

/**
 * Mask phone number for display
 * e.g., "+30 698 123 4567" -> "+30 *** *** **67"
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) {
    return "***";
  }
  // Show country code (first 3 chars) and last 2 digits
  const lastTwo = phone.slice(-2);
  const prefix = phone.slice(0, 3);
  return `${prefix} *** *** **${lastTwo}`;
}

/**
 * Admin Action Types for audit logging
 */
export type AdminActionType =
  | "VIEW_USERS"
  | "VIEW_ORGANIZATIONS"
  | "VIEW_METRICS"
  | "SEND_WARNING"
  | "SUSPEND_ACCOUNT"
  | "UNSUSPEND_ACCOUNT"
  | "DELETE_ACCOUNT"
  | "VIEW_USER_DETAILS"
  | "VIEW_FEEDBACK"
  | "VIEW_FEEDBACK_DETAILS"
  | "UPDATE_FEEDBACK_STATUS"
  | "RESPOND_TO_FEEDBACK"
  | "CREATE_CHANGELOG"
  | "UPDATE_CHANGELOG"
  | "DELETE_CHANGELOG"
  | "PUBLISH_CHANGELOG"
  | "CREATE_REFERRAL_CODE"
  | "UPDATE_REFERRAL_COMMISSION"
  | "UPDATE_REFERRAL_PAYOUT"
  | "WARN_USER"
  | "DELETE_USER"
  | "VIEW_ADMIN_LOGS";

/**
 * Validate that a reason/message is safe and not malicious
 * Prevents XSS and SQL injection in admin messages
 */
export function sanitizeAdminMessage(message: string): string {
  // Remove HTML tags
  let sanitized = message.replace(/<[^>]*>/g, "");
  // Escape special characters
  sanitized = sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
  // Limit length
  return sanitized.slice(0, 1000);
}









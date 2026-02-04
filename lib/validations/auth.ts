import { z } from "zod";

/**
 * Validation schema for user registration
 * - Email: Required, valid format
 * - Password: Required, min 8 chars
 * - Confirm Password: Required, must match password
 * 
 * Note: First name, last name, and username are collected during onboarding
 */
export const registerSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
  confirmPassword: z
    .string()
    .min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/**
 * Validation schema for user sign-in
 * - Email/Identifier: Required
 * - Password: Required
 */
export const signInSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required"),
});

/**
 * Type exports for form handling
 */
export type RegisterFormData = z.infer<typeof registerSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;

/**
 * Map Clerk error codes to user-friendly messages
 */
export const clerkErrorMessages: Record<string, string> = {
  // Registration errors
  "form_identifier_exists": "This email is already registered. Please sign in instead.",
  "form_password_pwned": "This password has been compromised in a data breach. Please choose a different one.",
  "form_password_length_too_short": "Password must be at least 8 characters.",
  "form_password_validation_failed": "Password doesn't meet the security requirements.",
  "form_param_nil": "Please fill in all required fields.",
  
  // Sign-in errors
  "form_identifier_not_found": "No account found with this email address.",
  "form_password_incorrect": "Incorrect password. Please try again.",
  "strategy_for_user_invalid": "This sign-in method is not available for your account.",
  
  // General errors
  "too_many_requests": "Too many attempts. Please wait a moment and try again.",
  "session_exists": "You are already signed in.",
  "verification_expired": "The verification code has expired. Please request a new one.",
  "verification_failed": "Invalid verification code. Please try again.",
};

/**
 * Get a user-friendly error message from a Clerk error
 */
export function getClerkErrorMessage(errorCode: string, fallback?: string): string {
  return clerkErrorMessages[errorCode] || fallback || "An error occurred. Please try again.";
}








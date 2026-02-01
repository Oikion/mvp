/**
 * AI Tool Types
 *
 * Types for AI tool execution context and responses.
 * These tools receive context directly from the AI executor
 * instead of relying on Clerk session authentication.
 */

import type { AiToolExecutionSource } from "@prisma/client";

/**
 * Context passed to AI tool functions from the executor
 */
export interface AIToolContext {
  organizationId: string;
  userId?: string;
  apiKeyId?: string;
  source: AiToolExecutionSource;
  testMode?: boolean;
}

/**
 * Standard response format for AI tools
 */
export interface AIToolResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Input with tool context merged in
 */
export type AIToolInput<T = Record<string, unknown>> = T & {
  _toolContext?: AIToolContext;
};

/**
 * Extract context from input parameters
 */
export function extractContext(input: AIToolInput): AIToolContext | null {
  const context = input._toolContext;
  if (!context?.organizationId) {
    return null;
  }
  return context;
}

/**
 * Validate that context has required fields
 */
export function validateContext(context: AIToolContext | null): context is AIToolContext {
  return context !== null && typeof context.organizationId === "string";
}

/**
 * Create error response for missing context
 */
export function missingContextError(): AIToolResponse {
  return {
    success: false,
    error: "Missing organization context. Tool cannot execute without organization ID.",
  };
}

/**
 * Create success response
 */
export function successResponse<T>(data: T, message?: string): AIToolResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Create error response
 */
export function errorResponse(error: string): AIToolResponse {
  return {
    success: false,
    error,
  };
}

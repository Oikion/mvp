import { NextResponse } from "next/server";

/**
 * Return a safe error response that hides internal details in production.
 * In development, the full error message is returned for debugging.
 */
export function safeErrorResponse(
  error: unknown,
  status = 500,
  publicMessage = "Internal server error"
): NextResponse {
  // Log the full error server-side regardless of environment
  console.error("[API_ERROR]", error);

  const message =
    process.env.NODE_ENV === "production"
      ? publicMessage
      : error instanceof Error
        ? error.message
        : "Unknown error";

  return NextResponse.json({ error: message }, { status });
}

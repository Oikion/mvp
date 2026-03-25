import { z } from "zod";

// Centralized environment schema to validate required secrets on startup.
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  CLERK_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().optional(),
  ABLY_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  SECRETS_ENCRYPTION_KEY: z.string().length(64).optional(),
  PLATFORM_ENCRYPTION_KEY: z.string().length(64).optional(),
});

/**
 * Validates required environment variables at runtime.
 *
 * @returns Parsed environment values that meet the schema.
 * @throws Error when required variables are missing or invalid.
 * @sideEffects Throws to halt startup when validation fails.
 */
export function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    // Avoid logging secret values while still reporting which keys failed.
    const fieldErrors = parsed.error.flatten().fieldErrors;
    // eslint-disable-next-line no-console
    console.error("Invalid environment variables:", fieldErrors);
    throw new Error("Environment validation failed");
  }

  return parsed.data;
}

/**
 * Ensures environment validation only runs in production.
 *
 * @returns Parsed environment values when validation runs.
 * @sideEffects Throws in production when required variables are missing.
 */
export function ensureEnvValidated() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  validateEnv();
}

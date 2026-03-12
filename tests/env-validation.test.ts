import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { validateEnv, ensureEnvValidated } from "@/lib/env";

const originalEnv = { ...process.env };

describe("validateEnv", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("throws when required variables are missing", () => {
    delete process.env.DATABASE_URL;
    delete process.env.CLERK_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    expect(() => validateEnv()).toThrow("Environment validation failed");
  });

  it("returns parsed env when required variables are present", () => {
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db?sslmode=require";
    process.env.CLERK_SECRET_KEY = "sk_test_valid";
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_valid";

    const parsed = validateEnv();

    expect(parsed.DATABASE_URL).toContain("postgres://");
    expect(parsed.CLERK_SECRET_KEY).toBe("sk_test_valid");
    expect(parsed.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).toBe("pk_test_valid");
  });
});

describe("ensureEnvValidated", () => {
  it("skips validation outside production", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    delete process.env.DATABASE_URL;

    expect(() => ensureEnvValidated()).not.toThrow();
  });

  it("validates env in production", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.DATABASE_URL;

    expect(() => ensureEnvValidated()).toThrow("Environment validation failed");
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac } from "crypto";

describe("verifyOpenSignWebhook", () => {
  const SECRET = "test-secret-abcdef1234567890";
  const PAYLOAD = '{"envelopeId":"env-123","status":"completed"}';

  function makeSignature(payload: string, secret: string): string {
    return createHmac("sha256", secret).update(payload).digest("hex");
  }

  function makeTimestamp(offsetSeconds = 0): string {
    return String(Math.floor(Date.now() / 1000) + offsetSeconds);
  }

  beforeEach(() => {
    vi.stubEnv("OPENSIGN_WEBHOOK_SECRET", SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns true for a valid signature and fresh timestamp", async () => {
    const { verifyOpenSignWebhook } = await import("@/lib/opensign/webhook-verifier");
    const ts = makeTimestamp();
    const sig = makeSignature(PAYLOAD, SECRET);
    expect(verifyOpenSignWebhook(PAYLOAD, sig, ts)).toBe(true);
  });

  it("returns false for an invalid signature", async () => {
    const { verifyOpenSignWebhook } = await import("@/lib/opensign/webhook-verifier");
    const ts = makeTimestamp();
    const sig = makeSignature(PAYLOAD, "wrong-secret");
    expect(verifyOpenSignWebhook(PAYLOAD, sig, ts)).toBe(false);
  });

  it("returns false when signature length does not match expected", async () => {
    const { verifyOpenSignWebhook } = await import("@/lib/opensign/webhook-verifier");
    const ts = makeTimestamp();
    expect(verifyOpenSignWebhook(PAYLOAD, "tooshort", ts)).toBe(false);
  });

  it("returns false for a timestamp more than 5 minutes in the past", async () => {
    const { verifyOpenSignWebhook } = await import("@/lib/opensign/webhook-verifier");
    const ts = makeTimestamp(-301);
    const sig = makeSignature(PAYLOAD, SECRET);
    expect(verifyOpenSignWebhook(PAYLOAD, sig, ts)).toBe(false);
  });

  it("returns false for a timestamp more than 5 minutes in the future", async () => {
    const { verifyOpenSignWebhook } = await import("@/lib/opensign/webhook-verifier");
    const ts = makeTimestamp(301);
    const sig = makeSignature(PAYLOAD, SECRET);
    expect(verifyOpenSignWebhook(PAYLOAD, sig, ts)).toBe(false);
  });

  it("returns false for a non-numeric timestamp", async () => {
    const { verifyOpenSignWebhook } = await import("@/lib/opensign/webhook-verifier");
    const sig = makeSignature(PAYLOAD, SECRET);
    expect(verifyOpenSignWebhook(PAYLOAD, sig, "not-a-number")).toBe(false);
  });

  it("throws if OPENSIGN_WEBHOOK_SECRET env var is not set", async () => {
    vi.unstubAllEnvs();
    const { verifyOpenSignWebhook } = await import("@/lib/opensign/webhook-verifier");
    expect(() =>
      verifyOpenSignWebhook(PAYLOAD, makeSignature(PAYLOAD, SECRET), makeTimestamp())
    ).toThrow("[OPENSIGN_WEBHOOK] OPENSIGN_WEBHOOK_SECRET is not set");
  });
});

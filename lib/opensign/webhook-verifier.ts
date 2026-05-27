import { createHmac, timingSafeEqual } from "crypto";

export function verifyOpenSignWebhook(
  payload: string,
  signature: string,
  timestamp: string,
): boolean {
  if (!process.env.OPENSIGN_WEBHOOK_SECRET) {
    throw new Error("[OPENSIGN_WEBHOOK] OPENSIGN_WEBHOOK_SECRET is not set");
  }

  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const expected = createHmac("sha256", process.env.OPENSIGN_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  // Decode hex → raw bytes before comparing (matches lib/app-access.ts pattern).
  // Buffer.from(hexStr) would interpret chars as UTF-8 (64 bytes for SHA-256 hex),
  // making timingSafeEqual compare ASCII representations rather than raw digest bytes.
  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expected, "hex");

  if (sigBuf.length !== expBuf.length) return false;

  return timingSafeEqual(sigBuf, expBuf);
}

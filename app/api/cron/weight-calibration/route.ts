import { NextResponse } from "next/server";
import { timingSafeEqual, createHmac } from "crypto";

export const dynamic = "force-dynamic";

// Hash both sides to a fixed 32-byte digest so timingSafeEqual always runs
// regardless of token length, preventing a timing side-channel on secret length.
const _HMAC_KEY = Buffer.alloc(32);
function verifyAuthToken(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const a = createHmac("sha256", _HMAC_KEY).update(`Bearer ${expected}`).digest();
  const b = createHmac("sha256", _HMAC_KEY).update(provided).digest();
  return timingSafeEqual(a, b);
}

export async function GET(req: Request): Promise<NextResponse> {
  if (!verifyAuthToken(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    message: "Weight calibration not yet implemented",
    timestamp: new Date().toISOString(),
  });
}

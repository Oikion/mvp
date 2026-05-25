import { NextResponse } from "next/server";
import { timingSafeEqual, createHmac } from "crypto";
import { startCronExecution, completeCronExecution, failCronExecution } from "@/lib/cron-execution";

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

  const cronLogId = await startCronExecution("weight-calibration");

  try {
    // Weight calibration is not yet implemented
    await completeCronExecution(cronLogId, { message: "not yet implemented" });
    return NextResponse.json({
      ok: true,
      message: "Weight calibration not yet implemented",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[CRON_WEIGHT_CALIBRATION] Fatal error:", err);
    await failCronExecution(cronLogId, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { renewExpiringWatchChannels } from "@/lib/google-calendar/watch-manager";

function verifyAuthToken(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const expectedBuffer = Buffer.from(`Bearer ${expected}`);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!verifyAuthToken(authHeader, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await renewExpiringWatchChannels();

  console.log(`[CRON_GCAL_WATCH] Renewed ${result.renewed} channels, ${result.failed} failed`);
  return NextResponse.json({ ...result, ok: true });
}

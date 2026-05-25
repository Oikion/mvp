import { NextRequest, NextResponse } from "next/server";
import { renewExpiringWatchChannels } from "@/lib/google-calendar/watch-manager";
import { verifyAuthToken } from "@/lib/cron-auth";
import { startCronExecution, completeCronExecution, failCronExecution } from "@/lib/cron-execution";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!verifyAuthToken(authHeader, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cronLogId = await startCronExecution("google-calendar-watch");

  try {
    const result = await renewExpiringWatchChannels();

    console.log(`[CRON_GCAL_WATCH] Renewed ${result.renewed} channels, ${result.failed} failed`);
    await completeCronExecution(cronLogId, { renewed: result.renewed, failed: result.failed });
    return NextResponse.json({ ...result, ok: true });
  } catch (err) {
    console.error("[CRON_GCAL_WATCH] Fatal error:", err);
    await failCronExecution(cronLogId, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

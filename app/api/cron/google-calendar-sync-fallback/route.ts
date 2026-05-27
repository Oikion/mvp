import { NextRequest, NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/cron-auth";
import { syncAllEventsFromGoogle } from "@/lib/google-calendar/sync-from-google";
import { startCronExecution, completeCronExecution, failCronExecution } from "@/lib/cron-execution";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!verifyAuthToken(authHeader, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cronLogId = await startCronExecution("google-calendar-sync-fallback");

  try {
    const connections = await prismadb.userGoogleCalendarConnection.findMany({
      where: {
        status: "ACTIVE",
        syncEnabled: true,
      },
      select: { userId: true, organizationId: true },
    });

    let synced = 0;
    let errors = 0;

    for (const { userId, organizationId } of connections) {
      try {
        const result = await syncAllEventsFromGoogle(userId, organizationId);
        synced += result?.synced ?? 0;
      } catch (err) {
        console.error("[GCAL_FALLBACK_SYNC] Failed for user", userId, err);
        errors++;
      }
    }

    await completeCronExecution(cronLogId, { synced, errors, total: connections.length });

    return NextResponse.json({ ok: true, synced, errors, total: connections.length });
  } catch (err) {
    console.error("[GCAL_FALLBACK_SYNC] Fatal error:", err);
    await failCronExecution(cronLogId, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

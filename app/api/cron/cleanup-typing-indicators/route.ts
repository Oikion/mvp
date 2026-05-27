import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/cron-auth";
import { startCronExecution, completeCronExecution, failCronExecution } from "@/lib/cron-execution";

/**
 * Cron endpoint to delete expired TypingIndicator rows.
 *
 * TypingIndicator rows are created with expiresAt = now + 5 s.
 * Nothing else clears them, so without this job they accumulate indefinitely.
 *
 * Schedule: every 5 minutes (configured in vercel.json)
 */
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: Request) {
  // Verify cron authorization
  const authHeader = req.headers.get("authorization");
  if (!verifyAuthToken(authHeader, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cronLogId = await startCronExecution("cleanup-typing-indicators");

  try {
    const result = await prismadb.typingIndicator.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    console.log(`[CRON_TYPING_INDICATORS] Deleted ${result.count} expired rows`);

    await completeCronExecution(cronLogId, { deleted: result.count });
    return NextResponse.json({
      success: true,
      deleted: result.count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to clean up typing indicators";
    console.error("[CRON_TYPING_INDICATORS]", error);
    await failCronExecution(cronLogId, error);
    return NextResponse.json(
      { error: errorMessage, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getUpcomingReminders, sendReminderNotification } from "@/lib/calendar-reminders";
import { prismadb } from "@/lib/prisma";
import { timingSafeEqual } from "crypto";

/**
 * Timing-safe comparison for cron authentication tokens
 * Prevents timing attacks that could leak the secret
 */
function verifyAuthToken(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  
  const expectedBuffer = Buffer.from(`Bearer ${expected}`);
  const providedBuffer = Buffer.from(provided);
  
  // Must be same length for timingSafeEqual
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }
  
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

/**
 * Cron endpoint to process pending reminders
 * Should be called periodically (e.g., every 5 minutes)
 * Configure in vercel.json or your cron service
 */
export async function GET(req: Request) {
  try {
    // Verify this is a cron request using timing-safe comparison
    const authHeader = req.headers.get("authorization");
    if (!verifyAuthToken(authHeader, process.env.CRON_SECRET)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all organizations (or you could process one at a time)
    const organizations = await prismadb.myAccount.findMany({
      select: {
        organizationId: true,
      },
      distinct: ["organizationId"],
    });

    let totalProcessed = 0;
    let totalSent = 0;
    let totalFailed = 0;

    for (const org of organizations) {
      try {
        // Get upcoming reminders for this organization
        const reminders = await getUpcomingReminders(org.organizationId, 5);

        for (const reminder of reminders) {
          try {
            totalProcessed++;
            await sendReminderNotification(reminder.id);
            totalSent++;
          } catch {
            totalFailed++;
          }
        }
      } catch {
        // Continue processing other organizations
      }
    }

    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      sent: totalSent,
      failed: totalFailed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to process reminders";
    return NextResponse.json(
      {
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}











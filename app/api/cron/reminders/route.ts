import { NextResponse } from "next/server";
import { getUpcomingReminders, sendReminderNotification } from "@/lib/calendar-reminders";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";

/**
 * Cron endpoint to process pending reminders
 * Should be called periodically (e.g., every 5 minutes)
 * Configure in vercel.json or your cron service
 */
export async function GET(req: Request) {
  try {
    // Verify this is a cron request (add auth header check if needed)
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
          } catch (error) {
            console.error(
              `[CRON_REMINDERS] Failed to send reminder ${reminder.id}:`,
              error
            );
            totalFailed++;
          }
        }
      } catch (error) {
        console.error(
          `[CRON_REMINDERS] Error processing org ${org.organizationId}:`,
          error
        );
      }
    }

    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      sent: totalSent,
      failed: totalFailed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[CRON_REMINDERS]", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to process reminders",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}









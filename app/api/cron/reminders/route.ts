import { NextResponse } from "next/server";
import { getUpcomingReminders, sendReminderNotification } from "@/lib/calendar-reminders";
import { prismadb } from "@/lib/prisma";
import { timingSafeEqual } from "crypto";
import { runDataDeletion } from "@/lib/data-deletion/execute-deletion";
import resendHelper from "@/lib/resend";
import { render } from "@react-email/render";
import { DeletionReminderEmail } from "@/emails/data-control/DeletionReminderEmail";

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

async function processPendingDeletions(): Promise<{
  reminders: number;
  executed: number;
  failed: number;
}> {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Admin gate: set DELETION_REQUIRE_ADMIN_APPROVAL=false to auto-execute without approval
  const requireApproval = process.env.DELETION_REQUIRE_ADMIN_APPROVAL !== "false";
  const eligibleStatuses: ("APPROVED" | "PENDING")[] = requireApproval
    ? ["APPROVED"]
    : ["APPROVED", "PENDING"];

  let reminders = 0;
  let executed = 0;
  let failed = 0;

  // --- 3-day reminders ---
  const dueForReminder = await prismadb.dataDeletionRequest.findMany({
    where: {
      status: { in: ["PENDING", "APPROVED"] },
      gracePeriodEndsAt: {
        gt: now,
        lte: threeDaysFromNow,
      },
      reminderSentAt: null,
    },
  });

  for (const request of dueForReminder) {
    try {
      const user = await prismadb.users.findUnique({
        where: { id: request.requestedById },
        select: { email: true, name: true, userTheme: true },
      });

      if (user?.email && request.gracePeriodEndsAt) {
        const resend = await resendHelper();
        const html = await render(
          DeletionReminderEmail({
            userName: user.name || user.email,
            deletionDate: request.gracePeriodEndsAt.toISOString(),
            requestId: request.id,
            canCancel: request.status === "PENDING",
            userTheme: user.userTheme ?? "estate",
          })
        );

        await resend.emails.send({
          from: "Oikion <noreply@oikion.app>",
          to: user.email,
          subject: "Your data will be deleted in 3 days",
          html,
        });
      }

      await prismadb.dataDeletionRequest.update({
        where: { id: request.id },
        data: { reminderSentAt: now },
      });

      reminders++;
    } catch (err) {
      console.error("[CRON_DELETION] Reminder failed for:", request.id, err);
      failed++;
    }
  }

  // --- Auto-execution ---
  const dueForExecution = await prismadb.dataDeletionRequest.findMany({
    where: {
      status: { in: eligibleStatuses },
      gracePeriodEndsAt: { lte: now },
    },
  });

  for (const request of dueForExecution) {
    try {
      const result = await runDataDeletion(request.id);
      if (result.success) {
        executed++;
        console.log("[CRON_DELETION] Executed deletion for request:", request.id);
      } else {
        failed++;
        console.error("[CRON_DELETION] Execution failed for:", request.id, result.error);
      }
    } catch (err) {
      failed++;
      console.error("[CRON_DELETION] Unhandled error for:", request.id, err);
    }
  }

  return { reminders, executed, failed };
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

    const deletionStats = await processPendingDeletions();

    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      sent: totalSent,
      failed: totalFailed,
      deletions: deletionStats,
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











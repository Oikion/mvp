/**
 * GET /api/notifications/unsubscribe?token={token}&category={category}
 *
 * Token-based one-click unsubscribe endpoint — no auth required.
 * Opened directly from email links; always redirects, never returns JSON.
 *
 * - If `category` is provided: disables that email-preference field for the user
 *   and redirects to the notification preferences page.
 * - If `category` is omitted: redirects to the notification preferences page
 *   (lets the user manage all categories themselves).
 * - If the token is missing or invalid: redirects to the root.
 */

import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { prismadb } from "@/lib/prisma";

/**
 * Maps a preference category slug (used in the URL) to the boolean field name
 * on `UserNotificationSettings` that controls email delivery for that category.
 *
 * These slugs must match the `PreferenceCategory` values in email-service.ts.
 */
const CATEGORY_TO_FIELD: Record<string, string> = {
  social: "socialEmailEnabled",
  crm: "crmEmailEnabled",
  calendar: "calendarEmailEnabled",
  tasks: "tasksEmailEnabled",
  deals: "dealsEmailEnabled",
  documents: "documentsEmailEnabled",
  system: "systemEmailEnabled",
};

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const category = request.nextUrl.searchParams.get("category");

  if (!token) {
    redirect("/");
  }

  let settings;
  try {
    settings = await prismadb.userNotificationSettings.findUnique({
      where: { unsubscribeToken: token },
    });
  } catch (err) {
    console.error("[NOTIFICATIONS_UNSUBSCRIBE] DB lookup failed:", err);
    redirect("/");
  }

  if (!settings) {
    // Invalid or expired token — redirect to root silently
    redirect("/");
  }

  // If a specific category was supplied, disable that email preference
  if (category) {
    const field = CATEGORY_TO_FIELD[category];
    if (field) {
      try {
        await prismadb.userNotificationSettings.update({
          where: { id: settings.id },
          data: { [field]: false },
        });
      } catch (err) {
        console.error("[NOTIFICATIONS_UNSUBSCRIBE] Failed to update preference:", err);
        // Don't block the redirect — the user should still land somewhere sensible
      }
    }
  }

  // Send the user to the notification preferences page so they can review or
  // re-enable categories if they unsubscribed by mistake
  redirect("/app/profile/notifications");
}

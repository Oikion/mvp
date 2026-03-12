/**
 * lib/admin-notify.ts
 *
 * Shared utility for notifying platform admins by email.
 * Called from: data deletion OTP verification, feedback submissions.
 *
 * To add in-app notifications in the future:
 * query `users` by PLATFORM_ADMIN_EMAILS, find their org IDs, call createNotification().
 */

import resendHelper from "@/lib/resend";

/**
 * Send an email to all addresses listed in PLATFORM_ADMIN_EMAILS.
 * Silently no-ops if the env var is not set.
 */
export async function notifyAdminsByEmail(params: {
  subject: string;
  html: string;
}): Promise<void> {
  const rawEmails = process.env.PLATFORM_ADMIN_EMAILS;
  if (!rawEmails) return;

  const adminEmails = rawEmails
    .replace(/"/g, "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (adminEmails.length === 0) return;

  try {
    const resend = await resendHelper();
    await Promise.all(
      adminEmails.map((to) =>
        resend.emails.send({
          from: "Oikion <noreply@oikion.app>",
          to,
          subject: params.subject,
          html: params.html,
        })
      )
    );
  } catch (error) {
    // Log but never throw — admin notification failure must not block user actions
    console.error("[ADMIN_NOTIFY] Failed to send admin email:", error);
  }
}

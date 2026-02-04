"use server";

import { prismadb } from "@/lib/prisma";
import resendHelper from "@/lib/resend";

export async function denyReferrer(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user details
    const user = await prismadb.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        referralApplicationStatus: true,
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Update user status
    await prismadb.users.update({
      where: { id: userId },
      data: {
        referralApplicationStatus: "DENIED",
      },
    });

    // Send denial notification email to user
    const resend = await resendHelper();

    await resend.emails.send({
      from: process.env.EMAIL_FROM || "Oikion <mail@oikion.com>",
      to: user.email,
      subject: "Update on Your Referral Programme Application",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #18181b; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Oikion</h1>
            <p style="color: #a1a1aa; margin: 4px 0 0 0; font-size: 14px;">Real Estate, Reimagined</p>
          </div>
          <div style="padding: 32px; background: white; border: 1px solid #e4e4e7; border-top: none;">
            <h2 style="color: #18181b; margin: 0 0 16px 0;">Referral Programme Application Update</h2>
            <p style="color: #52525b;">Dear ${user.name || "User"},</p>
            <p style="color: #52525b;">Thank you for your interest in joining our Referral Programme.</p>
            <p style="color: #52525b;">After careful review, we regret to inform you that we are unable to approve your application at this time.</p>
            <p style="color: #52525b;">If you have any questions or would like more information, please don't hesitate to contact our support team.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="mailto:support@oikion.com" style="display: inline-block; background: #18181b; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Contact Support</a>
            </div>
          </div>
          <div style="padding: 16px; background: #f4f4f5; text-align: center; border-radius: 0 0 12px 12px;">
            <p style="margin: 0; color: #71717a; font-size: 12px;">&copy; ${new Date().getFullYear()} Oikion. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to deny referrer:", error);
    return { success: false, error: "Failed to deny referrer" };
  }
}

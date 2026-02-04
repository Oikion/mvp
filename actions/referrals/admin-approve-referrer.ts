"use server";

import { prismadb } from "@/lib/prisma";
import { createReferralCode, formatReferralUrl } from "@/lib/referrals/create-referral-code";
import resendHelper from "@/lib/resend";

export async function approveReferrer(
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
        ReferralCode: true,
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (user.ReferralCode) {
      return { success: false, error: "User already has a referral code" };
    }

    // Generate a unique referral code
    let code = createReferralCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const existing = await prismadb.referralCode.findUnique({
        where: { code },
      });

      if (!existing) {
        break;
      }

      code = createReferralCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return { success: false, error: "Failed to generate unique referral code" };
    }

    // Update user status and create referral code in a transaction
    await prismadb.$transaction([
      prismadb.users.update({
        where: { id: userId },
        data: {
          referralApplicationStatus: "APPROVED",
        },
      }),
      prismadb.referralCode.create({
        data: {
          userId,
          code,
          commissionRate: 5, // 5% as mentioned in the promo
          isActive: true,
        },
      }),
    ]);

    // Send approval notification email to user
    const resend = await resendHelper();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";
    const referralUrl = formatReferralUrl(code);

    await resend.emails.send({
      from: process.env.EMAIL_FROM || "Oikion <mail@oikion.com>",
      to: user.email,
      subject: "Your Referral Programme Application Has Been Approved!",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #18181b; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Oikion</h1>
            <p style="color: #a1a1aa; margin: 4px 0 0 0; font-size: 14px;">Real Estate, Reimagined</p>
          </div>
          <div style="padding: 32px; background: white; border: 1px solid #e4e4e7; border-top: none;">
            <h2 style="color: #18181b; margin: 0 0 16px 0;">Welcome to the Referral Programme!</h2>
            <p style="color: #52525b;">Dear ${user.name || "User"},</p>
            <p style="color: #52525b;">Great news! Your application to join our Referral Programme has been approved.</p>
            <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <p style="margin: 0 0 8px 0; color: #71717a; font-size: 14px;">Your Referral Code:</p>
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #18181b; font-family: monospace;">${code}</p>
            </div>
            <p style="color: #52525b;">You can now start sharing your unique referral code and earn <strong>5% commission</strong> on all subscriptions from users you refer.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${baseUrl}/app/profile?tab=referrals" style="display: inline-block; background: #18181b; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Your Referral Dashboard</a>
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
    console.error("Failed to approve referrer:", error);
    return { success: false, error: "Failed to approve referrer" };
  }
}

"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import resendHelper from "@/lib/resend";
import { ReferralApplicationEmail } from "@/emails/admin/ReferralApplication";
import crypto from "crypto";
import { requireAction } from "@/lib/permissions/action-guards";

const ADMIN_EMAIL = "contact@oikion.com";
const TOKEN_SECRET = process.env.REFERRAL_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || "fallback-secret";

interface ApplyToReferralProgrammeInput {
  name: string;
  email: string;
  message: string;
}

// Generate a signed token for secure approve/deny links
function generateActionToken(userId: string, action: "approve" | "deny"): string {
  const payload = `${userId}:${action}:${Date.now()}`;
  const signature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(payload)
    .digest("hex");
  const token = Buffer.from(`${payload}:${signature}`).toString("base64url");
  return token;
}

export async function applyToReferralProgramme(
  input: ApplyToReferralProgrammeInput
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check permission to apply to referral programme
    const guard = await requireAction("referral:apply");
    if (guard) return { success: false, error: guard.error };

    const user = await getCurrentUser();

    // Check if user already has an application or is already a referrer
    const existingUser = await prismadb.users.findUnique({
      where: { id: user.id },
      select: {
        referralApplicationStatus: true,
        ReferralCode: true,
      },
    });

    if (existingUser?.ReferralCode) {
      return { success: false, error: "You are already a referrer" };
    }

    if (existingUser?.referralApplicationStatus === "PENDING") {
      return { success: false, error: "You already have a pending application" };
    }

    if (existingUser?.referralApplicationStatus === "APPROVED") {
      return { success: false, error: "Your application has already been approved" };
    }

    // Update user's application status
    await prismadb.users.update({
      where: { id: user.id },
      data: {
        referralApplicationStatus: "PENDING",
      },
    });

    // Generate secure tokens for approve/deny actions
    const approveToken = generateActionToken(user.id, "approve");
    const denyToken = generateActionToken(user.id, "deny");

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";
    const approveUrl = `${baseUrl}/api/referral/approve/${approveToken}`;
    const denyUrl = `${baseUrl}/api/referral/deny/${denyToken}`;

    // Send email to admin
    const resend = await resendHelper();
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "Oikion <mail@oikion.com>",
      to: ADMIN_EMAIL,
      subject: `New Referral Programme Application - ${input.name}`,
      react: ReferralApplicationEmail({
        applicantName: input.name,
        applicantEmail: input.email,
        message: input.message,
        userId: user.id,
        approveUrl,
        denyUrl,
      }),
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to apply to referral programme:", error);
    return { success: false, error: "Failed to submit application" };
  }
}

// Verify and decode action token
export async function verifyActionToken(
  token: string
): Promise<{ valid: boolean; userId?: string; action?: "approve" | "deny" }> {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const parts = decoded.split(":");

    if (parts.length !== 4) {
      return { valid: false };
    }

    const [userId, action, timestamp, signature] = parts;

    // Verify signature
    const payload = `${userId}:${action}:${timestamp}`;
    const expectedSignature = crypto
      .createHmac("sha256", TOKEN_SECRET)
      .update(payload)
      .digest("hex");

    if (signature !== expectedSignature) {
      return { valid: false };
    }

    // Check if token is not too old (7 days)
    const tokenAge = Date.now() - parseInt(timestamp);
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (tokenAge > maxAge) {
      return { valid: false };
    }

    if (action !== "approve" && action !== "deny") {
      return { valid: false };
    }

    return { valid: true, userId, action };
  } catch {
    return { valid: false };
  }
}

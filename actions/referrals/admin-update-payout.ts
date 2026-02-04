"use server";

import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin";
import { PayoutStatus } from "@prisma/client";

export interface CreatePayoutInput {
  referralId: string;
  amount: number;
  notes?: string;
}

export interface UpdatePayoutInput {
  payoutId: string;
  status: PayoutStatus;
  notes?: string;
}

/**
 * Create a new payout record for a referral
 * This is used when admin logs income for a referred user
 */
export async function adminCreatePayout(input: CreatePayoutInput): Promise<{
  success: boolean;
  payoutId?: string;
  error?: string;
}> {
  const admin = await requirePlatformAdmin();

  try {
    const { referralId, amount, notes } = input;

    // Verify referral exists
    const referral = await prismadb.referral.findUnique({
      where: { id: referralId },
      include: {
        referralCode: true,
      },
    });

    if (!referral) {
      return { success: false, error: "Referral not found" };
    }

    // Calculate commission based on the referrer's commission rate
    const commissionRate = Number(referral.referralCode.commissionRate);
    const commissionAmount = (amount * commissionRate) / 100;

    // Create payout record
    const payout = await prismadb.referralPayout.create({
      data: {
        referralId,
        amount: commissionAmount,
        status: "PENDING",
        notes,
      },
    });

    // Update referral total earnings
    await prismadb.referral.update({
      where: { id: referralId },
      data: {
        totalEarnings: {
          increment: commissionAmount,
        },
        // Also mark as converted if it was pending
        ...(referral.status === "PENDING" && {
          status: "CONVERTED",
          convertedAt: new Date(),
        }),
      },
    });

    await logAdminAction(admin.clerkId, "WARN_USER", referralId, {
      action: "CREATE_REFERRAL_PAYOUT",
      amount: commissionAmount,
      originalAmount: amount,
      commissionRate,
    });

    return { success: true, payoutId: payout.id };
  } catch (error) {
    console.error("[ADMIN_CREATE_PAYOUT]", error);
    return { success: false, error: "Failed to create payout" };
  }
}

/**
 * Update payout status (mark as paid, processing, etc.)
 */
export async function adminUpdatePayoutStatus(input: UpdatePayoutInput): Promise<{
  success: boolean;
  error?: string;
}> {
  const admin = await requirePlatformAdmin();

  try {
    const { payoutId, status, notes } = input;

    // Verify payout exists
    const payout = await prismadb.referralPayout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      return { success: false, error: "Payout not found" };
    }

    // Update payout
    await prismadb.referralPayout.update({
      where: { id: payoutId },
      data: {
        status,
        ...(status === "PAID" && { paidAt: new Date(), paidByAdminId: admin.clerkId }),
        ...(notes && { notes }),
      },
    });

    await logAdminAction(admin.clerkId, "WARN_USER", payoutId, {
      action: "UPDATE_PAYOUT_STATUS",
      newStatus: status,
      previousStatus: payout.status,
    });

    return { success: true };
  } catch (error) {
    console.error("[ADMIN_UPDATE_PAYOUT_STATUS]", error);
    return { success: false, error: "Failed to update payout status" };
  }
}

/**
 * Bulk update payout statuses
 */
export async function adminBulkUpdatePayouts(
  payoutIds: string[],
  status: PayoutStatus
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
  const admin = await requirePlatformAdmin();

  try {
    const result = await prismadb.referralPayout.updateMany({
      where: { id: { in: payoutIds } },
      data: {
        status,
        ...(status === "PAID" && { paidAt: new Date(), paidByAdminId: admin.clerkId }),
      },
    });

    await logAdminAction(admin.clerkId, "WARN_USER", undefined, {
      action: "BULK_UPDATE_PAYOUTS",
      payoutIds,
      newStatus: status,
      updatedCount: result.count,
    });

    return { success: true, updatedCount: result.count };
  } catch (error) {
    console.error("[ADMIN_BULK_UPDATE_PAYOUTS]", error);
    return { success: false, updatedCount: 0, error: "Failed to update payouts" };
  }
}

/**
 * Delete a payout record
 * This also decrements the referral's total earnings
 */
export async function adminDeletePayout(payoutId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const admin = await requirePlatformAdmin();

  try {
    // Get payout details first
    const payout = await prismadb.referralPayout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      return { success: false, error: "Payout not found" };
    }

    // Delete the payout
    await prismadb.referralPayout.delete({
      where: { id: payoutId },
    });

    // Decrement total earnings
    await prismadb.referral.update({
      where: { id: payout.referralId },
      data: {
        totalEarnings: {
          decrement: payout.amount,
        },
      },
    });

    await logAdminAction(admin.clerkId, "DELETE_USER", payoutId, {
      action: "DELETE_PAYOUT",
      amount: Number(payout.amount),
      referralId: payout.referralId,
    });

    return { success: true };
  } catch (error) {
    console.error("[ADMIN_DELETE_PAYOUT]", error);
    return { success: false, error: "Failed to delete payout" };
  }
}

"use server";

import { requirePlatformAdmin } from "@/lib/platform-admin";
import { prismadb } from "@/lib/prisma";

export interface AdminCounts {
  pendingDeletions: number;
  pendingFeedback: number;
}

/**
 * Returns counts for platform admin sidebar badges.
 * pendingDeletions: PENDING status (awaiting admin approval)
 * pendingFeedback: "pending" status feedback items
 */
export async function getPlatformAdminCounts(): Promise<AdminCounts> {
  try {
    await requirePlatformAdmin();

    const [pendingDeletions, pendingFeedback] = await Promise.all([
      prismadb.dataDeletionRequest.count({
        where: { status: "PENDING" },
      }),
      prismadb.feedback.count({
        where: { status: "pending" },
      }),
    ]);

    return { pendingDeletions, pendingFeedback };
  } catch {
    // Return zero counts on error — never break the layout
    return { pendingDeletions: 0, pendingFeedback: 0 };
  }
}

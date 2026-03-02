"use server";

import { requireAuth } from "@/lib/permissions/action-guards";
import { getCurrentUserId } from "@/lib/get-current-user";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";
import { prismadb } from "@/lib/prisma";
import { createClerkClient } from "@clerk/backend";
import { auth } from "@clerk/nextjs/server";

/**
 * Disable the current user's account
 * - Sets userStatus to DISABLED
 * - Revokes all sessions via Clerk
 * - Retains data for potential re-enable
 */
export async function disableAccount(): Promise<ActionResponse<void>> {
  const guard = await requireAuth();
  if (guard) return guard;

  const userId = await getCurrentUserId();
  const { sessionId } = await auth();

  try {
    // Update user status in database
    await prismadb.users.update({
      where: { id: userId },
      data: { userStatus: "INACTIVE" },
    });

    // Revoke all sessions via Clerk (except current to allow redirect)
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const user = await prismadb.users.findUnique({
      where: { id: userId },
      select: { clerkUserId: true },
    });

    if (user?.clerkUserId) {
      // Get all sessions for this user
      const sessions = await clerk.sessions.getSessionList({
        userId: user.clerkUserId,
      });

      // Revoke all sessions except the current one
      for (const session of sessions.data) {
        if (session.id !== sessionId && session.status === "active") {
          try {
            await clerk.sessions.revokeSession(session.id);
          } catch (_e) {
            // Session may already be revoked
            console.warn("[DISABLE_ACCOUNT] Failed to revoke session:", session.id);
          }
        }
      }
    }

    console.log("[DISABLE_ACCOUNT] Account disabled:", userId);

    return actionSuccess();
  } catch (error) {
    console.error("[DISABLE_ACCOUNT]", error);
    return actionError("Failed to disable account", error);
  }
}

/**
 * Re-enable a disabled account (for admin use)
 */
export async function enableAccount(targetUserId: string): Promise<ActionResponse<void>> {
  const guard = await requireAuth();
  if (guard) return guard;

  try {
    await prismadb.users.update({
      where: { id: targetUserId },
      data: { userStatus: "ACTIVE" },
    });

    console.log("[ENABLE_ACCOUNT] Account enabled:", targetUserId);

    return actionSuccess();
  } catch (error) {
    console.error("[ENABLE_ACCOUNT]", error);
    return actionError("Failed to enable account", error);
  }
}

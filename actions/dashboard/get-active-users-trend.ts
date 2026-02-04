import { getOrgMembersFromDb } from "@/lib/org-members";
import { Users } from "@prisma/client";

interface TrendResult {
  value: number;
  direction: "up" | "down" | "neutral";
}

/**
 * Calculate trend comparing current hour to previous hour for active users
 * Note: This is a simplified calculation. For production, you might want to
 * track user activity timestamps instead of just counting active users.
 */
export const getActiveUsersTrend = async (): Promise<TrendResult> => {
  const { users } = await getOrgMembersFromDb();
  const activeUsers = (users as Users[]).filter((user) => user.userStatus === "ACTIVE");
  const currentCount = activeUsers.length;

  // For now, we'll return a neutral trend since we don't have historical
  // activity data. In production, you'd compare against previous hour/day.
  // This is a placeholder that can be enhanced with actual activity tracking.
  const direction: "up" | "down" | "neutral" = "neutral";
  return {
    value: 0,
    direction,
  };
};












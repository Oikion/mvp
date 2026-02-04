import { prismaForOrg } from "@/lib/tenant";
import { createNotificationsForUsers } from "@/actions/notifications/create-notification";

/**
 * Notify all watchers of an account about changes
 */
export async function notifyAccountWatchers(
  accountId: string,
  organizationId: string,
  type: "ACCOUNT_UPDATED" | "ACCOUNT_DELETED" | "ACCOUNT_TASK_CREATED" | "ACCOUNT_TASK_UPDATED",
  title: string,
  message: string,
  metadata?: Record<string, any>
) {
  try {
    const prismaTenant = prismaForOrg(organizationId);
    
    // Get the account with watchers (watchers is a String[] of user IDs)
    const account = await prismaTenant.clients.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        client_name: true,
        watchers: true,
      },
    });

    if (!account || !account.watchers || account.watchers.length === 0) {
      return;
    }

    const watcherIds = account.watchers;

    // Create notifications for all watchers
    await createNotificationsForUsers(watcherIds, {
      type,
      title,
      message,
      entityType: "ACCOUNT",
      entityId: accountId,
      metadata: {
        accountName: account.client_name,
        ...metadata,
      },
    });
  } catch (error) {
    console.error("[NOTIFY_ACCOUNT_WATCHERS]", error);
    // Don't throw - notifications are non-critical
  }
}




















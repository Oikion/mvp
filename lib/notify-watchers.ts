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
    
    // Get the account with watchers
    const account = await prismaTenant.clients.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        client_name: true,
        watching_users: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!account || !account.watching_users || account.watching_users.length === 0) {
      return;
    }

    const watcherIds = account.watching_users.map((u) => u.id);

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














import { NextResponse } from "next/server";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { prismaForOrg } from "@/lib/tenant";
import { notifyAccountWatchers } from "@/lib/notify-watchers";

export async function DELETE(_req: Request, props: { params: Promise<{ accountId: string }> }) {
  const params = await props.params;
  
  if (!params.accountId) {
    return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
  }

  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const prismaTenant = prismaForOrg(organizationId);

    // Get account info before deleting for notifications
    const account = await prismaTenant.clients.findUnique({
      where: { id: params.accountId },
      select: {
        id: true,
        client_name: true,
        watching_users: {
          select: { id: true },
        },
      },
    });

    await prismaTenant.clients.delete({
      where: {
        id: params.accountId,
      },
    });

    // Notify watchers about the deletion
    if (account && account.watching_users && account.watching_users.length > 0) {
      await notifyAccountWatchers(
        params.accountId,
        organizationId,
        "ACCOUNT_DELETED",
        `Account "${account.client_name}" was deleted`,
        `${user.name || user.email} deleted the account "${account.client_name}"`,
        {
          deletedBy: user.id,
          deletedByName: user.name || user.email,
        }
      );
    }

    return NextResponse.json({ message: "Client deleted" }, { status: 200 });
  } catch (error) {
    return new NextResponse("Initial error", { status: 500 });
  }
}

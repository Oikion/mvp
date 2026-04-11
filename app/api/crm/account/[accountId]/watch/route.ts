import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { NextResponse } from "next/server";

export async function POST(req: Request, props: { params: Promise<{ accountId: string }> }) {
  const params = await props.params;

  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    if (!params.accountId) {
      return new NextResponse("Missing account ID", { status: 400 });
    }

    const accountId = params.accountId;

    // Verify client belongs to user's org before allowing watch
    const client = await prismadb.contact.findFirst({
      where: { id: accountId, organizationId },
      select: { watchers: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const currentWatchers = client.watchers || [];
    if (!currentWatchers.includes(user.id)) {
      await prismadb.contact.update({
        where: { id: accountId },
        data: {
          watchers: [...currentWatchers, user.id],
        },
      });
    }
    return NextResponse.json({ message: "Client watched" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to watch client" }, { status: 500 });
  }
}

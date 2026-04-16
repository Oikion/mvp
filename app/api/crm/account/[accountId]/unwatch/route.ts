// @ts-nocheck
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

    // Verify client belongs to user's org before allowing unwatch
    const client = await prismadb.clients.findFirst({
      where: { id: accountId, organizationId },
      select: { watchers: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const updatedWatchers = (client.watchers || []).filter((id) => id !== user.id);

    await prismadb.clients.update({
      where: { id: accountId },
      data: {
        watchers: updatedWatchers,
      },
    });
    return NextResponse.json({ message: "Client unwatched" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to unwatch client" }, { status: 500 });
  }
}

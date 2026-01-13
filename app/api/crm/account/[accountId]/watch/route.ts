import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { NextResponse } from "next/server";

export async function POST(req: Request, props: { params: Promise<{ accountId: string }> }) {
  const params = await props.params;
  
  try {
    const user = await getCurrentUser();

    if (!params.accountId) {
      return new NextResponse("Missing account ID", { status: 400 });
    }

    const accountId = params.accountId;

    // Get current watchers and add user if not already watching
    const client = await prismadb.clients.findUnique({
      where: { id: accountId },
      select: { watchers: true },
    });
    
    const currentWatchers = client?.watchers || [];
    if (!currentWatchers.includes(user.id)) {
      await prismadb.clients.update({
        where: {
          id: accountId,
        },
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

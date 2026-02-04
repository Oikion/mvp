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

    // Get current watchers and remove user
    const client = await prismadb.clients.findUnique({
      where: { id: accountId },
      select: { watchers: true },
    });
    
    const updatedWatchers = (client?.watchers || []).filter((id) => id !== user.id);
    
    await prismadb.clients.update({
      where: {
        id: accountId,
      },
      data: {
        watchers: updatedWatchers,
      },
    });
    return NextResponse.json({ message: "Client unwatched" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to unwatch client" }, { status: 500 });
  }
}

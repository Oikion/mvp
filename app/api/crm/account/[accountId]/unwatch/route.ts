import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request, props: { params: Promise<{ accountId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  if (!params.accountId) {
    return new NextResponse("Missing account ID", { status: 400 });
  }

  const accountId = params.accountId;

  try {
    await prismadb.clients.update({
      where: {
        id: accountId,
      },
      data: {
        watching_users: {
          disconnect: {
            id: session.user.id,
          },
        },
      },
    });
    return NextResponse.json({ message: "Client unwatched" }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "Failed to unwatch client" }, { status: 500 });
  }
}

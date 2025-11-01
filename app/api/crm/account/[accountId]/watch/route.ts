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

    await prismadb.clients.update({
      where: {
        id: accountId,
      },
      data: {
        watching_users: {
          connect: {
            id: user.id,
          },
        },
      },
    });
    return NextResponse.json({ message: "Client watched" }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "Failed to watch client" }, { status: 500 });
  }
}

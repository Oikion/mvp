import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";

export async function DELETE(req: Request, props: { params: Promise<{ accountId: string }> }) {
  const params = await props.params;
  
  try {
    await getCurrentUser();
    await prismadb.clients.delete({
      where: {
        id: params.accountId,
      },
    });

    return NextResponse.json({ message: "Client deleted" }, { status: 200 });
  } catch (error) {
    console.log("[ACCOUNT_DELETE]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

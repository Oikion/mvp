import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(req: Request, props: { params: Promise<{ moduleId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!session.user?.isAdmin) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    await prismadb.system_Modules_Enabled.delete({
      where: {
        id: params.moduleId,
      },
    });

    return NextResponse.json({ message: "Module deleted successfully" });
  } catch (error) {
    console.log("[MODULE_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

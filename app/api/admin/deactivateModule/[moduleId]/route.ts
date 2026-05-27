import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

export async function POST(req: Request, props: { params: Promise<{ moduleId: string }> }) {
  const params = await props.params;

  try {
    const user = await getCurrentUser();

    if (!user?.is_admin) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const module = await prismadb.system_Modules_Enabled.update({
      where: {
        id: params.moduleId,
      },
      data: {
        enabled: false,
      },
    });

    return NextResponse.json(module);
  } catch (error) {
    console.error("[MODULE_DEACTIVATE_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

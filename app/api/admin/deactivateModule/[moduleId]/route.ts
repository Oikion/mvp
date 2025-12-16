import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

export async function POST(req: Request, props: { params: Promise<{ moduleId: string }> }) {
  const params = await props.params;
  
  try {
    await getCurrentUser();

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
    return new NextResponse("Initial error", { status: 500 });
  }
}

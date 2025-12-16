import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

export async function DELETE(req: Request, props: { params: Promise<{ moduleId: string }> }) {
  const params = await props.params;
  
  try {
    const user = await getCurrentUser();

    if (!user?.is_admin) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    await prismadb.system_Modules_Enabled.delete({
      where: {
        id: params.moduleId,
      },
    });

    return NextResponse.json({ message: "Module deleted successfully" });
  } catch (error) {
    return new NextResponse("Internal error", { status: 500 });
  }
}

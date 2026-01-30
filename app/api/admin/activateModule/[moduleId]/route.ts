import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { requireAction, handleGuardError } from "@/lib/permissions/action-guards";

export async function POST(req: Request, props: { params: Promise<{ moduleId: string }> }) {
  const params = await props.params;
  
  try {
    await getCurrentUser();

    // Check permission to manage org settings (module activation)
    const guard = await requireAction("admin:manage_org_settings");
    if (guard) return handleGuardError(guard);

    const module = await prismadb.system_Modules_Enabled.update({
      where: {
        id: params.moduleId,
      },
      data: {
        enabled: true,
      },
    });

    return NextResponse.json(module);
  } catch (error) {
    return new NextResponse("Initial error", { status: 500 });
  }
}

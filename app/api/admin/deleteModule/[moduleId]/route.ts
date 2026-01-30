import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { requireAction, handleGuardError } from "@/lib/permissions/action-guards";

export async function DELETE(req: Request, props: { params: Promise<{ moduleId: string }> }) {
  const params = await props.params;
  
  try {
    const user = await getCurrentUser();

    // Check both platform admin status and action permission
    if (!user?.is_admin) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    // Also check action-level permission
    const guard = await requireAction("admin:manage_org_settings");
    if (guard) return handleGuardError(guard);

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

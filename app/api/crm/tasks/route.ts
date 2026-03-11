import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { canPerformAction } from "@/lib/permissions/action-service";

export async function DELETE(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();
    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return new NextResponse("Missing task id", { status: 400 });
    }

    const currentTask = await prismadb.crm_Accounts_Tasks.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!currentTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Permission check: Users need task:delete permission with ownership check
    const deleteCheck = await canPerformAction("task:delete", {
      entityType: "task",
      entityId: id,
      ownerId: currentTask.user,
    });
    if (!deleteCheck.allowed) {
      return NextResponse.json({ error: deleteCheck.reason }, { status: 403 });
    }

    await prismadb.crm_Accounts_Tasks_Comments.deleteMany({
      where: {
        crm_account_task: id,
      },
    });

    await prismadb.crm_Accounts_Tasks.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ status: 200 });
  } catch (error) {
    return new NextResponse("Initial error", { status: 500 });
  }
}

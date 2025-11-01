import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

export async function DELETE(req: Request) {
  try {
    await getCurrentUser();
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return new NextResponse("Missing task id", { status: 400 });
    }

    const currentTask = await prismadb.crm_Accounts_Tasks.findUnique({
      where: {
        id,
      },
    });

    await prismadb.tasksComments.deleteMany({
      where: {
        task: id,
      },
    });

    await prismadb.crm_Accounts_Tasks.delete({
      where: {
        id,
      },
    });

    if (!currentTask) {
      return NextResponse.json({ Message: "NO currentTask" }, { status: 200 });
    }

    return NextResponse.json({ status: 200 });
  } catch (error) {
    console.log("[DELETE_CRM_TASK]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

export async function POST(req: Request, props: { params: Promise<{ taskId: string }> }) {
  const params = await props.params;
  
  try {
    const user = await getCurrentUser();
    const { taskId } = params;

    if (!taskId) {
      return new NextResponse("Missing task id", { status: 400 });
    }

    await prismadb.tasks.update({
      where: {
        id: taskId,
      },
      data: {
        taskStatus: "COMPLETE",
        updatedBy: user.id,
      },
    });

    return NextResponse.json({ status: 200 });
  } catch (error) {
    console.log("[MARK_TASK_DONE_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

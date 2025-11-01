import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import NewTaskCommentEmail from "@/emails/NewTaskComment";
import resendHelper from "@/lib/resend";

export async function POST(req: Request, props: { params: Promise<{ taskId: string }> }) {
  const params = await props.params;
  const resend = await resendHelper();
  
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const { comment } = body;
    const { taskId } = params;

    if (!taskId) {
      return new NextResponse("Missing taskId", { status: 400 });
    }

    if (!comment) {
      return new NextResponse("Missing comment", { status: 400 });
    }

    const task = await prismadb.crm_Accounts_Tasks.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return new NextResponse("Task not found", { status: 404 });
    }

    const newComment = await prismadb.tasksComments.create({
      data: {
        v: 0,
        comment: comment,
        task: taskId,
        user: user.id,
      },
    });

    return NextResponse.json(newComment, { status: 200 });
  } catch (error) {
    console.log("[COMMENTS_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

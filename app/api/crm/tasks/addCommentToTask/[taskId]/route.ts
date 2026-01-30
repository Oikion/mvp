import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import NewTaskCommentEmail from "@/emails/NewTaskComment";
import resendHelper from "@/lib/resend";
import { notifyTaskCommented } from "@/lib/notifications";
import { canPerformAction } from "@/lib/permissions/action-service";

export async function POST(req: Request, props: { params: Promise<{ taskId: string }> }) {
  const params = await props.params;
  const resend = await resendHelper();
  
  try {
    // Permission check: Users need task:add_comment permission
    const commentCheck = await canPerformAction("task:add_comment");
    if (!commentCheck.allowed) {
      return NextResponse.json({ error: commentCheck.reason }, { status: 403 });
    }

    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
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
      include: {
        Clients: {
          select: { id: true, client_name: true },
        },
      },
    });

    if (!task) {
      return new NextResponse("Task not found", { status: 404 });
    }

    const newComment = await prismadb.crm_Accounts_Tasks_Comments.create({
      data: {
        id: crypto.randomUUID(),
        comment: comment,
        crm_account_task: taskId,
        user: user.id,
        organizationId,
      },
    });

    // Notify the task assignee about the comment (if not self-commenting)
    if (task.user && task.user !== user.id) {
      await notifyTaskCommented({
        taskId,
        taskTitle: task.title,
        accountId: task.Clients?.id,
        accountName: task.Clients?.client_name,
        actorId: user.id,
        actorName: user.name || user.email || "Someone",
        recipientId: task.user,
        organizationId,
        commentContent: comment,
      });
    }

    return NextResponse.json(newComment, { status: 200 });
  } catch (error) {
    return new NextResponse("Initial error", { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import NewTaskCommentEmail from "@/emails/NewTaskComment";
import resendHelper from "@/lib/resend";
import { notifyTaskCommented } from "@/lib/notifications";
import { canPerformAction } from "@/lib/permissions/action-service";
import { encryptTaskCommentForOrg } from "@/lib/model-encryption";
import { getOrgEncryptionMode } from "@/lib/entity-session/encryption-mode";
import { EncryptionMode } from "@prisma/client";

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
    const organizationId = await getCurrentOrgIdSafe();
    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const { comment } = body;
    const { taskId } = params;

    if (!taskId) {
      return new NextResponse("Missing taskId", { status: 400 });
    }

    if (!comment) {
      return new NextResponse("Missing comment", { status: 400 });
    }

    const task = await prismadb.crm_Accounts_Tasks.findFirst({
      where: { id: taskId, organizationId },
      include: {
        Clients: {
          select: { id: true, client_name: true },
        },
      },
    });

    if (!task) {
      return new NextResponse("Task not found", { status: 404 });
    }

    const encryptionMode = await getOrgEncryptionMode(organizationId);
    const isE2EE = encryptionMode === EncryptionMode.E2EE;

    let commentContent: string;
    let entitySessionId: string | null = null;
    let messageIndex: number | null = null;

    if (isE2EE) {
      // E2EE: content is ciphertext — don't truncate (client validates plaintext length)
      const { entitySessionId: sid, messageIndex: idx } = body;
      if (!sid || idx === undefined) {
        return NextResponse.json(
          { error: "entitySessionId and messageIndex required for E2EE orgs" },
          { status: 400 }
        );
      }
      commentContent = typeof comment === "string" ? comment : String(comment);
      entitySessionId = sid;
      messageIndex = idx;
    } else {
      // Standard: validate length then encrypt server-side
      const rawComment = typeof comment === "string" ? comment : String(comment);
      if (rawComment.length > 2000) {
        return NextResponse.json(
          { error: "Comment is too long (max 2000 characters)" },
          { status: 400 }
        );
      }
      const { comment: encrypted } = await encryptTaskCommentForOrg(
        { comment: rawComment },
        organizationId
      );
      commentContent = encrypted ?? rawComment;
    }

    const newComment = await prismadb.crm_Accounts_Tasks_Comments.create({
      data: {
        id: crypto.randomUUID(),
        comment: commentContent,
        entitySessionId,
        messageIndex,
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
        commentContent: commentContent,
      });
    }

    return NextResponse.json(newComment, { status: 200 });
  } catch (error) {
    return new NextResponse("Initial error", { status: 500 });
  }
}

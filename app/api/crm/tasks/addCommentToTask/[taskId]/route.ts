import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import NewTaskCommentEmail from "@/emails/NewTaskComment";
import resendHelper from "@/lib/resend";
import { notifyTaskCommented } from "@/lib/notifications";
import { canPerformAction } from "@/lib/permissions/action-service";
import { encryptTaskCommentForOrg, decryptTaskCommentForOrg } from "@/lib/model-encryption";
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

      // Validate entitySessionId belongs to this entity
      const sessionOwnership = await prismadb.entitySession.findFirst({
        where: {
          id: sid,
          entityType: "TASK",
          entityId: taskId,
          orgId: organizationId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!sessionOwnership) {
        return NextResponse.json(
          { error: "entitySessionId does not match this entity or is not active" },
          { status: 400 }
        );
      }

      // Validate messageIndex monotonicity
      if (!Number.isInteger(idx) || idx < 0) {
        return NextResponse.json(
          { error: "messageIndex must be a non-negative integer" },
          { status: 400 }
        );
      }

      const updated = await prismadb.entitySession.updateMany({
        where: {
          id: sid,
          OR: [
            { lastMessageIndex: null },
            { lastMessageIndex: { lt: idx } },
          ],
        },
        data: { lastMessageIndex: idx },
      });

      if (updated.count === 0) {
        return NextResponse.json(
          { error: "messageIndex is not monotonically increasing" },
          { status: 400 }
        );
      }

      commentContent = typeof comment === "string" ? comment : String(comment);
      if (!commentContent.includes(":")) {
        return NextResponse.json(
          { error: "Invalid encrypted content format" },
          { status: 400 }
        );
      }
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
        accountId: task.account ?? undefined,
        accountName: undefined,
        actorId: user.id,
        actorName: user.name || user.email || "Someone",
        recipientId: task.user,
        organizationId,
        commentContent: isE2EE ? "[Encrypted message]" : commentContent,
      });
    }

    // Decrypt server-side encryption before returning (Standard mode stores ciphertext)
    const responseComment = isE2EE
      ? newComment
      : await decryptTaskCommentForOrg(newComment, organizationId);

    return NextResponse.json(responseComment, { status: 201 });
  } catch (error) {
    console.error("[TASK_COMMENTS_POST]", error);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}

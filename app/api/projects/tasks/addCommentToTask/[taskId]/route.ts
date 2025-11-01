import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import NewTaskCommentEmail from "@/emails/NewTaskComment";
import resendHelper from "@/lib/resend";

export async function POST(
  req: Request,
  props: { params: Promise<{ taskId: string }> }
) {
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

    const task = await prismadb.tasks.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return new NextResponse("Task not found", { status: 404 });
    }

    if (!task.section) {
      return new NextResponse("Task section not found", { status: 404 });
    }

    const section = await prismadb.sections.findUnique({
      where: { id: task.section },
    });

    if (section) {
      await prismadb.boards.update({
        where: {
          id: section.board,
        },
        data: {
          watchers_users: {
            connect: {
              id: user.id,
            },
          },
        },
      });

      const newComment = await prismadb.tasksComments.create({
        data: {
          v: 0,
          comment: comment,
          task: taskId,
          user: user.id,
        },
      });

      const emailRecipients = await prismadb.users.findMany({
        where: {
          id: {
            not: user.id,
          },
          watching_boardsIDs: {
            has: section.board,
          },
        },
      });

      if (task.createdBy) {
        const taskCreator = await prismadb.users.findUnique({
          where: { id: task.createdBy },
        });
        if (taskCreator) {
          emailRecipients.push(taskCreator);
        }
      }

      for (const userID of emailRecipients) {
        const recipientUser = await prismadb.users.findUnique({
          where: {
            id: userID.id,
          },
        });

        await resend.emails.send({
          from:
            process.env.NEXT_PUBLIC_APP_NAME +
            " <" +
            process.env.EMAIL_FROM +
            ">",
          to: recipientUser?.email!,
          subject:
            user.userLanguage === "en"
              ? `New comment  on task ${task.title}.`
              : `Nový komentář k úkolu ${task.title}.`,
          text: "",
          react: NewTaskCommentEmail({
            commentFromUser: user.name!,
            username: recipientUser?.name!,
            userLanguage: recipientUser?.userLanguage!,
            taskId: task.id,
            comment: comment,
          }),
        });
      }
      return NextResponse.json(newComment, { status: 200 });
    } else {
      const newComment = await prismadb.tasksComments.create({
        data: {
          v: 0,
          comment: comment,
          task: taskId,
          user: user.id,
        },
      });
      return NextResponse.json(newComment, { status: 200 });
    }
  } catch (error) {
    console.log("[COMMENTS_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

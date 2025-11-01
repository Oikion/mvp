import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import NewTaskFromProject from "@/emails/NewTaskFromProject";
import resendHelper from "@/lib/resend";
import UpdatedTaskFromProject from "@/emails/UpdatedTaskFromProject";

export async function PUT(req: Request, props: { params: Promise<{ taskId: string }> }) {
  const params = await props.params;
  const resend = await resendHelper();
  
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const {
      title,
      user: assignedUser,
      board,
      boardId,
      priority,
      content,
      notionUrl,
      dueDateAt,
    } = body;

    const taskId = params.taskId;

    if (!taskId) {
      return new NextResponse("Missing task id", { status: 400 });
    }

    if (!title || !assignedUser || !priority || !content) {
      return new NextResponse("Missing one of the task data ", { status: 400 });
    }

    const sectionId = await prismadb.sections.findFirst({
      where: {
        board: board,
      },
      orderBy: {
        position: "asc",
      },
    });

    if (!sectionId) {
      return new NextResponse("No section found", { status: 400 });
    }

    let contentUpdated = content;

    if (notionUrl) {
      contentUpdated = content + "\n\n" + notionUrl;
    }

    const task = await prismadb.tasks.update({
      where: {
        id: taskId,
      },
      data: {
        priority: priority,
        title: title,
        content: contentUpdated,
        updatedBy: assignedUser,
        dueDateAt: dueDateAt,
        user: assignedUser,
      },
    });

    await prismadb.boards.update({
      where: {
        id: boardId,
      },
      data: {
        updatedAt: new Date(),
      },
    });

    if (assignedUser !== user.id) {
      try {
        const notifyRecipient = await prismadb.users.findUnique({
          where: { id: assignedUser },
        });

        const boardData = await prismadb.boards.findUnique({
          where: { id: boardId },
        });

        await resend.emails.send({
          from:
            process.env.NEXT_PUBLIC_APP_NAME +
            " <" +
            process.env.EMAIL_FROM +
            ">",
          to: notifyRecipient?.email!,
          subject:
            user.userLanguage === "en"
              ? `Task -  ${title} - was updated.`
              : `Úkol - ${title} - byl aktualizován.`,
          text: "",
          react: UpdatedTaskFromProject({
            taskFromUser: user.name!,
            username: notifyRecipient?.name!,
            userLanguage: notifyRecipient?.userLanguage!,
            taskData: task,
            boardData: boardData,
          }),
        });
        console.log("Email sent to user: ", notifyRecipient?.email!);
      } catch (error) {
        console.log(error);
      }
    }

    return NextResponse.json({ status: 200 });
  } catch (error) {
    console.log("[UPDATE_TASK_PUT]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

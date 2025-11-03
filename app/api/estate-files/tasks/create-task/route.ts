import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import NewTaskFromCRMEmail from "@/emails/NewTaskFromCRM";
import NewTaskFromProject from "@/emails/NewTaskFromProject";
import resendHelper from "@/lib/resend";

//Create new task in project route
/*
TODO: there is second route for creating task in board, but it is the same as this one. Consider merging them (/api/estate-files/tasks/create-task/[boardId]). 
*/
export async function POST(req: Request) {
  const resend = await resendHelper();
  
  try {
    const currentUser = await getCurrentUser();
    const body = await req.json();
    const {
      title,
      user,
      board,
      priority,
      content,
      notionUrl,
      account,
      dueDateAt,
    } = body;

    if (!title || !user || !board || !priority || !content) {
      return new NextResponse("Missing one of the task data ", { status: 400 });
    }

    //Get first section from board where position is smallest
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

    const tasksCount = await prismadb.tasks.count({
      where: {
        section: sectionId.id,
      },
    });

    let contentUpdated = content;

    if (notionUrl) {
      contentUpdated = content + "\n\n" + notionUrl;
    }

    const task = await prismadb.tasks.create({
      data: {
        v: 0,
        priority: priority,
        title: title,
        content: contentUpdated,
        dueDateAt: dueDateAt,
        section: sectionId.id,
        createdBy: currentUser.id,
        updatedBy: currentUser.id,
        position: tasksCount > 0 ? tasksCount : 0,
        user: user,
        taskStatus: "ACTIVE",
      },
    });

    //Make update to Board - updatedAt field to trigger re-render and reorder
    await prismadb.boards.update({
      where: {
        id: board,
      },
      data: {
        updatedAt: new Date(),
      },
    });

    // Invalidate cache
    const { invalidateCache } = await import("@/lib/cache-invalidate");
    await invalidateCache([
      "tasks:list",
      "dashboard:tasks-count",
      user ? `user:${user}` : "",
      section ? `task:${task.id}` : "",
    ].filter(Boolean));

    //Notification to user who is not a task creator
    if (user !== currentUser.id) {
      try {
        const notifyRecipient = await prismadb.users.findUnique({
          where: { id: user },
        });

        const boardData = await prismadb.boards.findUnique({
          where: { id: board },
        });

        await resend.emails.send({
          from:
            process.env.NEXT_PUBLIC_APP_NAME +
            " <" +
            process.env.EMAIL_FROM +
            ">",
          to: notifyRecipient?.email!,
          subject:
            currentUser.userLanguage === "en"
              ? `New task -  ${title}.`
              : `Nový úkol - ${title}.`,
          text: "",
          react: NewTaskFromProject({
            taskFromUser: currentUser.name!,
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
    console.log("[NEW_BOARD_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

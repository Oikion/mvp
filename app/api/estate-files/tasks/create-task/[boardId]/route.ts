import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import NewTaskFromProject from "@/emails/NewTaskFromProject";
import resendHelper from "@/lib/resend";

export async function POST(req: Request, props: { params: Promise<{ boardId: string }> }) {
  const params = await props.params;
  const resend = await resendHelper();
  
  try {
    const currentUser = await getCurrentUser();
    const body = await req.json();
    const { boardId } = params;
    const { title, priority, content, section, user, dueDateAt } = body;

    if (!section) {
      return new NextResponse("Missing section id", { status: 400 });
    }

    //This is when user click on "Add new task" button in project board DnD section
    if (!title || !user || !priority || !content) {
      const tasksCount = await prismadb.tasks.count({
        where: {
          section: section,
        },
      });

      await prismadb.tasks.create({
        data: {
          v: 0,
          priority: "normal",
          title: "New task",
          content: "",
          section: section,
          createdBy: currentUser.id,
          updatedBy: currentUser.id,
          position: tasksCount > 0 ? tasksCount : 0,
          user: currentUser.id,
          taskStatus: "ACTIVE",
        },
      });

      //Make update to Board - updatedAt field to trigger re-render and reorder
      await prismadb.boards.update({
        where: {
          id: boardId,
        },
        data: {
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({ status: 200 });
    } else {
      //This is when user click on "Add new task" button in project board page
      const tasksCount = await prismadb.tasks.count({
        where: {
          section: section,
        },
      });

      const task = await prismadb.tasks.create({
        data: {
          v: 0,
          priority: priority,
          title: title,
          content: content,
          dueDateAt: dueDateAt,
          section: section,
          createdBy: user,
          updatedBy: user,
          position: tasksCount > 0 ? tasksCount : 0,
          user: user,
          taskStatus: "ACTIVE",
        },
      });

      //Notification to user who is not a task creator
      if (user !== currentUser.id) {
        try {
          const notifyRecipient = await prismadb.users.findUnique({
            where: { id: user },
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
    }
  } catch (error) {
    console.log("[NEW_TASK_IN_PROJECT_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

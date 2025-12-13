import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import NewTaskFromCRMEmail from "@/emails/NewTaskFromCRM";
import NewTaskFromCRMToWatchersEmail from "@/emails/NewTaskFromCRMToWatchers";
import resendHelper from "@/lib/resend";
import { notifyAccountWatchers } from "@/lib/notify-watchers";
import { generateFriendlyId } from "@/lib/friendly-id";

export async function POST(req: Request) {
  const resend = await resendHelper();
  
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
    const { title, user: assignedUser, priority, content, account, dueDateAt } = body;

    if (!title || !assignedUser || !priority || !content || !account) {
      return new NextResponse("Missing one of the task data ", { status: 400 });
    }

    // Get account name for notifications
    const accountData = await prismadb.clients.findUnique({
      where: { id: account },
      select: { client_name: true },
    });

    // Generate friendly ID
    const taskId = await generateFriendlyId(prismadb, "crm_Accounts_Tasks");

    const task = await prismadb.crm_Accounts_Tasks.create({
      data: {
        id: taskId,
        priority: priority,
        title: title,
        content,
        account,
        dueDateAt,
        createdBy: assignedUser,
        updatedBy: assignedUser,
        user: assignedUser,
      },
    });

    // Create in-app notifications for watchers
    await notifyAccountWatchers(
      account,
      organizationId,
      "ACCOUNT_TASK_CREATED",
      `New task created for "${accountData?.client_name || "Account"}"`,
      `${user.name || user.email} created a new task: "${title}"`,
      {
        taskId: task.id,
        taskTitle: title,
        createdBy: user.id,
        createdByName: user.name || user.email,
      }
    );

    if (assignedUser !== user.id) {
      try {
        const notifyRecipient = await prismadb.users.findUnique({
          where: { id: assignedUser },
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
              ? `New task -  ${title}.`
              : `Nový úkol - ${title}.`,
          text: "",
          react: NewTaskFromCRMEmail({
            taskFromUser: user.name!,
            username: notifyRecipient?.name!,
            userLanguage: notifyRecipient?.userLanguage!,
            taskData: task,
          }),
        });
      } catch (error) {
        console.log(error);
      }
    }

    try {
      const emailRecipients = await prismadb.users.findMany({
        where: {
          id: {
            not: user.id,
          },
          watching_accountsIDs: {
            has: account,
          },
        },
      });
      
      for (const userID of emailRecipients) {
        const recipientUser = await prismadb.users.findUnique({
          where: {
            id: userID.id,
          },
        });
        console.log("Send email to user: ", recipientUser?.email!);
        await resend.emails.send({
          from:
            process.env.NEXT_PUBLIC_APP_NAME +
            " <" +
            process.env.EMAIL_FROM +
            ">",
          to: recipientUser?.email!,
          subject:
            user.userLanguage === "en"
              ? `New task -  ${title}.`
              : `Nový úkol - ${title}.`,
          text: "",
          react: NewTaskFromCRMToWatchersEmail({
            taskFromUser: user.name!,
            username: recipientUser?.name!,
            userLanguage: recipientUser?.userLanguage!,
            taskData: task,
          }),
        });
      }
    } catch (error) {
      console.log(error);
    }

    return NextResponse.json({ status: 200 });
  } catch (error) {
    console.log("[NEW_CRM_TASK_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

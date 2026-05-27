"use server";

import { render } from "@react-email/render";

import { SendMailToAll } from "./schema";
import { InputType, ReturnType } from "./types";

import { prismadb } from "@/lib/prisma";
import resendHelper from "@/lib/resend";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { createSafeAction } from "@/lib/create-safe-action";
import MessageToAllUsers from "@/emails/admin/MessageToAllUser";
import sendEmail from "@/lib/sendmail";
import { EMAIL_CONFIG } from "@/lib/resend-segments";

const handler = async (data: InputType): Promise<ReturnType> => {
  // Only platform admins can send mail to all users
  if (!(await isPlatformAdmin())) {
    return {
      error: "You are not authorized to perform this action.",
    };
  }

  const resend = await resendHelper();

  const { title, message } = data;

  if (!title || !message) {
    return {
      error: "Title and message are required.",
    };
  }

  try {
    const users = await prismadb.users.findMany({
      /*       where: {
        email: {
          //contains: "pavel@softbase.cz",
          equals: "pavel@softbase.cz",
        },
      }, */
    });
    //console.log(users.length, "user.length");

    //For each user, send mail
    for (const user of users) {
      const resendKey = await prismadb.systemServices.findFirst({
        where: {
          name: "resend_smtp",
        },
      });

      if (!resendKey?.serviceKey || !process.env.RESEND_API_KEY) {
        const emailHtml = render(
          MessageToAllUsers({
            title: title,
            message: message,
            username: user?.name!,
            email: user?.email || "",
          })
        );

        //send via sendmail
        await sendEmail({
          from: EMAIL_CONFIG.FROM,
          to: user.email || "delivered@resend.dev",
          subject: title,
          text: message,
          html: await emailHtml,
        });
      }

      //send via Resend.com
      await resend.emails.send({
        from: EMAIL_CONFIG.FROM,
        to: user?.email!,
        subject: title,
        text: message, // Add this line to fix the types issue
        react: MessageToAllUsers({
          title: title,
          message: message,
          username: user?.name!,
          email: user?.email || "",
        }),
      });
    }
  } catch (error) {
    return {
      error: "Failed to send mail to all users.",
    };
  }

  return { data: { title: title, message: message } };
};

export const sendMailToAll = createSafeAction(SendMailToAll, handler);

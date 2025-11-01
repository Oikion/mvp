"use server";

import dayjs from "dayjs";
import axios from "axios";
import { prismadb } from "@/lib/prisma";
import resendHelper from "@/lib/resend";
import AiTasksReportEmail from "@/emails/AiTasksReport";

export async function getUserAiTasks(user: any) {
  const resend = await resendHelper();

  const today = dayjs().startOf("day");
  const nextWeek = dayjs().add(7, "day").startOf("day");

  let prompt = "";

  const dbUser = await prismadb.users.findUnique({
    where: {
      id: user.id,
    },
  });

  if (!dbUser) return { message: "No user found" };

  const getTaskPastDue = await prismadb.tasks.findMany({
    where: {
      AND: [
        {
          user: user.id,
          taskStatus: "ACTIVE",
          dueDateAt: {
            lte: new Date(),
          },
        },
      ],
    },
  });

  const getTaskPastDueInSevenDays = await prismadb.tasks.findMany({
    where: {
      AND: [
        {
          user: user.id,
          taskStatus: "ACTIVE",
          dueDateAt: {
            gt: today.toDate(),
            lt: nextWeek.toDate(),
          },
        },
      ],
    },
  });

  if (!getTaskPastDue || !getTaskPastDueInSevenDays) {
    return { message: "No tasks found" };
  }

  switch (dbUser.userLanguage) {
    case "en":
      prompt = `Hi, Iam ${process.env.NEXT_PUBLIC_APP_URL} API Bot.
      \n\n
      There are ${getTaskPastDue.length} tasks past due and ${
        getTaskPastDueInSevenDays.length
      } tasks due in the next 7 days.
      \n\n
      Details today tasks: ${JSON.stringify(getTaskPastDue, null, 2)}
      \n\n
      Details next 7 days tasks: ${JSON.stringify(
        getTaskPastDueInSevenDays,
        null,
        2
      )}
      \n\n
      As a personal assistant, write a message  to remind tasks and write detail summary. And also do not forget to send them a some positive vibes.
      \n\n
      Final result must be in MDX format.
      `;
      break;
    case "cz":
      prompt = `Jako profesionální asistentka Emma s perfektní znalostí projektového řízení, který má na starosti projekty na adrese${
        process.env.NEXT_PUBLIC_APP_URL
      }, připrave manažerské shrnutí o úkolech včetně jejich detailů a termínů. Vše musí být perfektně česky a výstižně.
      \n\n
      Zde jsou informace k úkolům:
      \n\n
      Informace o projektu: Počet úkolů které jsou k řešení dnes: ${
        getTaskPastDue.length
      }, Počet úkolů, které musí být vyřešeny nejpozději do sedmi dnů: ${
        getTaskPastDueInSevenDays.length
      }.
      \n\n
      Detailní informace v JSON formátu k úkolům, které musí být hotové dnes: ${JSON.stringify(
        getTaskPastDue,
        null,
        2
      )}
      \n\n
      Detailní informace k úkolům, které musí být hotové během následujících sedmi dní: ${JSON.stringify(
        getTaskPastDueInSevenDays,
        null,
        2
      )}
    
      \n\n
      Na konec napiš manažerské shrnutí a přidej odkaz ${
        process.env.NEXT_PUBLIC_APP_URL + "/projects/dashboard"
      } jako odkaz na detail k úkolům . Na konci manažerského shrnutí přidej. 1 tip na manažerskou dovednost z oblasti projektového řízení a timemanagementu, 2-3 věty s pozitivním naladěním a podporou, nakonec popřej hezký pracovní den a infomaci, že tato zpráva byla vygenerována pomocí umělé inteligence OpenAi.
      \n\n
      Finální výsledek musí být v MDX formátu.
      `;
      break;
  }

  if (!prompt) return { message: "No prompt found" };

  const getAiResponse = await axios
    .post(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/openai/create-chat-completion`,
      {
        prompt: prompt,
        userId: user.id,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
    .then((res) => res.data);

  if (getAiResponse.error) {
    console.log("Error from OpenAI API");
  } else {
    try {
      const data = await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: dbUser.email!,
        subject: `${process.env.NEXT_PUBLIC_APP_NAME} OpenAI Project manager assistant from: ${process.env.NEXT_PUBLIC_APP_URL}`,
        text: getAiResponse.response.message.content,
        react: AiTasksReportEmail({
          username: dbUser.name,
          avatar: dbUser.avatar,
          userLanguage: dbUser.userLanguage,
          data: getAiResponse.response.message.content,
        }),
      });
    } catch (error) {
      console.log(error, "Error from get-user-ai-tasks");
    }
  }

  return { user: dbUser.email };
}

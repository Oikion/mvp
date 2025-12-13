import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { generateRandomPassword } from "@/lib/utils";
import { hash } from "bcryptjs";
import InviteUserEmail from "@/emails/InviteUser";
import resendHelper from "@/lib/resend";

export async function POST(req: Request) {
  const resend = await resendHelper();
  
  try {
    const user = await getCurrentUser();
    if (!user.is_admin) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    const body = await req.json();
    const { name, email, language } = body;

    if (!name || !email || !language) {
      return NextResponse.json(
        { error: "Name, Email, and Language is required!" },
        {
          status: 200,
        }
      );
    }

    const password = generateRandomPassword();

    let message = "";

    switch (language) {
      case "en":
        message = `You have been invited to ${process.env.NEXT_PUBLIC_APP_NAME} \n\n Your username is: ${email} \n\n Your password is: ${password} \n\n Please login to ${process.env.NEXT_PUBLIC_APP_URL} \n\n Thank you \n\n ${process.env.NEXT_PUBLIC_APP_NAME}`;
        break;
      case "cz":
        message = `Byl jste pozván do ${process.env.NEXT_PUBLIC_APP_NAME} \n\n Vaše uživatelské jméno je: ${email} \n\n Vaše heslo je: ${password} \n\n Prosím přihlašte se na ${process.env.NEXT_PUBLIC_APP_URL} \n\n Děkujeme \n\n ${process.env.NEXT_PUBLIC_APP_NAME}`;
        break;
      default:
        message = `You have been invited to ${process.env.NEXT_PUBLIC_APP_NAME} \n\n Your username is: ${email} \n\n Your password is: ${password} \n\n Please login to ${process.env.NEXT_PUBLIC_APP_URL} \n\n Thank you \n\n ${process.env.NEXT_PUBLIC_APP_NAME}`;
        break;
    }

    //Check if user already exists in local database
    const checkexisting = await prismadb.users.findFirst({
      where: {
        email: email,
      },
    });

    //If user already exists, return error else create user and send email
    if (checkexisting) {
      return NextResponse.json(
        { error: "User already exist, reset password instead!" },
        {
          status: 200,
        }
      );
    } else {
      // Generate username from email if not provided
      const generatedUsername = email.split("@")[0] || `user_${Date.now()}`;
      
      const newUser = await prismadb.users.create({
        data: {
          id: randomUUID(),
          name,
          username: generatedUsername,
          avatar: "",
          account_name: "",
          is_account_admin: false,
          is_admin: false,
          email,
          userStatus: "ACTIVE",
          userLanguage: language,
          password: await hash(password, 12),
        },
      });

      if (!newUser) {
        return new NextResponse("User not created", { status: 500 });
      }

      const data = await resend.emails.send({
        from:
          process.env.NEXT_PUBLIC_APP_NAME +
          " <" +
          process.env.EMAIL_FROM +
          ">",
        to: newUser.email,
        subject: `You have been invited to ${process.env.NEXT_PUBLIC_APP_NAME} `,
        text: message,
        react: InviteUserEmail({
          invitedByUsername: user?.name! || "admin",
          username: newUser?.name!,
          invitedUserPassword: password,
          userLanguage: language,
        }),
      });

      console.log(data, "data");

      return NextResponse.json(newUser, { status: 200 });
    }
  } catch (error) {
    console.log("[USERACTIVATE_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

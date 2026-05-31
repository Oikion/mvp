import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { requireAtLeastLead } from "@/lib/permissions/guards";
import { isUserInOrg } from "@/lib/org-members";
import sendEmail from "@/lib/sendmail";
import { EMAIL_CONFIG } from "@/lib/resend-segments";

export async function POST(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;

  try {
    // Leads and above can activate users (replaces global is_admin check)
    const denied = await requireAtLeastLead();
    if (denied) return denied;

    // Cross-tenant guard: target must be in the caller's org.
    const organizationId = await getCurrentOrgId();
    if (!(await isUserInOrg(params.userId, organizationId))) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const user = await prismadb.users.update({
      where: {
        id: params.userId,
      },
      data: {
        userStatus: "ACTIVE",
      },
    });

    let message;

    switch (user.userLanguage) {
      case "en":
        message = `You account has been activated in ${process.env.NEXT_PUBLIC_APP_NAME} \n\n Your username is: ${user.email} \n\n Please login to ${process.env.NEXT_PUBLIC_APP_URL} \n\n Thank you \n\n ${process.env.NEXT_PUBLIC_APP_NAME}`;
        break;
      case "cz":
        message = `Váš účet v aplikaci ${process.env.NEXT_PUBLIC_APP_NAME} byl aktivován. \n\n Vaše uživatelské jméno je: ${user.email} \n\n  Prosím přihlašte se na ${process.env.NEXT_PUBLIC_APP_URL} \n\n Děkujeme \n\n ${process.env.NEXT_PUBLIC_APP_NAME}`;
        break;
      default:
        message = `You account has been activated in ${process.env.NEXT_PUBLIC_APP_NAME} \n\n Your username is: ${user.email} \n\n Please login to ${process.env.NEXT_PUBLIC_APP_URL} \n\n Thank you \n\n ${process.env.NEXT_PUBLIC_APP_NAME}`;
        break;
    }

    await sendEmail({
      from: EMAIL_CONFIG.FROM,
      to: user.email,
      subject: `Invitation to ${process.env.NEXT_PUBLIC_APP_NAME}`,
      text: message,
    });

    return NextResponse.json(user);
  } catch (error) {
    return new NextResponse("Initial error", { status: 500 });
  }
}

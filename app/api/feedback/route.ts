import resendHelper from "@/lib/resend";
import { getCurrentUser } from "@/lib/get-current-user";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const resend = await resendHelper();
  
  try {
    await getCurrentUser();
    const body = await req.json();
    
    if (!body) {
      return new NextResponse("Missing body", { status: 400 });
    }
    
    const { feedback } = body;

    if (!feedback) {
      return new NextResponse("Missing feedback", { status: 400 });
    }

    await resend.emails.send({
      from:
        process.env.NEXT_PUBLIC_APP_NAME + " <" + process.env.EMAIL_FROM + ">",
      to: "info@softbase.cz",
      subject: "New Feedback from: " + process.env.NEXT_PUBLIC_APP_URL,
      text: feedback,
    });
    return NextResponse.json({ message: "Feedback sent" }, { status: 200 });
  } catch (error) {
    console.log("[FEEDBACK_POST]", error);
    return NextResponse.json({ error: "Initial error" }, { status: 500 });
  }
}

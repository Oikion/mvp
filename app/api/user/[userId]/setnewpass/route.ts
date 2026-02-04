import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { hash } from "bcryptjs";

export async function PUT(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser();
  const { password, cpassword } = await req.json();

  if (!user) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!params.userId) {
    return new NextResponse("No user ID provided", { status: 400 });
  }

  if (user.id !== params.userId && !user.is_admin) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!password || !cpassword) {
    return new NextResponse("No password provided", { status: 400 });
  }

  if (password !== cpassword) {
    return new NextResponse("Passwords do not match", { status: 400 });
  }

  if (user.email === "demo@oikion.dev") {
    return new NextResponse(
      "Hey, don't be a fool! There are so many works done! Thanks!",
      {
        status: 400,
      }
    );
  }

  try {
    await prismadb.users.update({
      data: {
        password: await hash(password, 10),
      },
      where: {
        id: params.userId,
      },
    });

    // SECURITY: Only return success indicator, not the user object
    // Returning the user object would expose the password hash and other sensitive data
    return NextResponse.json({ 
      success: true, 
      message: "Password updated successfully" 
    });
  } catch (error) {
    console.error("[SET_NEW_PASS_ERROR]", error);
    return new NextResponse("Failed to update password", { status: 500 });
  }
}

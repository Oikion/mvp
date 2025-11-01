import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    if (!body.avatar) {
      return NextResponse.json(
        { message: "No avatar provided" },
        { status: 400 }
      );
    }

    await prismadb.users.update({
      where: {
        id: user.id,
      },
      data: {
        avatar: body.avatar,
      },
    });
    console.log("Profile photo updated");
    return NextResponse.json(
      { message: "Profile photo updated" },
      { status: 200 }
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error updating profile photo" },
      { status: 500 }
    );
  }
}

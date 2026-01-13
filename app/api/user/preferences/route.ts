import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

export async function GET() {
  try {
    const user = await getCurrentUser();

    const userData = await prismadb.users.findUnique({
      where: { id: user.id },
      select: {
        referralBoxDismissed: true,
        referralApplicationStatus: true,
      },
    });

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      referralBoxDismissed: userData.referralBoxDismissed,
      referralApplicationStatus: userData.referralApplicationStatus,
    });
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const { referralBoxDismissed } = body;

    if (typeof referralBoxDismissed !== "boolean") {
      return NextResponse.json(
        { error: "Invalid referralBoxDismissed value" },
        { status: 400 }
      );
    }

    await prismadb.users.update({
      where: { id: user.id },
      data: {
        referralBoxDismissed,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

export async function POST(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser.is_admin) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    
    const user = await prismadb.users.update({
      where: {
        id: params.userId,
      },
      data: {
        userStatus: "INACTIVE",
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.log("[USERACTIVATE_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { NextResponse } from "next/server";

export async function POST(req: Request, props: { params: Promise<{ projectId: string }> }) {
  const params = await props.params;
  
  try {
    const user = await getCurrentUser();
    
    if (!params.projectId) {
      return new NextResponse("Missing project ID", { status: 400 });
    }

    const boardId = params.projectId;

    console.log(boardId, "boardId");
    console.log(user.id, "user.id");

    await prismadb.estateFiles.update({
      where: {
        id: boardId,
      },
      data: {
        watchers_users: {
          connect: {
            id: user.id,
          },
        },
      },
    });
    return NextResponse.json({ message: "Estate file watched" }, { status: 200 });
  } catch (error) {
    console.log(error);
    return new NextResponse("Error occurred", { status: 500 });
  }
}

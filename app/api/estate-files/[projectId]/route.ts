import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";

export async function DELETE(req: Request, props: { params: Promise<{ projectId: string }> }) {
  const params = await props.params;
  
  try {
    await getCurrentUser();
    
    if (!params.projectId) {
      return new NextResponse("Missing project ID", { status: 400 });
    }
    const boardId = params.projectId;

    const sections = await prismadb.sections.findMany({
      where: {
        board: boardId,
      },
    });

    for (const section of sections) {
      await prismadb.tasks.deleteMany({
        where: {
          section: section.id,
        },
      });
    }
    await prismadb.sections.deleteMany({
      where: {
        board: boardId,
      },
    });

    await prismadb.estateFiles.delete({
      where: {
        id: boardId,
      },
    });

    return NextResponse.json({ message: "Estate file deleted" }, { status: 200 });
  } catch (error) {
    console.log("[PROJECT_DELETE]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

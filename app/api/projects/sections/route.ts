import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { NextResponse } from "next/server";

export async function DELETE(req: Request) {
  try {
    await getCurrentUser();
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return new NextResponse("Missing section ID ", { status: 400 });
    }

    console.log(id, "id");

    const tasks = await prismadb.tasks.findMany({});

    for (const task of tasks) {
      if (task.section === id) {
        await prismadb.tasks.delete({
          where: {
            id: task.id,
          },
        });
      }
    }

    await prismadb.sections.delete({
      where: {
        id: id,
      },
    });

    return NextResponse.json("deletedSection");
  } catch (error) {
    console.log("[PROJECT_SECTION_DELETE]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

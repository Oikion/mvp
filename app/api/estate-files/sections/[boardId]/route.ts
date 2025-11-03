import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

export async function POST(req: Request, props: { params: Promise<{ boardId: string }> }) {
  const params = await props.params;
  
  try {
    await getCurrentUser();
    const body = await req.json();
    const { boardId } = params;
    const { title } = body;

    if (!title) {
      return new NextResponse("Missing one of the task data ", { status: 400 });
    }

    const sectionPosition = await prismadb.sections.count({
      where: {
        board: boardId,
      },
    });

    const newSection = await prismadb.sections.create({
      data: {
        v: 0,
        board: boardId,
        title: title,
        position: sectionPosition > 0 ? sectionPosition : 0,
      },
    });

    return NextResponse.json({ newsecton: newSection }, { status: 200 });
  } catch (error) {
    console.log("[NEW_SECTION_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

export async function PUT(req: Request, props: { params: Promise<{ sectionId: string }> }) {
  const params = await props.params;
  
  try {
    await getCurrentUser();
    const body = await req.json();
    const { sectionId } = params;
    const { newTitle } = body;

    await prismadb.sections.update({
      where: {
        id: sectionId,
      },
      data: {
        title: newTitle,
      },
    });

    return NextResponse.json(
      { message: "Section Title change successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.log("[NEW_SECTION_TITLE_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

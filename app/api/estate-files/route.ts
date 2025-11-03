import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const { title, description, visibility } = body;

    if (!title) {
      return new NextResponse("Missing estate file name", { status: 400 });
    }

    if (!description) {
      return new NextResponse("Missing estate file description", { status: 400 });
    }

    const estateFilesCount = await prismadb.estateFiles.count();

    const newEstateFile = await prismadb.estateFiles.create({
      data: {
        v: 0,
        user: user.id,
        title: title,
        description: description,
        position: estateFilesCount > 0 ? estateFilesCount : 0,
        visibility: visibility,
        sharedWith: [user.id],
        createdBy: user.id,
      },
    });

    await prismadb.sections.create({
      data: {
        v: 0,
        board: newEstateFile.id,
        title: "Backlog",
        position: 0,
      },
    });

    return NextResponse.json({ newEstateFile }, { status: 200 });
  } catch (error) {
    console.log("[NEW_BOARD_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const { id, title, description, visibility } = body;

    if (!title) {
      return new NextResponse("Missing estate file name", { status: 400 });
    }

    if (!description) {
      return new NextResponse("Missing estate file description", { status: 400 });
    }

    await prismadb.estateFiles.update({
      where: {
        id,
      },
      data: {
        title: title,
        description: description,
        visibility: visibility,
        updatedBy: user.id,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      { message: "Estate file updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.log("[UPDATE_BOARD_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

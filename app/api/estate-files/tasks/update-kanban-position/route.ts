import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const {
      resourceList,
      destinationList,
      resourceSectionId,
      destinationSectionId,
    } = body;

    const resourceListReverse = resourceList.reverse();
    const destinationListReverse = destinationList.reverse();

    if (resourceSectionId !== destinationSectionId) {
      for (let key: any = 0; key < resourceListReverse.length; key++) {
        const task = resourceListReverse[key];
        const position = parseInt(key);

        await prismadb.tasks.update({
          where: {
            id: task.id,
          },
          data: {
            section: resourceSectionId,
            position: position,
            updatedBy: user.id,
          },
        });
      }
    }

    for (let key: any = 0; key < destinationListReverse.length; key++) {
      const task = destinationListReverse[key];
      const position = parseInt(key);

      await prismadb.tasks.update({
        where: {
          id: task.id,
        },
        data: {
          section: destinationSectionId,
          position: position,
          updatedBy: user.id,
        },
      });
    }
    console.log("Task positions updated successfully");
    return NextResponse.json(
      {
        message: "Task positions updated successfully",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.log("[UPDATE_TASK_POSITION_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

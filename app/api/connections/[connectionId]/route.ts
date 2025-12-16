import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";

export async function PUT(
  req: Request,
  props: { params: Promise<{ connectionId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    const params = await props.params;
    const { connectionId } = params;
    const body = await req.json();
    const { accept } = body;

    const connection = await prismadb.agentConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      return new NextResponse("Connection not found", { status: 404 });
    }

    // Only the recipient can accept/reject
    if (connection.followingId !== currentUser.id) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    if (connection.status !== "PENDING") {
      return new NextResponse("Request already processed", { status: 400 });
    }

    const updated = await prismadb.agentConnection.update({
      where: { id: connectionId },
      data: {
        status: accept ? "ACCEPTED" : "REJECTED",
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[CONNECTION_PUT]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ connectionId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    const params = await props.params;
    const { connectionId } = params;

    const connection = await prismadb.agentConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      return new NextResponse("Connection not found", { status: 404 });
    }

    // Either party can remove
    if (
      connection.followerId !== currentUser.id &&
      connection.followingId !== currentUser.id
    ) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    await prismadb.agentConnection.delete({
      where: { id: connectionId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[CONNECTION_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}










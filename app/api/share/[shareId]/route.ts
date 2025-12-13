import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  props: { params: Promise<{ shareId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    const params = await props.params;
    const { shareId } = params;

    const share = await prismadb.sharedEntity.findUnique({
      where: { id: shareId },
    });

    if (!share) {
      return new NextResponse("Share not found", { status: 404 });
    }

    // Only sharer can revoke
    if (share.sharedById !== currentUser.id) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    await prismadb.sharedEntity.delete({
      where: { id: shareId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[SHARE_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}








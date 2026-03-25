import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { requireOwner } from "@/lib/permissions/guards";

export async function POST(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;

  try {
    // Only org owners can demote from admin (replaces global is_admin check)
    const denied = await requireOwner();
    if (denied) return denied;

    const user = await prismadb.users.update({
      where: {
        id: params.userId,
      },
      data: {
        is_admin: false,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    return new NextResponse("Initial error", { status: 500 });
  }
}

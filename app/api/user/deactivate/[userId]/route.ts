import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { requireAtLeastLead } from "@/lib/permissions/guards";

export async function POST(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;

  try {
    // Leads and above can deactivate users (replaces global is_admin check)
    const denied = await requireAtLeastLead();
    if (denied) return denied;

    const user = await prismadb.users.update({
      where: {
        id: params.userId,
      },
      data: {
        userStatus: "INACTIVE",
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    return new NextResponse("Initial error", { status: 500 });
  }
}

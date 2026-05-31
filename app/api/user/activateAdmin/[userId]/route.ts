import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { requireOwner } from "@/lib/permissions/guards";
import { isUserInOrg } from "@/lib/org-members";

export async function POST(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;

  try {
    // Only org owners can promote to admin (replaces global is_admin check)
    const denied = await requireOwner();
    if (denied) return denied;

    // Cross-tenant guard: target must be in the caller's org.
    const organizationId = await getCurrentOrgId();
    if (!(await isUserInOrg(params.userId, organizationId))) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const user = await prismadb.users.update({
      where: {
        id: params.userId,
      },
      data: {
        is_admin: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    return new NextResponse("Initial error", { status: 500 });
  }
}

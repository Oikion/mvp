import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { requireAtLeastLead } from "@/lib/permissions/guards";
import { isUserInOrg } from "@/lib/org-members";

export async function POST(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;

  try {
    // Leads and above can deactivate users (replaces global is_admin check)
    const denied = await requireAtLeastLead();
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
        userStatus: "INACTIVE",
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    return new NextResponse("Initial error", { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prismaForOrg } from "@/lib/tenant";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const prismaTenant = prismaForOrg(organizationId);

    const count = await prismaTenant.eventInvitee.count({
      where: {
        userId: currentUser.id,
        organizationId,
        status: "PENDING",
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("[GET_PENDING_INVITATION_COUNT]", error);
    return NextResponse.json({ count: 0 });
  }
}


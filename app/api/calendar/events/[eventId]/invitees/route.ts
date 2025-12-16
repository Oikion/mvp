import { NextRequest, NextResponse } from "next/server";
import { prismaForOrg } from "@/lib/tenant";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const organizationId = await getCurrentOrgId();
    const prismaTenant = prismaForOrg(organizationId);

    const invitees = await prismaTenant.eventInvitee.findMany({
      where: {
        eventId,
        organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(
      invitees.map((inv) => ({
        id: inv.id,
        userId: inv.userId,
        status: inv.status,
        respondedAt: inv.respondedAt?.toISOString() || null,
        createdAt: inv.createdAt.toISOString(),
        user: inv.user,
      }))
    );
  } catch (error) {
    console.error("[GET_EVENT_INVITEES]", error);
    return NextResponse.json(
      { error: "Failed to fetch invitees" },
      { status: 500 }
    );
  }
}


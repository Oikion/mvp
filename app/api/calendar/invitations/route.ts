import { NextRequest, NextResponse } from "next/server";
import { prismaForOrg } from "@/lib/tenant";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const prismaTenant = prismaForOrg(organizationId);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as "PENDING" | "ACCEPTED" | "DECLINED" | "TENTATIVE" | null;

    const invitations = await prismaTenant.eventInvitee.findMany({
      where: {
        userId: currentUser.id,
        organizationId,
        ...(status ? { status } : {}),
      },
      include: {
        event: {
          include: {
            assignedUser: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
            linkedClients: {
              select: {
                id: true,
                client_name: true,
              },
            },
            linkedProperties: {
              select: {
                id: true,
                property_name: true,
              },
            },
          },
        },
      },
      orderBy: {
        event: {
          startTime: "asc",
        },
      },
    });

    return NextResponse.json(
      invitations.map((inv) => ({
        invitationId: inv.id,
        status: inv.status,
        respondedAt: inv.respondedAt?.toISOString() || null,
        event: {
          id: inv.event.id,
          title: inv.event.title,
          description: inv.event.description,
          startTime: inv.event.startTime.toISOString(),
          endTime: inv.event.endTime.toISOString(),
          location: inv.event.location,
          eventType: inv.event.eventType,
          assignedUser: inv.event.assignedUser,
          linkedClients: inv.event.linkedClients,
          linkedProperties: inv.event.linkedProperties,
        },
      }))
    );
  } catch (error) {
    console.error("[GET_INVITED_EVENTS]", error);
    return NextResponse.json(
      { error: "Failed to fetch invited events" },
      { status: 500 }
    );
  }
}


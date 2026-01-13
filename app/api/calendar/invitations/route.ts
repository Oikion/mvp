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
        CalComEvent: {
          include: {
            Users: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
            Clients: {
              select: {
                id: true,
                client_name: true,
              },
            },
            Properties: {
              select: {
                id: true,
                property_name: true,
              },
            },
          },
        },
      },
      orderBy: {
        CalComEvent: {
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
          id: inv.CalComEvent.id,
          title: inv.CalComEvent.title,
          description: inv.CalComEvent.description,
          startTime: inv.CalComEvent.startTime.toISOString(),
          endTime: inv.CalComEvent.endTime.toISOString(),
          location: inv.CalComEvent.location,
          eventType: inv.CalComEvent.eventType,
          assignedUser: inv.CalComEvent.Users,
          linkedClients: inv.CalComEvent.Clients,
          linkedProperties: inv.CalComEvent.Properties,
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








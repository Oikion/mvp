import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { notifyConnectionRequest } from "@/lib/notifications";
import { canPerformAction } from "@/lib/permissions/action-service";

export async function GET(req: Request) {
  try {
    // Permission check: Users need social:manage_connections permission
    const readCheck = await canPerformAction("social:manage_connections");
    if (!readCheck.allowed) {
      return NextResponse.json({ error: readCheck.reason }, { status: 403 });
    }

    const currentUser = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as "PENDING" | "ACCEPTED" | null;
    const type = searchParams.get("type"); // "received", "sent", or null for all

    let whereClause: any = {};

    if (type === "received") {
      whereClause = {
        followingId: currentUser.id,
        ...(status ? { status } : {}),
      };
    } else if (type === "sent") {
      whereClause = {
        followerId: currentUser.id,
        ...(status ? { status } : {}),
      };
    } else {
      whereClause = {
        OR: [{ followerId: currentUser.id }, { followingId: currentUser.id }],
        ...(status ? { status } : {}),
      };
    }

    const connections = await prismadb.agentConnection.findMany({
      where: whereClause,
      include: {
        Users_AgentConnection_followerIdToUsers: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            AgentProfile: {
              select: {
                slug: true,
                bio: true,
                specializations: true,
                visibility: true,
              },
            },
          },
        },
        Users_AgentConnection_followingIdToUsers: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            AgentProfile: {
              select: {
                slug: true,
                bio: true,
                specializations: true,
                visibility: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to show the "other" user
    const transformed = connections.map((conn) => ({
      id: conn.id,
      status: conn.status,
      createdAt: conn.createdAt,
      isIncoming: conn.followingId === currentUser.id,
      user:
        conn.followerId === currentUser.id 
          ? conn.Users_AgentConnection_followingIdToUsers 
          : conn.Users_AgentConnection_followerIdToUsers,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("[CONNECTIONS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Permission check: Users need social:manage_connections permission
    const connectCheck = await canPerformAction("social:manage_connections");
    if (!connectCheck.allowed) {
      return NextResponse.json({ error: connectCheck.reason }, { status: 403 });
    }

    const currentUser = await getCurrentUser();
    const body = await req.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return new NextResponse("Target user ID is required", { status: 400 });
    }

    if (currentUser.id === targetUserId) {
      return new NextResponse("You cannot connect with yourself", { status: 400 });
    }

    // Check if connection already exists
    const existingConnection = await prismadb.agentConnection.findFirst({
      where: {
        OR: [
          { followerId: currentUser.id, followingId: targetUserId },
          { followerId: targetUserId, followingId: currentUser.id },
        ],
      },
    });

    if (existingConnection) {
      if (existingConnection.status === "ACCEPTED") {
        return new NextResponse("You are already connected", { status: 400 });
      }
      if (existingConnection.status === "PENDING") {
        return new NextResponse("A request already exists", { status: 400 });
      }
      if (existingConnection.status === "REJECTED") {
        // Re-enable the connection request
        const updated = await prismadb.agentConnection.update({
          where: { id: existingConnection.id },
          data: {
            status: "PENDING",
            followerId: currentUser.id,
            followingId: targetUserId,
          },
        });

        // Send notification to target user
        await notifyConnectionRequest({
          connectionId: updated.id,
          requesterId: currentUser.id,
          requesterName: currentUser.name || currentUser.email || "Someone",
          targetId: targetUserId,
          organizationId: "00000000-0000-0000-0000-000000000000",
        });

        return NextResponse.json(updated);
      }
    }

    const connection = await prismadb.agentConnection.create({
      data: {
        id: crypto.randomUUID(),
        followerId: currentUser.id,
        followingId: targetUserId,
        status: "PENDING",
        updatedAt: new Date(),
      },
    });

    // Send notification to target user
    await notifyConnectionRequest({
      connectionId: connection.id,
      requesterId: currentUser.id,
      requesterName: currentUser.name || currentUser.email || "Someone",
      targetId: targetUserId,
      organizationId: "00000000-0000-0000-0000-000000000000",
    });

    return NextResponse.json(connection, { status: 201 });
  } catch (error) {
    console.error("[CONNECTIONS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}


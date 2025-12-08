import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
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
        follower: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            agentProfile: {
              select: {
                slug: true,
                bio: true,
                specializations: true,
                visibility: true,
              },
            },
          },
        },
        following: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            agentProfile: {
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
        conn.followerId === currentUser.id ? conn.following : conn.follower,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("[CONNECTIONS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
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
        return NextResponse.json(updated);
      }
    }

    const connection = await prismadb.agentConnection.create({
      data: {
        followerId: currentUser.id,
        followingId: targetUserId,
        status: "PENDING",
      },
    });

    return NextResponse.json(connection, { status: 201 });
  } catch (error) {
    console.error("[CONNECTIONS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}


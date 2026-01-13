import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "20");

    const agents = await prismadb.users.findMany({
      where: {
        id: { not: currentUser.id },
        userStatus: "ACTIVE",
        // Only show agents who:
        // 1. Have no profile OR have visibility PUBLIC/SECURE (not PERSONAL)
        // 2. Have not opted out of agent search
        OR: [
          // Users without an agent profile (default discoverable)
          { AgentProfile: null },
          // Users with a profile that is visible and not hidden from search
          {
            AgentProfile: {
              visibility: { in: ["PUBLIC", "SECURE"] },
              hideFromAgentSearch: false,
            },
          },
        ],
        // Apply search query if provided
        AND: query
          ? [
              {
                OR: [
                  { name: { contains: query, mode: "insensitive" } },
                  { email: { contains: query, mode: "insensitive" } },
                  {
                    AgentProfile: {
                      OR: [
                        { bio: { contains: query, mode: "insensitive" } },
                        { serviceAreas: { has: query } },
                      ],
                    },
                  },
                ],
              },
            ]
          : undefined,
      },
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
            serviceAreas: true,
            visibility: true,
            hideFromAgentSearch: true,
          },
        },
        _count: {
          select: {
            Properties_Properties_assigned_toToUsers: {
              where: {
                portal_visibility: "PUBLIC",
                property_status: "ACTIVE",
              },
            },
          },
        },
      },
      take: limit,
      orderBy: { name: "asc" },
    });

    // Get connection statuses
    const existingConnections = await prismadb.agentConnection.findMany({
      where: {
        OR: [
          {
            followerId: currentUser.id,
            followingId: { in: agents.map((a) => a.id) },
          },
          {
            followingId: currentUser.id,
            followerId: { in: agents.map((a) => a.id) },
          },
        ],
      },
    });

    const connectionMap = new Map(
      existingConnections.map((c) => {
        const otherId =
          c.followerId === currentUser.id ? c.followingId : c.followerId;
        return [
          otherId,
          {
            status: c.status,
            connectionId: c.id,
            isIncoming: c.followingId === currentUser.id,
          },
        ];
      })
    );

    const result = agents.map((agent) => ({
      ...agent,
      connectionStatus: connectionMap.get(agent.id) || { status: "NONE" },
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("[CONNECTIONS_SEARCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}


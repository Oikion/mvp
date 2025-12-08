"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";
import { notifyConnectionRequest, notifyConnectionAccepted } from "@/lib/notifications";

/**
 * Send a connection request to another user
 */
export async function sendConnectionRequest(targetUserId: string) {
  const currentUser = await getCurrentUser();
  const organizationId = await getCurrentOrgId();

  if (currentUser.id === targetUserId) {
    throw new Error("You cannot connect with yourself");
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
      throw new Error("You are already connected with this user");
    }
    if (existingConnection.status === "PENDING") {
      throw new Error("A connection request already exists");
    }
    if (existingConnection.status === "REJECTED") {
      // Update the rejected connection to pending again
      const updated = await prismadb.agentConnection.update({
        where: { id: existingConnection.id },
        data: {
          status: "PENDING",
          followerId: currentUser.id,
          followingId: targetUserId,
          updatedAt: new Date(),
        },
      });
      
      // Send notification
      await notifyConnectionRequest({
        connectionId: updated.id,
        requesterId: currentUser.id,
        requesterName: currentUser.name || currentUser.email || "Someone",
        targetId: targetUserId,
        organizationId,
      });
      
      revalidatePath("/connections");
      return { success: true, message: "Connection request sent" };
    }
  }

  // Create new connection request
  const connection = await prismadb.agentConnection.create({
    data: {
      followerId: currentUser.id,
      followingId: targetUserId,
      status: "PENDING",
    },
  });

  // Send notification to target user
  await notifyConnectionRequest({
    connectionId: connection.id,
    requesterId: currentUser.id,
    requesterName: currentUser.name || currentUser.email || "Someone",
    targetId: targetUserId,
    organizationId,
  });

  revalidatePath("/connections");
  return { success: true, message: "Connection request sent" };
}

/**
 * Respond to a connection request
 */
export async function respondToConnectionRequest(
  connectionId: string,
  accept: boolean
) {
  const currentUser = await getCurrentUser();
  const organizationId = await getCurrentOrgId();

  const connection = await prismadb.agentConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    throw new Error("Connection request not found");
  }

  // Only the person being followed can accept/reject
  if (connection.followingId !== currentUser.id) {
    throw new Error("You are not authorized to respond to this request");
  }

  if (connection.status !== "PENDING") {
    throw new Error("This request has already been processed");
  }

  await prismadb.agentConnection.update({
    where: { id: connectionId },
    data: {
      status: accept ? "ACCEPTED" : "REJECTED",
    },
  });

  // Notify the requester if connection was accepted
  if (accept) {
    await notifyConnectionAccepted({
      connectionId,
      requesterId: connection.followerId,
      requesterName: currentUser.name || currentUser.email || "Someone",
      targetId: currentUser.id,
      organizationId,
    });
  }

  revalidatePath("/connections");
  return {
    success: true,
    message: accept ? "Connection accepted" : "Connection declined",
  };
}

/**
 * Remove a connection
 */
export async function removeConnection(connectionId: string) {
  const currentUser = await getCurrentUser();

  const connection = await prismadb.agentConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    throw new Error("Connection not found");
  }

  // Either party can remove the connection
  if (
    connection.followerId !== currentUser.id &&
    connection.followingId !== currentUser.id
  ) {
    throw new Error("You are not part of this connection");
  }

  await prismadb.agentConnection.delete({
    where: { id: connectionId },
  });

  revalidatePath("/connections");
  return { success: true, message: "Connection removed" };
}

/**
 * Get my connections
 */
export async function getMyConnections(status?: "PENDING" | "ACCEPTED") {
  const currentUser = await getCurrentUser();

  const connections = await prismadb.agentConnection.findMany({
    where: {
      OR: [{ followerId: currentUser.id }, { followingId: currentUser.id }],
      ...(status ? { status } : {}),
    },
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

  // Transform to show the "other" user in each connection
  return connections.map((conn) => ({
    id: conn.id,
    status: conn.status,
    createdAt: conn.createdAt,
    isIncoming: conn.followingId === currentUser.id,
    user:
      conn.followerId === currentUser.id ? conn.following : conn.follower,
  }));
}

/**
 * Get pending requests received
 */
export async function getPendingRequests() {
  const currentUser = await getCurrentUser();

  const requests = await prismadb.agentConnection.findMany({
    where: {
      followingId: currentUser.id,
      status: "PENDING",
    },
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
    },
    orderBy: { createdAt: "desc" },
  });

  return requests.map((req) => ({
    id: req.id,
    createdAt: req.createdAt,
    user: req.follower,
  }));
}

/**
 * Get pending requests sent
 */
export async function getSentRequests() {
  const currentUser = await getCurrentUser();

  const requests = await prismadb.agentConnection.findMany({
    where: {
      followerId: currentUser.id,
      status: "PENDING",
    },
    include: {
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

  return requests.map((req) => ({
    id: req.id,
    createdAt: req.createdAt,
    user: req.following,
  }));
}

/**
 * Get accepted connections
 */
export async function getAcceptedConnections() {
  return getMyConnections("ACCEPTED");
}

/**
 * Get connection status with another user
 */
export async function getConnectionStatus(targetUserId: string) {
  const currentUser = await getCurrentUser();

  if (currentUser.id === targetUserId) {
    return { status: "SELF" };
  }

  const connection = await prismadb.agentConnection.findFirst({
    where: {
      OR: [
        { followerId: currentUser.id, followingId: targetUserId },
        { followerId: targetUserId, followingId: currentUser.id },
      ],
    },
  });

  if (!connection) {
    return { status: "NONE" };
  }

  return {
    status: connection.status,
    connectionId: connection.id,
    isIncoming: connection.followingId === currentUser.id,
  };
}

/**
 * Search agents to connect with
 * Only shows agents with PUBLIC or SECURE profiles who haven't hidden from search
 */
export async function searchAgentsToConnect(query: string, limit: number = 20) {
  const currentUser = await getCurrentUser();

  const agents = await prismadb.users.findMany({
    where: {
      id: { not: currentUser.id },
      userStatus: "ACTIVE",
      // Only show agents with PUBLIC or SECURE profiles who haven't hidden from search
      agentProfile: {
        visibility: { in: ["PUBLIC", "SECURE"] },
        hideFromAgentSearch: false,
      },
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        {
          agentProfile: {
            OR: [
              { bio: { contains: query, mode: "insensitive" } },
              { serviceAreas: { hasSome: [query] } },
            ],
          },
        },
      ],
    },
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
          hideFromAgentSearch: true,
        },
      },
      _count: {
        select: {
          properties: {
            where: {
              portal_visibility: "PUBLIC",
              property_status: "ACTIVE",
            },
          },
        },
      },
    },
    take: limit,
  });

  // Get existing connection statuses
  const existingConnections = await prismadb.agentConnection.findMany({
    where: {
      OR: [
        { followerId: currentUser.id, followingId: { in: agents.map((a) => a.id) } },
        { followingId: currentUser.id, followerId: { in: agents.map((a) => a.id) } },
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

  return agents.map((agent) => ({
    ...agent,
    connectionStatus: connectionMap.get(agent.id) || { status: "NONE" },
  }));
}


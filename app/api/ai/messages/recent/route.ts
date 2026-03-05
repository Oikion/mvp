// @ts-nocheck
// TODO: Fix type errors
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";

/**
 * GET /api/ai/messages/recent
 * Get recent conversations with message previews
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (!user || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    // Get conversations the user is part of
    const conversations = await prismadb.conversation.findMany({
      where: {
        organizationId,
        participants: {
          some: { userId: user.id },
        },
        ...(unreadOnly && {
          messages: {
            some: {
              reads: {
                none: { userId: user.id },
              },
            },
          },
        }),
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                reads: {
                  none: { userId: user.id },
                },
                senderId: { not: user.id },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    const formattedConversations = conversations.map((conv) => ({
      id: conv.id,
      title: conv.title,
      type: conv.type,
      participants: conv.participants.map((p) => ({
        id: p.user.id,
        name: p.user.name,
        avatar: p.user.avatar,
      })),
      lastMessage: conv.messages[0]
        ? {
            id: conv.messages[0].id,
            content: conv.messages[0].content,
            sender: conv.messages[0].sender,
            createdAt: conv.messages[0].createdAt,
          }
        : null,
      unreadCount: conv._count.messages,
      updatedAt: conv.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      conversations: formattedConversations,
      total: formattedConversations.length,
    });
  } catch (error) {
    console.error("[AI_MESSAGES_RECENT]", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

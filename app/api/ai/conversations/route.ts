import { NextRequest, NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";

// Force Node.js runtime to avoid stream API issues
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/ai/conversations
 * List user's AI conversations
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (!user || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const cursor = searchParams.get("cursor");

    const conversations = await prismadb.aiConversation.findMany({
      where: {
        organizationId,
        userId: user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: limit,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      select: {
        id: true,
        title: true,
        messages: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      conversations.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("[AI_CONVERSATIONS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/conversations
 * Create a new AI conversation
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (!user || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, messages, context } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const conversation = await prismadb.aiConversation.create({
      data: {
        organizationId,
        userId: user.id,
        title: title || null,
        messages,
        context: context || null,
      },
    });

    return NextResponse.json({
      id: conversation.id,
      title: conversation.title,
      messages: conversation.messages,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[AI_CONVERSATIONS_POST]", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}

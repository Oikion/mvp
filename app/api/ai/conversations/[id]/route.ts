import { NextRequest, NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";

// Force Node.js runtime to avoid stream API issues
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/ai/conversations/[id]
 * Get a specific conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();
    const { id } = await params;

    if (!user || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversation = await prismadb.aiConversation.findFirst({
      where: {
        id,
        organizationId,
        userId: user.id,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: conversation.id,
      title: conversation.title,
      messages: conversation.messages,
      context: conversation.context,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[AI_CONVERSATION_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ai/conversations/[id]
 * Update a conversation
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();
    const { id } = await params;

    if (!user || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, messages } = body;

    // Verify ownership
    const existing = await prismadb.aiConversation.findFirst({
      where: {
        id,
        organizationId,
        userId: user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const conversation = await prismadb.aiConversation.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(messages !== undefined && { messages }),
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
    console.error("[AI_CONVERSATION_PUT]", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai/conversations/[id]
 * Delete a conversation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();
    const { id } = await params;

    if (!user || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const existing = await prismadb.aiConversation.findFirst({
      where: {
        id,
        organizationId,
        userId: user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    await prismadb.aiConversation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AI_CONVERSATION_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}

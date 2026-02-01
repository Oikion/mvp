import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { getOrgOpenAIKey, getOrgOpenAIModel } from "@/lib/org-settings";
import { getSystemSetting } from "@/lib/system-settings";

/**
 * POST /api/ai/messages/draft
 * Generate a draft response to a conversation
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (!user || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, tone = "professional", context } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    // Get the conversation with recent messages
    const conversation = await prismadb.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId,
        participants: {
          some: { userId: user.id },
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
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
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Get OpenAI API key
    let apiKey = await getOrgOpenAIKey(organizationId);
    const modelName = await getOrgOpenAIModel(organizationId);

    if (!apiKey) {
      apiKey = await getSystemSetting("openai_api_key", "OPENAI_API_KEY");
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // Build conversation context
    const messageHistory = conversation.messages
      .reverse()
      .map((m) => `${m.sender.name}: ${m.content}`)
      .join("\n");

    const otherParticipants = conversation.participants
      .filter((p) => p.userId !== user.id)
      .map((p) => p.user.name)
      .join(", ");

    const systemPrompt = `You are a helpful assistant drafting a message response for a real estate agent.
The agent's name is ${user.name}.
They are responding to a conversation with: ${otherParticipants}

Tone: ${tone}
${context ? `Additional context: ${context}` : ""}

Based on the conversation below, draft a thoughtful response that:
- Is appropriate for the ${tone} tone
- Addresses any questions or concerns raised
- Is concise but complete
- Sounds natural and human

Respond ONLY with the draft message content, no explanations.`;

    const completion = await openai.chat.completions.create({
      model: modelName || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Conversation:\n${messageHistory}\n\nDraft a response:` },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const draft = completion.choices[0]?.message?.content || "";

    return NextResponse.json({
      success: true,
      conversationId,
      draft,
      tone,
    });
  } catch (error) {
    console.error("[AI_MESSAGES_DRAFT]", error);
    return NextResponse.json(
      { error: "Failed to generate draft" },
      { status: 500 }
    );
  }
}

/**
 * Voice Commands API Route
 *
 * Processes voice commands with AI-powered tool calling.
 * Uses Vercel AI SDK for multi-step tool execution.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateText, stepCountIs, type ModelMessage } from "ai";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { getModel, getDatabaseTools, createVoiceContext } from "@/lib/ai-sdk";
import { getSystemPrompt } from "@/lib/ai-prompts";
import { getEnabledTools } from "@/lib/ai-tools";

// ============================================
// Types
// ============================================

interface VoiceCommandMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCallId?: string;
  name?: string;
}

interface VoiceCommandRequest {
  userMessage: string;
  conversationHistory?: VoiceCommandMessage[];
  language?: "el" | "en";
}

// ============================================
// Helper Functions
// ============================================

/**
 * Convert voice command messages to AI SDK ModelMessage format
 */
function convertToAISDKMessages(messages: VoiceCommandMessage[]): ModelMessage[] {
  return messages.map((msg): ModelMessage => {
    if (msg.role === "tool") {
      // Parse the tool result content if it's JSON, otherwise use as-is
      let output: unknown = msg.content;
      try {
        output = JSON.parse(msg.content);
      } catch {
        // Keep as string if not valid JSON
      }
      
      return {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: msg.toolCallId || "",
            toolName: msg.name || "",
            output,
          },
        ],
      } as ModelMessage;
    }

    return {
      role: msg.role,
      content: msg.content,
    } as ModelMessage;
  });
}

// ============================================
// API Handler
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      );
    }

    const body: VoiceCommandRequest = await request.json();
    const { userMessage, conversationHistory = [], language = "el" } = body;

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json(
        { error: "User message is required" },
        { status: 400 }
      );
    }

    // Get system prompt from database with fallback to defaults
    const systemPrompt = await getSystemPrompt("voice_assistant", language);

    // Get model for this organization (handles provider selection automatically)
    const model = await getModel(organizationId);

    // Get tools
    const toolContext = createVoiceContext(user.id, organizationId);
    const tools = await getDatabaseTools(toolContext);

    // Get tool list for display names
    const enabledTools = await getEnabledTools();
    const toolDisplayNames = new Map(
      enabledTools.map((t) => [t.name, t.displayName])
    );

    // Build messages for AI SDK
    const historyMessages = convertToAISDKMessages(conversationHistory);

    const fullMessages: ModelMessage[] = [
      { role: "system", content: systemPrompt },
      // Add current date/time context
      {
        role: "system",
        content: `Current date and time: ${new Date().toLocaleString(language === "el" ? "el-GR" : "en-US", { timeZone: "Europe/Athens" })}. User ID: ${user.id}`,
      },
      ...historyMessages,
      { role: "user", content: userMessage },
    ];

    // Execute with multi-step tool calling
    const result = await generateText({
      model,
      messages: fullMessages,
      tools,
      stopWhen: stepCountIs(5), // Max 5 tool call rounds
      temperature: 0.7,
      maxOutputTokens: 500,
    });

    // Extract tool calls from all steps
    const toolResults = result.steps
      .flatMap((step) =>
        (step.toolCalls || []).map((tc, index) => ({
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          displayName: toolDisplayNames.get(tc.toolName) || tc.toolName,
          success: true, // Tool calls that complete are successful
          result: step.toolResults?.[index]?.output,
          error: undefined,
        }))
      )
      .filter((tc) => tc.toolName); // Filter out empty

    // Build updated conversation history
    const updatedHistory: VoiceCommandMessage[] = [
      ...conversationHistory,
      { role: "user", content: userMessage },
      { role: "assistant", content: result.text || "" },
    ];

    return NextResponse.json({
      success: true,
      spokenResponse: result.text || "",
      toolCalls:
        toolResults.length > 0
          ? toolResults.map((r) => ({
              name: r.toolName,
              displayName: r.displayName,
              success: r.success,
              result: r.result,
              error: r.error,
            }))
          : null,
      conversationHistory: updatedHistory,
      usage: {
        promptTokens: result.usage?.inputTokens || 0,
        completionTokens: result.usage?.outputTokens || 0,
      },
    });
  } catch (error) {
    console.error("[VOICE_COMMANDS]", error);
    const errorMessage =
      error instanceof Error ? error.message : "Voice command processing failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * GET /api/voice/commands
 * Returns available voice commands/tools
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tools = await getEnabledTools();

    // Group tools by category for voice UI
    const toolsByCategory: Record<
      string,
      Array<{ name: string; displayName: string; description: string }>
    > = {};

    for (const tool of tools) {
      if (!toolsByCategory[tool.category]) {
        toolsByCategory[tool.category] = [];
      }
      toolsByCategory[tool.category].push({
        name: tool.name,
        displayName: tool.displayName,
        description: tool.description,
      });
    }

    return NextResponse.json({
      success: true,
      categories: toolsByCategory,
      totalTools: tools.length,
      exampleCommands: {
        el: [
          "Δημιούργησε πελάτη με όνομα Μαρία Παπαδοπούλου",
          "Τι ραντεβού έχω αύριο;",
          "Δημιούργησε υπενθύμιση να καλέσω τον κύριο Γεωργίου",
          "Βρες όλα τα διαμερίσματα στη Γλυφάδα",
          "Σύνδεσε τον πελάτη με το ακίνητο",
        ],
        en: [
          "Create a client named Maria Papadopoulou",
          "What appointments do I have tomorrow?",
          "Create a reminder to call Mr. Georgiou",
          "Find all apartments in Glyfada",
          "Link the client to the property",
        ],
      },
    });
  } catch (error) {
    console.error("[VOICE_COMMANDS_GET]", error);
    return NextResponse.json(
      { error: "Failed to get voice commands" },
      { status: 500 }
    );
  }
}

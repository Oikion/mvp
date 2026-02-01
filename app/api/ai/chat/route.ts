/**
 * AI Chat API Route
 *
 * Provides chat functionality with AI-powered tool calling.
 * Uses Vercel AI SDK for streaming responses and multi-step tool execution.
 */

import { NextRequest, NextResponse } from "next/server";
import { streamText, generateText, type ModelMessage, stepCountIs } from "ai";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { getModel, getDatabaseTools, createChatContext } from "@/lib/ai-sdk";
import { getSystemPrompt } from "@/lib/ai-prompts";
import { getEnabledTools } from "@/lib/ai-tools";
import { prismadb } from "@/lib/prisma";

// Force Node.js runtime for streaming
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================
// Types
// ============================================

interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCallId?: string;
  name?: string;
}

interface MentionedEntity {
  id: string;
  name: string;
  type: "client" | "property" | "event" | "document";
}

interface ChatRequest {
  messages: ChatMessage[];
  useTools?: boolean;
  mentions?: MentionedEntity[];
  stream?: boolean; // Enable streaming responses
}

// ============================================
// Helper Functions
// ============================================

/**
 * Fetch detailed information about mentioned entities
 */
async function fetchMentionedEntityDetails(
  mentions: MentionedEntity[],
  organizationId: string
): Promise<string> {
  if (!mentions || mentions.length === 0) {
    return "";
  }

  const contextParts: string[] = [
    "\n\n--- MENTIONED ENTITIES CONTEXT ---",
    "The user has mentioned the following entities in their message. Use this information to provide more relevant and context-aware responses:\n",
  ];

  try {
    // Group mentions by type
    const clientIds = mentions.filter((m) => m.type === "client").map((m) => m.id);
    const propertyIds = mentions.filter((m) => m.type === "property").map((m) => m.id);
    const eventIds = mentions.filter((m) => m.type === "event").map((m) => m.id);
    const documentIds = mentions.filter((m) => m.type === "document").map((m) => m.id);

    // Fetch clients
    if (clientIds.length > 0) {
      const clients = await prismadb.clients.findMany({
        where: {
          id: { in: clientIds },
          organizationId,
        },
        select: {
          id: true,
          client_name: true,
          primary_email: true,
          primary_phone: true,
          client_status: true,
          client_type: true,
          description: true,
          budget_min: true,
          budget_max: true,
        },
      });

      if (clients.length > 0) {
        contextParts.push("\n**CLIENTS:**");
        clients.forEach((client) => {
          const budgetStr =
            client.budget_min || client.budget_max
              ? `€${client.budget_min?.toLocaleString() || "?"} - €${client.budget_max?.toLocaleString() || "?"}`
              : "N/A";
          contextParts.push(
            `- ${client.client_name} (ID: ${client.id})
  Status: ${client.client_status || "N/A"}
  Type: ${client.client_type || "N/A"}
  Email: ${client.primary_email || "N/A"}
  Phone: ${client.primary_phone || "N/A"}
  Budget: ${budgetStr}
  Notes: ${client.description || "N/A"}`
          );
        });
      }
    }

    // Fetch properties
    if (propertyIds.length > 0) {
      const properties = await prismadb.property.findMany({
        where: {
          id: { in: propertyIds },
          organizationId,
        },
        select: {
          id: true,
          property_name: true,
          property_type: true,
          transaction_type: true,
          price: true,
          address: true,
          city: true,
          postal_code: true,
          country: true,
          bedrooms: true,
          bathrooms: true,
          total_area_sq_m: true,
          status: true,
          description: true,
        },
      });

      if (properties.length > 0) {
        contextParts.push("\n**PROPERTIES:**");
        properties.forEach((prop) => {
          contextParts.push(
            `- ${prop.property_name} (ID: ${prop.id})
  Type: ${prop.property_type} - ${prop.transaction_type}
  Price: €${prop.price?.toLocaleString() || "N/A"}
  Location: ${prop.address || ""}, ${prop.city || ""} ${prop.postal_code || ""}, ${prop.country || ""}
  Size: ${prop.total_area_sq_m || "N/A"}m²
  Beds: ${prop.bedrooms || "N/A"} | Baths: ${prop.bathrooms || "N/A"}
  Status: ${prop.status}
  Description: ${prop.description || "N/A"}`
          );
        });
      }
    }

    // Fetch events
    if (eventIds.length > 0) {
      const events = await prismadb.CalendarEvent.findMany({
        where: {
          id: { in: eventIds },
          organizationId,
        },
        select: {
          id: true,
          eventId: true,
          title: true,
          description: true,
          startTime: true,
          endTime: true,
          location: true,
          status: true,
          eventType: true,
        },
      });

      if (events.length > 0) {
        contextParts.push("\n**EVENTS:**");
        events.forEach((event) => {
          contextParts.push(
            `- ${event.title} (ID: ${event.id})
  Type: ${event.eventType || "N/A"}
  Time: ${new Date(event.startTime).toLocaleString()} - ${new Date(event.endTime).toLocaleString()}
  Location: ${event.location || "N/A"}
  Status: ${event.status || "N/A"}
  Description: ${event.description || "N/A"}`
          );
        });
      }
    }

    // Fetch documents
    if (documentIds.length > 0) {
      const documents = await prismadb.document.findMany({
        where: {
          id: { in: documentIds },
          organizationId,
        },
        select: {
          id: true,
          document_name: true,
          document_type: true,
          file_url: true,
          description: true,
          created_at: true,
          updated_at: true,
        },
      });

      if (documents.length > 0) {
        contextParts.push("\n**DOCUMENTS:**");
        documents.forEach((doc) => {
          contextParts.push(
            `- ${doc.document_name} (ID: ${doc.id})
  Type: ${doc.document_type || "N/A"}
  Description: ${doc.description || "N/A"}
  Created: ${new Date(doc.created_at).toLocaleDateString()}
  Updated: ${new Date(doc.updated_at).toLocaleDateString()}`
          );
        });
      }
    }

    contextParts.push("\n--- END MENTIONED ENTITIES CONTEXT ---\n");
  } catch (error) {
    console.error("[FETCH_MENTIONS_ERROR]", error);
    contextParts.push("\nError loading some entity details.");
  }

  return contextParts.join("\n");
}

/**
 * Convert our chat messages to AI SDK ModelMessage format
 */
function convertToAISDKMessages(messages: ChatMessage[]): ModelMessage[] {
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

    const body: ChatRequest = await request.json();
    const { messages, useTools = true, mentions, stream = false } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Fetch mentioned entity details
    let mentionsContext = "";
    if (mentions && mentions.length > 0) {
      mentionsContext = await fetchMentionedEntityDetails(mentions, organizationId);
    }

    // Get system prompt from database with fallback to defaults
    const systemPromptContent = await getSystemPrompt("chat_assistant", "en");

    // Build system prompt with mentions context
    let systemPromptWithContext = systemPromptContent;
    if (mentionsContext) {
      systemPromptWithContext += mentionsContext;
    }

    // Get model for this organization (handles provider selection automatically)
    const model = await getModel(organizationId);

    // Get tools if enabled
    // The getDatabaseTools function handles validation and sanitization
    // Only valid tools with type: "object" schemas will be returned
    const toolContext = createChatContext(user.id, organizationId);
    const tools = useTools ? await getDatabaseTools(toolContext) : undefined;

    // Log tools being sent to AI (validation happens in tools-adapter.ts)
    if (tools) {
      const toolNames = Object.keys(tools);
      console.log(`[AI_CHAT] Sending ${toolNames.length} validated tools to AI`);
      console.log("[AI_CHAT] Tool names:", toolNames.join(", "));
    }

    // Convert messages to AI SDK format
    const aiMessages = convertToAISDKMessages(messages);

    // Add system message at the start
    const fullMessages: ModelMessage[] = [
      { role: "system", content: systemPromptWithContext },
      ...aiMessages,
    ];

    // Use streaming or non-streaming based on request
    if (stream) {
      // Streaming response
      const result = streamText({
        model,
        messages: fullMessages,
        tools,
        stopWhen: tools ? stepCountIs(5) : undefined, // Max 5 tool call rounds
        temperature: 0.7,
        maxOutputTokens: 1000,
        onStepFinish: ({ toolCalls }) => {
          // Log tool usage for debugging
          if (toolCalls && toolCalls.length > 0) {
            console.log(
              "[AI_CHAT_TOOLS]",
              toolCalls.map((tc) => tc.toolName)
            );
          }
        },
      });

      // Return streaming response
      return result.toDataStreamResponse();
    }

    // Non-streaming response (for backwards compatibility)
    const result = await generateText({
      model,
      messages: fullMessages,
      tools,
      stopWhen: tools ? stepCountIs(5) : undefined,
      temperature: 0.7,
      maxOutputTokens: 1000,
    });

    // Extract tool call info from steps with full results
    const toolCalls: Array<{
      id: string;
      name: string;
      args: Record<string, unknown>;
      success: boolean;
      result?: unknown;
      error?: string;
    }> = [];

    for (const step of result.steps) {
      if (step.toolCalls && step.toolCalls.length > 0) {
        for (const tc of step.toolCalls) {
          // Find the corresponding tool result
          const toolResult = step.toolResults?.find(
            (tr) => tr.toolCallId === tc.toolCallId
          );

          // Parse the result to check for success/error
          let success = true;
          let resultData: unknown = toolResult?.result;
          let error: string | undefined;

          if (resultData && typeof resultData === "object" && resultData !== null) {
            const resultObj = resultData as Record<string, unknown>;
            if (resultObj.success === false) {
              success = false;
              error = (resultObj.error as string) || "Tool execution failed";
            }
            // Extract the actual data if wrapped in success response
            if (resultObj.data !== undefined) {
              resultData = resultObj.data;
            }
          }

          toolCalls.push({
            id: tc.toolCallId,
            name: tc.toolName,
            args: tc.args as Record<string, unknown>,
            success,
            result: resultData,
            error,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: {
        role: "assistant",
        content: result.text || "",
      },
      toolCalls: toolCalls.length > 0 ? toolCalls : null,
      usage: {
        promptTokens: result.usage?.inputTokens || 0,
        completionTokens: result.usage?.outputTokens || 0,
        totalTokens: (result.usage?.inputTokens || 0) + (result.usage?.outputTokens || 0),
      },
    });
  } catch (error) {
    console.error("[AI_CHAT]", error);
    const errorMessage =
      error instanceof Error ? error.message : "Chat request failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * GET /api/ai/chat
 * Returns available tools for the chat interface
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tools = await getEnabledTools();

    return NextResponse.json({
      success: true,
      tools: tools.map((tool) => ({
        name: tool.name,
        displayName: tool.displayName,
        description: tool.description,
        category: tool.category,
      })),
      count: tools.length,
    });
  } catch (error) {
    console.error("[AI_CHAT_GET]", error);
    return NextResponse.json(
      { error: "Failed to get tools" },
      { status: 500 }
    );
  }
}

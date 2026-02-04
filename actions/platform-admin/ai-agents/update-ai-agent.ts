"use server";

import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin";
import { z } from "zod";
import type { AiAgent, AiAgentTool, AiTool, AiSystemPrompt } from "@prisma/client";

// ============================================
// Validation Schema
// ============================================

const updateAgentSchema = z.object({
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(200, "Display name must be 200 characters or less")
    .optional(),
  description: z.string().max(1000, "Description must be 1000 characters or less").optional().nullable(),
  systemPromptId: z.string().optional().nullable(),
  modelProvider: z.enum(["OPENAI", "ANTHROPIC"]).optional(),
  modelName: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(128000).optional(),
  maxSteps: z.number().int().min(1).max(20).optional(),
  toolChoice: z.enum(["AUTO", "REQUIRED", "NONE"]).optional(),
  isEnabled: z.boolean().optional(),
  toolIds: z.array(z.string()).optional(),
});

type UpdateAgentInput = z.infer<typeof updateAgentSchema>;

// ============================================
// Types
// ============================================

interface AiAgentWithRelations extends AiAgent {
  systemPrompt: AiSystemPrompt | null;
  tools: Array<AiAgentTool & { tool: AiTool }>;
}

// ============================================
// Server Actions
// ============================================

export async function updateAiAgent(
  agentId: string,
  input: UpdateAgentInput
): Promise<{
  success: boolean;
  agent?: AiAgentWithRelations;
  error?: string;
}> {
  try {
    const admin = await requirePlatformAdmin();

    // Validate input
    const validationResult = updateAgentSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || "Invalid input",
      };
    }

    const data = validationResult.data;

    // Check if agent exists
    const existing = await prismadb.aiAgent.findUnique({
      where: { id: agentId },
    });

    if (!existing) {
      return { success: false, error: "Agent not found" };
    }

    // Validate system prompt if provided
    if (data.systemPromptId) {
      const prompt = await prismadb.aiSystemPrompt.findUnique({
        where: { id: data.systemPromptId },
      });
      if (!prompt) {
        return { success: false, error: "System prompt not found" };
      }
    }

    // Validate tools if provided
    if (data.toolIds && data.toolIds.length > 0) {
      const tools = await prismadb.aiTool.findMany({
        where: { id: { in: data.toolIds } },
      });
      if (tools.length !== data.toolIds.length) {
        return { success: false, error: "One or more tools not found" };
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.systemPromptId !== undefined) updateData.systemPromptId = data.systemPromptId;
    if (data.modelProvider !== undefined) updateData.modelProvider = data.modelProvider;
    if (data.modelName !== undefined) updateData.modelName = data.modelName;
    if (data.temperature !== undefined) updateData.temperature = data.temperature;
    if (data.maxTokens !== undefined) updateData.maxTokens = data.maxTokens;
    if (data.maxSteps !== undefined) updateData.maxSteps = data.maxSteps;
    if (data.toolChoice !== undefined) updateData.toolChoice = data.toolChoice;
    if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled;

    // Use transaction if updating tools
    if (data.toolIds !== undefined) {
      const agent = await prismadb.$transaction(async (tx) => {
        // Delete existing tool associations
        await tx.aiAgentTool.deleteMany({
          where: { agentId },
        });

        // Update agent and create new tool associations
        return tx.aiAgent.update({
          where: { id: agentId },
          data: {
            ...updateData,
            tools: {
              create: data.toolIds!.map((toolId, index) => ({
                toolId,
                priority: index,
                isRequired: false,
              })),
            },
          },
          include: {
            systemPrompt: true,
            tools: {
              include: {
                tool: true,
              },
              orderBy: {
                priority: "asc",
              },
            },
          },
        });
      });

      // Log admin action
      await logAdminAction(
        admin.id,
        "UPDATE_AI_AGENT",
        agent.id,
        {
          name: agent.name,
          updatedFields: Object.keys(data),
        }
      );

      return { success: true, agent: agent as AiAgentWithRelations };
    }

    // Simple update without tools
    const agent = await prismadb.aiAgent.update({
      where: { id: agentId },
      data: updateData,
      include: {
        systemPrompt: true,
        tools: {
          include: {
            tool: true,
          },
          orderBy: {
            priority: "asc",
          },
        },
      },
    });

    // Log admin action
    await logAdminAction(
      admin.id,
      "UPDATE_AI_AGENT",
      agent.id,
      {
        name: agent.name,
        updatedFields: Object.keys(data),
      }
    );

    return { success: true, agent: agent as AiAgentWithRelations };
  } catch (error) {
    console.error("[UPDATE_AI_AGENT]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update agent",
    };
  }
}

/**
 * Toggle agent enabled status
 */
export async function toggleAiAgent(
  agentId: string,
  isEnabled: boolean
): Promise<{
  success: boolean;
  agent?: AiAgentWithRelations;
  error?: string;
}> {
  try {
    const admin = await requirePlatformAdmin();

    const agent = await prismadb.aiAgent.update({
      where: { id: agentId },
      data: { isEnabled },
      include: {
        systemPrompt: true,
        tools: {
          include: {
            tool: true,
          },
          orderBy: {
            priority: "asc",
          },
        },
      },
    });

    // Log admin action
    await logAdminAction(
      admin.id,
      isEnabled ? "ENABLE_AI_AGENT" : "DISABLE_AI_AGENT",
      agent.id,
      {
        name: agent.name,
        isEnabled,
      }
    );

    return { success: true, agent: agent as AiAgentWithRelations };
  } catch (error) {
    console.error("[TOGGLE_AI_AGENT]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle agent",
    };
  }
}

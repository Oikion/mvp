"use server";

import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin";
import { z } from "zod";
import type { AiAgent, AiAgentTool, AiTool, AiSystemPrompt } from "@prisma/client";

// ============================================
// Validation Schema
// ============================================

const createAgentSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .regex(
      /^[a-z][a-z0-9_]*$/,
      "Name must start with a letter and contain only lowercase letters, numbers, and underscores"
    ),
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(200, "Display name must be 200 characters or less"),
  description: z.string().max(1000, "Description must be 1000 characters or less").optional(),
  systemPromptId: z.string().optional().nullable(),
  modelProvider: z.enum(["OPENAI", "ANTHROPIC"]),
  modelName: z.string().min(1, "Model name is required"),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().min(1).max(128000).default(1000),
  maxSteps: z.number().int().min(1).max(20).default(5),
  toolChoice: z.enum(["AUTO", "REQUIRED", "NONE"]).default("AUTO"),
  isEnabled: z.boolean().default(true),
  isSystemAgent: z.boolean().default(false),
  toolIds: z.array(z.string()).default([]),
});

type CreateAgentInput = z.infer<typeof createAgentSchema>;

// ============================================
// Types
// ============================================

interface AiAgentWithRelations extends AiAgent {
  systemPrompt: AiSystemPrompt | null;
  tools: Array<AiAgentTool & { tool: AiTool }>;
}

// ============================================
// Server Action
// ============================================

export async function createAiAgent(
  input: CreateAgentInput
): Promise<{
  success: boolean;
  agent?: AiAgentWithRelations;
  error?: string;
}> {
  try {
    const admin = await requirePlatformAdmin();

    // Validate input
    const validationResult = createAgentSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || "Invalid input",
      };
    }

    const data = validationResult.data;

    // Check if name already exists
    const existing = await prismadb.aiAgent.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      return {
        success: false,
        error: `An agent with the name "${data.name}" already exists`,
      };
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
    if (data.toolIds.length > 0) {
      const tools = await prismadb.aiTool.findMany({
        where: { id: { in: data.toolIds } },
      });
      if (tools.length !== data.toolIds.length) {
        return { success: false, error: "One or more tools not found" };
      }
    }

    // Create agent
    const agent = await prismadb.aiAgent.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        description: data.description || null,
        systemPromptId: data.systemPromptId || null,
        modelProvider: data.modelProvider,
        modelName: data.modelName,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
        maxSteps: data.maxSteps,
        toolChoice: data.toolChoice,
        isEnabled: data.isEnabled,
        isSystemAgent: data.isSystemAgent,
        createdById: admin.id,
        // Create tool associations
        tools: {
          create: data.toolIds.map((toolId, index) => ({
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

    // Log admin action
    await logAdminAction(
      admin.id,
      "CREATE_AI_AGENT",
      agent.id,
      {
        name: agent.name,
        displayName: agent.displayName,
        modelProvider: agent.modelProvider,
        modelName: agent.modelName,
        toolCount: data.toolIds.length,
      }
    );

    return { success: true, agent: agent as AiAgentWithRelations };
  } catch (error) {
    console.error("[CREATE_AI_AGENT]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create agent",
    };
  }
}

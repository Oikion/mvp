"use server";

import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin";
import { z } from "zod";
import type { AiTool, AiToolEndpointType } from "@prisma/client";

// Validation schema for creating an AI tool
const createAiToolSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100)
    .regex(/^[a-z][a-z0-9_]*$/, "Name must be lowercase, start with a letter, and contain only letters, numbers, and underscores"),
  displayName: z.string().min(1, "Display name is required").max(200),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000),
  category: z.string().min(1, "Category is required").max(50),
  parameters: z.record(z.any()).refine(
    (val) => {
      // Basic JSON Schema validation
      return val.type === "object" && typeof val.properties === "object";
    },
    { message: "Parameters must be a valid JSON Schema with type 'object' and properties" }
  ),
  endpointType: z.enum(["INTERNAL_ACTION", "API_ROUTE", "EXTERNAL_URL"]),
  endpointPath: z.string().min(1, "Endpoint path is required").max(500),
  httpMethod: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("POST"),
  requiredScopes: z.array(z.string()).default([]),
  isEnabled: z.boolean().default(true),
  isSystemTool: z.boolean().default(false),
});

export type CreateAiToolInput = z.infer<typeof createAiToolSchema>;

interface CreateAiToolResult {
  success: boolean;
  tool?: AiTool;
  error?: string;
}

/**
 * Create a new AI tool
 */
export async function createAiTool(input: CreateAiToolInput): Promise<CreateAiToolResult> {
  try {
    const admin = await requirePlatformAdmin();

    // Validate input
    const validation = createAiToolSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    const data = validation.data;

    // Check if tool with same name already exists
    const existing = await prismadb.aiTool.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      return { success: false, error: `A tool with the name "${data.name}" already exists` };
    }

    // Create the tool
    const tool = await prismadb.aiTool.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        category: data.category,
        parameters: data.parameters,
        endpointType: data.endpointType as AiToolEndpointType,
        endpointPath: data.endpointPath,
        httpMethod: data.httpMethod,
        requiredScopes: data.requiredScopes,
        isEnabled: data.isEnabled,
        isSystemTool: data.isSystemTool,
        createdById: admin.clerkId,
      },
    });

    // Log the action
    await logAdminAction(admin.clerkId, "CREATE_AI_TOOL", tool.id, {
      name: tool.name,
      category: tool.category,
      endpointType: tool.endpointType,
    });

    return { success: true, tool };
  } catch (error) {
    console.error("[CREATE_AI_TOOL]", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create AI tool";
    return { success: false, error: errorMessage };
  }
}

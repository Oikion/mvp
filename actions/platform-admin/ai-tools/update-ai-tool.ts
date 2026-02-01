"use server";

import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin";
import { z } from "zod";
import type { AiTool, AiToolEndpointType } from "@prisma/client";

// Validation schema for updating an AI tool
const updateAiToolSchema = z.object({
  id: z.string().min(1, "Tool ID is required"),
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z][a-z0-9_]*$/, "Name must be lowercase, start with a letter, and contain only letters, numbers, and underscores")
    .optional(),
  displayName: z.string().min(1).max(200).optional(),
  description: z.string().min(10).max(2000).optional(),
  category: z.string().min(1).max(50).optional(),
  parameters: z
    .record(z.any())
    .refine(
      (val) => {
        return val.type === "object" && typeof val.properties === "object";
      },
      { message: "Parameters must be a valid JSON Schema with type 'object' and properties" }
    )
    .optional(),
  endpointType: z.enum(["INTERNAL_ACTION", "API_ROUTE", "EXTERNAL_URL"]).optional(),
  endpointPath: z.string().min(1).max(500).optional(),
  httpMethod: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  requiredScopes: z.array(z.string()).optional(),
  isEnabled: z.boolean().optional(),
});

export type UpdateAiToolInput = z.infer<typeof updateAiToolSchema>;

interface UpdateAiToolResult {
  success: boolean;
  tool?: AiTool;
  error?: string;
}

/**
 * Update an existing AI tool
 */
export async function updateAiTool(input: UpdateAiToolInput): Promise<UpdateAiToolResult> {
  try {
    const admin = await requirePlatformAdmin();

    // Validate input
    const validation = updateAiToolSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    const { id, ...data } = validation.data;

    // Check if tool exists
    const existing = await prismadb.aiTool.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false, error: "Tool not found" };
    }

    // If name is being changed, check for conflicts
    if (data.name && data.name !== existing.name) {
      const nameConflict = await prismadb.aiTool.findUnique({
        where: { name: data.name },
      });

      if (nameConflict) {
        return { success: false, error: `A tool with the name "${data.name}" already exists` };
      }
    }

    // Build update data
    const updateData: Partial<AiTool> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.parameters !== undefined) updateData.parameters = data.parameters;
    if (data.endpointType !== undefined) updateData.endpointType = data.endpointType as AiToolEndpointType;
    if (data.endpointPath !== undefined) updateData.endpointPath = data.endpointPath;
    if (data.httpMethod !== undefined) updateData.httpMethod = data.httpMethod;
    if (data.requiredScopes !== undefined) updateData.requiredScopes = data.requiredScopes;
    if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled;

    // Update the tool
    const tool = await prismadb.aiTool.update({
      where: { id },
      data: updateData,
    });

    // Log the action
    await logAdminAction(admin.clerkId, "UPDATE_AI_TOOL", tool.id, {
      name: tool.name,
      changedFields: Object.keys(updateData),
    });

    return { success: true, tool };
  } catch (error) {
    console.error("[UPDATE_AI_TOOL]", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update AI tool";
    return { success: false, error: errorMessage };
  }
}

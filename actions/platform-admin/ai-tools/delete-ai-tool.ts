"use server";

import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin";
import { z } from "zod";

const deleteAiToolSchema = z.object({
  id: z.string().min(1, "Tool ID is required"),
  confirmName: z.string().min(1, "Please confirm the tool name"),
});

interface DeleteAiToolResult {
  success: boolean;
  error?: string;
}

/**
 * Delete an AI tool
 * System tools cannot be deleted, only disabled
 */
export async function deleteAiTool(
  id: string,
  confirmName: string
): Promise<DeleteAiToolResult> {
  try {
    const admin = await requirePlatformAdmin();

    // Validate input
    const validation = deleteAiToolSchema.safeParse({ id, confirmName });
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    // Check if tool exists
    const tool = await prismadb.aiTool.findUnique({
      where: { id },
    });

    if (!tool) {
      return { success: false, error: "Tool not found" };
    }

    // Verify confirmation name matches
    if (tool.name !== confirmName) {
      return {
        success: false,
        error: "Tool name does not match. Please enter the exact tool name to confirm deletion.",
      };
    }

    // Prevent deletion of system tools
    if (tool.isSystemTool) {
      return {
        success: false,
        error: "System tools cannot be deleted. You can disable them instead.",
      };
    }

    // Delete the tool (cascades to executions)
    await prismadb.aiTool.delete({
      where: { id },
    });

    // Log the action
    await logAdminAction(admin.clerkId, "DELETE_AI_TOOL", id, {
      name: tool.name,
      category: tool.category,
    });

    return { success: true };
  } catch (error) {
    console.error("[DELETE_AI_TOOL]", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to delete AI tool";
    return { success: false, error: errorMessage };
  }
}

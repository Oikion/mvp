"use server";

import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin";
import type { AiTool } from "@prisma/client";

interface ToggleAiToolResult {
  success: boolean;
  tool?: AiTool;
  error?: string;
}

/**
 * Enable or disable an AI tool
 */
export async function toggleAiTool(
  id: string,
  isEnabled: boolean
): Promise<ToggleAiToolResult> {
  try {
    const admin = await requirePlatformAdmin();

    // Check if tool exists
    const existing = await prismadb.aiTool.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false, error: "Tool not found" };
    }

    // Update the tool
    const tool = await prismadb.aiTool.update({
      where: { id },
      data: { isEnabled },
    });

    // Log the action
    await logAdminAction(
      admin.clerkId,
      isEnabled ? "ENABLE_AI_TOOL" : "DISABLE_AI_TOOL",
      tool.id,
      { name: tool.name }
    );

    return { success: true, tool };
  } catch (error) {
    console.error("[TOGGLE_AI_TOOL]", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to toggle AI tool";
    return { success: false, error: errorMessage };
  }
}

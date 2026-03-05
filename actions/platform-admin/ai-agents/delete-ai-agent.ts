"use server";

import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin";

/**
 * Delete an AI agent
 *
 * Note: System agents cannot be deleted. The agent must have its name
 * confirmed for deletion as a safety measure.
 */
export async function deleteAiAgent(
  agentId: string,
  confirmName: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const admin = await requirePlatformAdmin();

    // Get agent
    const agent = await prismadb.aiAgent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return { success: false, error: "Agent not found" };
    }

    // Cannot delete system agents
    if (agent.isSystemAgent) {
      return {
        success: false,
        error: "System agents cannot be deleted. Disable it instead.",
      };
    }

    // Confirm name matches
    if (agent.name !== confirmName) {
      return {
        success: false,
        error: "Agent name does not match. Please enter the exact agent name to confirm deletion.",
      };
    }

    // Delete agent (cascade will delete tool associations and org configs)
    await prismadb.aiAgent.delete({
      where: { id: agentId },
    });

    // Log admin action
    await logAdminAction(
      admin.id,
      "DELETE_AI_AGENT",
      agentId,
      {
        name: agent.name,
        displayName: agent.displayName,
      }
    );

    return { success: true };
  } catch (error) {
    console.error("[DELETE_AI_AGENT]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete agent",
    };
  }
}

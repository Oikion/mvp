"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getActiveN8nConfig, runN8nWorkflow } from "@/lib/n8n-admin";

// ============================================
// TYPES
// ============================================

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface N8nWorkflowInfo {
  id: string;
  workflowId: string;
  workflowName: string;
  isActive: boolean;
  lastRunAt: Date | null;
  lastRunStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface N8nIntegrationStatus {
  isConfigured: boolean;
  isActive: boolean;
  baseUrl?: string;
  lastHealthCheck?: Date | null;
  lastHealthStatus?: string | null;
}

// ============================================
// GET N8N INTEGRATION STATUS
// ============================================

/**
 * Check if the organization has n8n configured
 */
export async function getN8nIntegrationStatus(): Promise<
  ActionResult<N8nIntegrationStatus>
> {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const config = await prismadb.n8nConfig.findUnique({
      where: { organizationId },
      select: {
        isActive: true,
        baseUrl: true,
        lastHealthCheck: true,
        lastHealthStatus: true,
      },
    });

    if (!config) {
      return {
        success: true,
        data: {
          isConfigured: false,
          isActive: false,
        },
      };
    }

    return {
      success: true,
      data: {
        isConfigured: true,
        isActive: config.isActive,
        baseUrl: config.baseUrl,
        lastHealthCheck: config.lastHealthCheck,
        lastHealthStatus: config.lastHealthStatus,
      },
    };
  } catch (error) {
    console.error("[N8N_GET_INTEGRATION_STATUS]", error);
    return { success: false, error: "Failed to get n8n integration status" };
  }
}

// ============================================
// GET MY WORKFLOWS
// ============================================

/**
 * Get n8n workflows assigned to the current user
 */
export async function getMyN8nWorkflows(): Promise<
  ActionResult<N8nWorkflowInfo[]>
> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const organizationId = await getCurrentOrgId();

    // Check if n8n is configured for the org
    const config = await prismadb.n8nConfig.findUnique({
      where: { organizationId },
      select: { isActive: true },
    });

    if (!config?.isActive) {
      return { success: true, data: [] };
    }

    // Get workflows assigned to this agent
    const workflows = await prismadb.n8nAgentWorkflow.findMany({
      where: {
        organizationId,
        agentId: userId,
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        workflowId: true,
        workflowName: true,
        isActive: true,
        lastRunAt: true,
        lastRunStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { success: true, data: workflows };
  } catch (error) {
    console.error("[N8N_GET_MY_WORKFLOWS]", error);
    return { success: false, error: "Failed to get assigned workflows" };
  }
}

// ============================================
// RUN WORKFLOW
// ============================================

/**
 * Trigger a workflow run for the current user
 */
export async function runMyN8nWorkflow(
  workflowId: string
): Promise<ActionResult<{ executionId?: string }>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const organizationId = await getCurrentOrgId();

    // Verify the workflow is assigned to this agent
    const assignment = await prismadb.n8nAgentWorkflow.findUnique({
      where: {
        organizationId_agentId_workflowId: {
          organizationId,
          agentId: userId,
          workflowId,
        },
      },
    });

    if (!assignment) {
      return { success: false, error: "Workflow not assigned to you" };
    }

    if (!assignment.isActive) {
      return { success: false, error: "Workflow is not active" };
    }

    // Get n8n config
    const config = await getActiveN8nConfig();
    if (!config?.baseUrl) {
      return { success: false, error: "n8n not configured" };
    }

    // Run the workflow
    const result = await runN8nWorkflow(config.baseUrl, workflowId);

    // Update last run status
    await prismadb.n8nAgentWorkflow.update({
      where: { id: assignment.id },
      data: {
        lastRunAt: new Date(),
        lastRunStatus: "success",
      },
    });

    revalidatePath("/profile");

    return {
      success: true,
      data: {
        executionId: (result as { id?: string })?.id,
      },
    };
  } catch (error) {
    console.error("[N8N_RUN_MY_WORKFLOW]", error);

    // Try to update status to error if we know the workflow
    try {
      const { userId } = await auth();
      const organizationId = await getCurrentOrgId();
      
      if (userId) {
        await prismadb.n8nAgentWorkflow.updateMany({
          where: {
            organizationId,
            agentId: userId,
            workflowId,
          },
          data: {
            lastRunAt: new Date(),
            lastRunStatus: "error",
          },
        });
      }
    } catch {
      // Ignore update error
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to run workflow",
    };
  }
}

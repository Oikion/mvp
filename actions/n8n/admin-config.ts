"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { isOrgAdmin } from "@/lib/org-admin";
import { revalidatePath } from "next/cache";
import { listN8nWorkflows, type N8nWorkflow } from "@/lib/n8n-admin";
import { requireAction } from "@/lib/permissions/action-guards";

// ============================================
// TYPES
// ============================================

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface N8nConfigInput {
  baseUrl: string;
  webhookSecret: string;
  isActive?: boolean;
}

export interface N8nConfigData {
  id: string;
  organizationId: string;
  baseUrl: string;
  webhookSecret: string;
  isActive: boolean;
  lastHealthCheck: Date | null;
  lastHealthStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowAssignment {
  id: string;
  organizationId: string;
  agentId: string;
  workflowId: string;
  workflowName: string;
  isActive: boolean;
  lastRunAt: Date | null;
  lastRunStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// GET N8N CONFIG
// ============================================

/**
 * Get N8N configuration for the current organization
 */
export async function getN8nConfig(): Promise<ActionResult<N8nConfigData | null>> {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const config = await prismadb.n8nConfig.findUnique({
      where: { organizationId },
    });

    return { success: true, data: config };
  } catch (error) {
    console.error("[N8N_GET_CONFIG]", error);
    return { success: false, error: "Failed to get n8n configuration" };
  }
}

// ============================================
// SAVE N8N CONFIG
// ============================================

/**
 * Create or update N8N configuration for the organization
 */
export async function saveN8nConfig(
  input: N8nConfigInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // Permission check: Only owners can manage n8n configuration
    const guard = await requireAction("n8n:manage_config");
    if (guard) return { success: false, error: guard.error || "Permission denied" };

    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Check admin permission
    const isAdmin = await isOrgAdmin();
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    const { baseUrl, webhookSecret, isActive } = input;

    // Validate required fields
    if (!baseUrl || !webhookSecret) {
      return {
        success: false,
        error: "Base URL and webhook secret are required",
      };
    }

    // Validate URL format
    try {
      new URL(baseUrl);
    } catch {
      return { success: false, error: "Invalid base URL format" };
    }

    // Upsert config
    const config = await prismadb.n8nConfig.upsert({
      where: { organizationId },
      create: {
        organizationId,
        baseUrl: baseUrl.replace(/\/+$/, ""), // Remove trailing slashes
        webhookSecret,
        isActive: isActive ?? false,
      },
      update: {
        baseUrl: baseUrl.replace(/\/+$/, ""),
        webhookSecret,
        isActive: isActive ?? false,
      },
      select: { id: true },
    });

    revalidatePath("/app/admin/n8n");
    revalidatePath("/app/profile");

    return { success: true, data: { id: config.id } };
  } catch (error) {
    console.error("[N8N_SAVE_CONFIG]", error);
    return { success: false, error: "Failed to save n8n configuration" };
  }
}

/**
 * Toggle N8N integration active status
 */
export async function toggleN8nConfig(
  isActive: boolean
): Promise<ActionResult> {
  try {
    // Permission check: Only owners can manage n8n configuration
    const guard = await requireAction("n8n:manage_config");
    if (guard) return { success: false, error: guard.error || "Permission denied" };

    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Check admin permission
    const isAdmin = await isOrgAdmin();
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    await prismadb.n8nConfig.update({
      where: { organizationId },
      data: { isActive },
    });

    revalidatePath("/app/admin/n8n");
    revalidatePath("/app/profile");

    return { success: true };
  } catch (error) {
    console.error("[N8N_TOGGLE_CONFIG]", error);
    return { success: false, error: "Failed to toggle n8n integration" };
  }
}

/**
 * Delete N8N configuration and all workflow assignments
 */
export async function deleteN8nConfig(): Promise<ActionResult> {
  try {
    // Permission check: Only owners can manage n8n configuration
    const guard = await requireAction("n8n:manage_config");
    if (guard) return { success: false, error: guard.error || "Permission denied" };

    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Check admin permission
    const isAdmin = await isOrgAdmin();
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    // Delete all workflow assignments first
    await prismadb.n8nAgentWorkflow.deleteMany({
      where: { organizationId },
    });

    // Delete config
    await prismadb.n8nConfig.delete({
      where: { organizationId },
    });

    revalidatePath("/app/admin/n8n");
    revalidatePath("/app/profile");

    return { success: true };
  } catch (error) {
    console.error("[N8N_DELETE_CONFIG]", error);
    return { success: false, error: "Failed to delete n8n configuration" };
  }
}

// ============================================
// TEST CONNECTION
// ============================================

/**
 * Test connection to n8n instance
 */
export async function testN8nConnection(): Promise<
  ActionResult<{ healthy: boolean; workflowCount: number }>
> {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const config = await prismadb.n8nConfig.findUnique({
      where: { organizationId },
    });

    if (!config) {
      return { success: false, error: "n8n not configured" };
    }

    try {
      const workflows = await listN8nWorkflows(config.baseUrl);
      
      // Update health check status
      await prismadb.n8nConfig.update({
        where: { organizationId },
        data: {
          lastHealthCheck: new Date(),
          lastHealthStatus: "healthy",
        },
      });

      return {
        success: true,
        data: { healthy: true, workflowCount: workflows.length },
      };
    } catch (error) {
      // Update health check status to error
      await prismadb.n8nConfig.update({
        where: { organizationId },
        data: {
          lastHealthCheck: new Date(),
          lastHealthStatus: "error",
        },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }
  } catch (error) {
    console.error("[N8N_TEST_CONNECTION]", error);
    return { success: false, error: "Failed to test connection" };
  }
}

// ============================================
// LIST AVAILABLE WORKFLOWS
// ============================================

/**
 * List available workflows from the n8n instance
 */
export async function listAvailableWorkflows(): Promise<
  ActionResult<N8nWorkflow[]>
> {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const config = await prismadb.n8nConfig.findUnique({
      where: { organizationId },
    });

    if (!config) {
      return { success: false, error: "n8n not configured" };
    }

    if (!config.isActive) {
      return { success: false, error: "n8n integration is not active" };
    }

    const workflows = await listN8nWorkflows(config.baseUrl);
    return { success: true, data: workflows };
  } catch (error) {
    console.error("[N8N_LIST_WORKFLOWS]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list workflows",
    };
  }
}

// ============================================
// WORKFLOW ASSIGNMENTS
// ============================================

/**
 * Get all workflow assignments for the organization
 */
export async function getWorkflowAssignments(): Promise<
  ActionResult<WorkflowAssignment[]>
> {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const assignments = await prismadb.n8nAgentWorkflow.findMany({
      where: { organizationId },
      orderBy: [{ agentId: "asc" }, { workflowName: "asc" }],
    });

    return { success: true, data: assignments };
  } catch (error) {
    console.error("[N8N_GET_ASSIGNMENTS]", error);
    return { success: false, error: "Failed to get workflow assignments" };
  }
}

/**
 * Assign a workflow to an agent
 */
export async function assignWorkflowToAgent(
  workflowId: string,
  agentId: string,
  workflowName: string
): Promise<ActionResult<{ id: string }>> {
  try {
    // Permission check: Only owners can manage n8n workflows
    const guard = await requireAction("n8n:manage_workflows");
    if (guard) return { success: false, error: guard.error || "Permission denied" };

    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Check admin permission
    const isAdmin = await isOrgAdmin();
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    // Check if assignment already exists
    const existing = await prismadb.n8nAgentWorkflow.findUnique({
      where: {
        organizationId_agentId_workflowId: {
          organizationId,
          agentId,
          workflowId,
        },
      },
    });

    if (existing) {
      return { success: false, error: "Workflow already assigned to this agent" };
    }

    const assignment = await prismadb.n8nAgentWorkflow.create({
      data: {
        organizationId,
        agentId,
        workflowId,
        workflowName,
        isActive: true,
      },
      select: { id: true },
    });

    revalidatePath("/app/admin/n8n");
    revalidatePath("/app/profile");

    return { success: true, data: { id: assignment.id } };
  } catch (error) {
    console.error("[N8N_ASSIGN_WORKFLOW]", error);
    return { success: false, error: "Failed to assign workflow" };
  }
}

/**
 * Remove a workflow assignment
 */
export async function removeWorkflowAssignment(
  assignmentId: string
): Promise<ActionResult> {
  try {
    // Permission check: Only owners can manage n8n workflows
    const guard = await requireAction("n8n:manage_workflows");
    if (guard) return { success: false, error: guard.error || "Permission denied" };

    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Check admin permission
    const isAdmin = await isOrgAdmin();
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    // Verify assignment belongs to this org
    const assignment = await prismadb.n8nAgentWorkflow.findFirst({
      where: {
        id: assignmentId,
        organizationId,
      },
    });

    if (!assignment) {
      return { success: false, error: "Assignment not found" };
    }

    await prismadb.n8nAgentWorkflow.delete({
      where: { id: assignmentId },
    });

    revalidatePath("/app/admin/n8n");
    revalidatePath("/app/profile");

    return { success: true };
  } catch (error) {
    console.error("[N8N_REMOVE_ASSIGNMENT]", error);
    return { success: false, error: "Failed to remove assignment" };
  }
}

/**
 * Toggle workflow assignment active status
 */
export async function toggleWorkflowAssignment(
  assignmentId: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    // Permission check: Only owners can manage n8n workflows
    const guard = await requireAction("n8n:manage_workflows");
    if (guard) return { success: false, error: guard.error || "Permission denied" };

    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Check admin permission
    const isAdmin = await isOrgAdmin();
    if (!isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    // Verify assignment belongs to this org
    const assignment = await prismadb.n8nAgentWorkflow.findFirst({
      where: {
        id: assignmentId,
        organizationId,
      },
    });

    if (!assignment) {
      return { success: false, error: "Assignment not found" };
    }

    await prismadb.n8nAgentWorkflow.update({
      where: { id: assignmentId },
      data: { isActive },
    });

    revalidatePath("/app/admin/n8n");
    revalidatePath("/app/profile");

    return { success: true };
  } catch (error) {
    console.error("[N8N_TOGGLE_ASSIGNMENT]", error);
    return { success: false, error: "Failed to toggle assignment" };
  }
}

// ============================================
// STATS
// ============================================

/**
 * Get N8N integration stats for the organization
 */
export async function getN8nStats(): Promise<
  ActionResult<{
    totalWorkflows: number;
    activeWorkflows: number;
    totalAssignments: number;
    activeAssignments: number;
    lastHealthCheck: Date | null;
    lastHealthStatus: string | null;
  }>
> {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const config = await prismadb.n8nConfig.findUnique({
      where: { organizationId },
      select: {
        lastHealthCheck: true,
        lastHealthStatus: true,
      },
    });

    if (!config) {
      return {
        success: true,
        data: {
          totalWorkflows: 0,
          activeWorkflows: 0,
          totalAssignments: 0,
          activeAssignments: 0,
          lastHealthCheck: null,
          lastHealthStatus: null,
        },
      };
    }

    const [totalAssignments, activeAssignments] = await Promise.all([
      prismadb.n8nAgentWorkflow.count({
        where: { organizationId },
      }),
      prismadb.n8nAgentWorkflow.count({
        where: { organizationId, isActive: true },
      }),
    ]);

    return {
      success: true,
      data: {
        totalWorkflows: 0, // Will be populated when workflows are fetched
        activeWorkflows: 0,
        totalAssignments,
        activeAssignments,
        lastHealthCheck: config.lastHealthCheck,
        lastHealthStatus: config.lastHealthStatus,
      },
    };
  } catch (error) {
    console.error("[N8N_GET_STATS]", error);
    return { success: false, error: "Failed to get stats" };
  }
}

"use server";

import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import type { AiToolExecution, AiToolExecutionSource } from "@prisma/client";

export interface ToolExecutionsParams {
  toolId?: string;
  page?: number;
  limit?: number;
  source?: AiToolExecutionSource;
  organizationId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ToolExecutionWithTool extends AiToolExecution {
  tool: {
    id: string;
    name: string;
    displayName: string;
    category: string;
  };
}

export interface ToolExecutionsResult {
  executions: ToolExecutionWithTool[];
  totalCount: number;
  page: number;
  totalPages: number;
}

/**
 * Get tool execution logs with filtering
 */
export async function getToolExecutions(
  params: ToolExecutionsParams = {}
): Promise<ToolExecutionsResult> {
  try {
    await requirePlatformAdmin();

    const {
      toolId,
      page = 1,
      limit = 50,
      source,
      organizationId,
      startDate,
      endDate,
    } = params;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      toolId?: string;
      source?: AiToolExecutionSource;
      organizationId?: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = {};

    if (toolId) {
      where.toolId = toolId;
    }

    if (source) {
      where.source = source;
    }

    if (organizationId) {
      where.organizationId = organizationId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    // Fetch executions and count
    const [executions, totalCount] = await Promise.all([
      prismadb.aiToolExecution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          tool: {
            select: {
              id: true,
              name: true,
              displayName: true,
              category: true,
            },
          },
        },
      }),
      prismadb.aiToolExecution.count({ where }),
    ]);

    return {
      executions: executions as ToolExecutionWithTool[],
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    };
  } catch (error) {
    console.error("[GET_TOOL_EXECUTIONS]", error);
    throw error;
  }
}

/**
 * Get execution statistics by source
 */
export async function getExecutionStatsBySource(
  startDate?: Date,
  endDate?: Date
): Promise<Record<AiToolExecutionSource, number>> {
  try {
    await requirePlatformAdmin();

    const where: { createdAt?: { gte?: Date; lte?: Date } } = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const stats = await prismadb.aiToolExecution.groupBy({
      by: ["source"],
      where,
      _count: { id: true },
    });

    const result: Record<string, number> = {
      VOICE_ASSISTANT: 0,
      CHAT_API: 0,
      EXTERNAL_API: 0,
      ADMIN_TEST: 0,
    };

    for (const stat of stats) {
      result[stat.source] = stat._count.id;
    }

    return result as Record<AiToolExecutionSource, number>;
  } catch (error) {
    console.error("[GET_EXECUTION_STATS_BY_SOURCE]", error);
    throw error;
  }
}

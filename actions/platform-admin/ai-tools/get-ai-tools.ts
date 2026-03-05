"use server";

import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin";
import type { AiTool, AiToolEndpointType } from "@prisma/client";

export interface AiToolsListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isEnabled?: boolean;
  isSystemTool?: boolean;
}

export interface AiToolsListResult {
  tools: AiTool[];
  totalCount: number;
  page: number;
  totalPages: number;
}

/**
 * Get all AI tools with filtering and pagination
 */
export async function getAiTools(params: AiToolsListParams = {}): Promise<AiToolsListResult> {
  try {
    await requirePlatformAdmin();

    const {
      page = 1,
      limit = 20,
      search,
      category,
      isEnabled,
      isSystemTool,
    } = params;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      name?: { contains: string; mode: "insensitive" };
      displayName?: { contains: string; mode: "insensitive" };
      category?: string;
      isEnabled?: boolean;
      isSystemTool?: boolean;
      OR?: Array<{
        name?: { contains: string; mode: "insensitive" };
        displayName?: { contains: string; mode: "insensitive" };
        description?: { contains: string; mode: "insensitive" };
      }>;
    } = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (typeof isEnabled === "boolean") {
      where.isEnabled = isEnabled;
    }

    if (typeof isSystemTool === "boolean") {
      where.isSystemTool = isSystemTool;
    }

    // Fetch tools and count
    const [tools, totalCount] = await Promise.all([
      prismadb.aiTool.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { isSystemTool: "desc" },
          { category: "asc" },
          { displayName: "asc" },
        ],
      }),
      prismadb.aiTool.count({ where }),
    ]);

    return {
      tools,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    };
  } catch (error) {
    console.error("[GET_AI_TOOLS]", error);
    throw error;
  }
}

/**
 * Get a single AI tool by ID
 */
export async function getAiToolById(id: string): Promise<AiTool | null> {
  try {
    await requirePlatformAdmin();

    return await prismadb.aiTool.findUnique({
      where: { id },
    });
  } catch (error) {
    console.error("[GET_AI_TOOL_BY_ID]", error);
    throw error;
  }
}

/**
 * Get a single AI tool by name
 */
export async function getAiToolByName(name: string): Promise<AiTool | null> {
  try {
    return await prismadb.aiTool.findUnique({
      where: { name },
    });
  } catch (error) {
    console.error("[GET_AI_TOOL_BY_NAME]", error);
    throw error;
  }
}

/**
 * Get all unique categories
 */
export async function getAiToolCategories(): Promise<string[]> {
  try {
    await requirePlatformAdmin();

    const categories = await prismadb.aiTool.findMany({
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });

    return categories.map((c) => c.category);
  } catch (error) {
    console.error("[GET_AI_TOOL_CATEGORIES]", error);
    throw error;
  }
}

/**
 * Get tool execution statistics
 */
export async function getAiToolStats(toolId: string): Promise<{
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgDurationMs: number;
  lastExecutedAt: Date | null;
}> {
  try {
    await requirePlatformAdmin();

    const executions = await prismadb.aiToolExecution.findMany({
      where: { toolId },
      select: {
        statusCode: true,
        durationMs: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(
      (e) => e.statusCode >= 200 && e.statusCode < 300
    ).length;
    const failedExecutions = executions.filter((e) => e.statusCode >= 400).length;
    const avgDurationMs =
      totalExecutions > 0
        ? Math.round(executions.reduce((sum, e) => sum + e.durationMs, 0) / totalExecutions)
        : 0;
    const lastExecutedAt = executions[0]?.createdAt || null;

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      avgDurationMs,
      lastExecutedAt,
    };
  } catch (error) {
    console.error("[GET_AI_TOOL_STATS]", error);
    throw error;
  }
}

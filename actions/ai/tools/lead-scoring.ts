"use server";

/**
 * AI Tool Actions - Lead Scoring
 *
 * Computes a lead score with explainable factors.
 */

import { prismadb } from "@/lib/prisma";
import { calculateLeadScore } from "@/lib/ai/lead-scoring-engine";
import {
  type AIToolInput,
  type AIToolResponse,
  extractContext,
  validateContext,
  missingContextError,
  successResponse,
  errorResponse,
} from "./types";

type CalculateLeadScoreInput = {
  clientId: string;
  includeDetails?: boolean;
};

function isRecentActivity(lastActivity?: Date | string | null): boolean {
  if (!lastActivity) {
    return false;
  }
  const activityDate =
    typeof lastActivity === "string" ? new Date(lastActivity) : lastActivity;
  if (Number.isNaN(activityDate.getTime())) {
    return false;
  }
  const diffMs = Date.now() - activityDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= 30;
}

/**
 * Calculate lead score for a client.
 */
export async function calculateLeadScoreTool(
  input: AIToolInput<CalculateLeadScoreInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    if (!input.clientId) {
      return errorResponse("Missing required field: clientId");
    }

    const client = await prismadb.clients.findFirst({
      where: {
        id: input.clientId,
        organizationId: context.organizationId,
      },
      select: {
        client_status: true,
        intent: true,
        budget_min: true,
        budget_max: true,
        timeline: true,
        last_activity: true,
      },
    });

    if (!client) {
      return errorResponse("Client not found");
    }

    const scoringInput = {
      status: client.client_status || undefined,
      intent: client.intent || undefined,
      budgetMin: client.budget_min || undefined,
      budgetMax: client.budget_max || undefined,
      timeline: client.timeline || undefined,
      hasRecentActivity: isRecentActivity(client.last_activity),
    };

    const result = calculateLeadScore(scoringInput);

    if (input.includeDetails) {
      return successResponse(result);
    }

    return successResponse({ score: result.score });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to calculate lead score"
    );
  }
}

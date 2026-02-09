"use server";

/**
 * AI Tool Actions - Lead Qualification
 *
 * Extracts qualification signals from conversation text.
 */

import { prismadb } from "@/lib/prisma";
import { qualifyLeadFromConversation } from "@/lib/ai/lead-qualification";
import {
  type AIToolInput,
  type AIToolResponse,
  extractContext,
  validateContext,
  missingContextError,
  successResponse,
  errorResponse,
} from "./types";

type QualifyLeadConversationInput = {
  clientId: string;
  conversationText?: string;
  updateClient?: boolean;
};

/**
 * Qualify a lead using conversation text and optionally store results.
 */
export async function qualifyLeadConversation(
  input: AIToolInput<QualifyLeadConversationInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    if (!input.clientId) {
      return errorResponse("Missing required field: clientId");
    }
    if (!input.conversationText) {
      return errorResponse("Missing required field: conversationText");
    }

    const client = await prismadb.clients.findFirst({
      where: {
        id: input.clientId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        communication_notes: true,
      },
    });

    if (!client) {
      return errorResponse("Client not found");
    }

    const qualification = qualifyLeadFromConversation(input.conversationText);

    if (input.updateClient) {
      const existingNotes =
        (client.communication_notes as Record<string, unknown>) || {};

      await prismadb.clients.update({
        where: { id: client.id },
        data: {
          communication_notes: {
            ...existingNotes,
            aiQualification: {
              ...qualification,
              updatedAt: new Date().toISOString(),
            },
          },
        },
      });
    }

    return successResponse(qualification);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to qualify lead"
    );
  }
}

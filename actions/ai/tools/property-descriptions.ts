"use server";

/**
 * AI Tool Actions - Property Descriptions
 *
 * Generates listing descriptions using a PQAB structure.
 */

import OpenAI from "openai";
import { prismadb } from "@/lib/prisma";
import {
  getOrgOpenAIKey,
  getOrgOpenAIModel,
  hasExceededAICredits,
  trackAICreditsUsage,
} from "@/lib/org-settings";
import {
  buildPqabDescription,
  mapPropertyToDescriptionInput,
} from "@/lib/ai/property-description-generator";
import {
  type AIToolInput,
  type AIToolResponse,
  extractContext,
  validateContext,
  missingContextError,
  successResponse,
  errorResponse,
} from "./types";

type GeneratePropertyDescriptionInput = {
  propertyId: string;
  tone?: "professional" | "luxury" | "friendly";
  length?: "short" | "medium" | "long";
  includeEmotionalAppeal?: boolean;
  targetAudience?: "buyers" | "investors" | "renters";
};

function buildSystemPrompt(): string {
  return [
    "You are a real estate copywriter.",
    "Write a listing description using the PQAB framework:",
    "Property details, Quality of life, Answers to questions, Buyer emotion.",
    "Keep the tone aligned with the provided instructions.",
    "Do not invent facts. Only use supplied data.",
    "End with a short call to action.",
  ].join(" ");
}

function buildUserPrompt(input: ReturnType<typeof mapPropertyToDescriptionInput>): string {
  return `Property details (JSON): ${JSON.stringify(input)}`;
}

/**
 * Generate a property description with PQAB structure.
 */
export async function generatePropertyDescription(
  input: AIToolInput<GeneratePropertyDescriptionInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const { propertyId, tone, length, includeEmotionalAppeal, targetAudience } = input;

    if (!propertyId) {
      return errorResponse("Missing required field: propertyId");
    }

    const property = await prismadb.properties.findFirst({
      where: { id: propertyId, organizationId: context.organizationId },
      select: {
        property_name: true,
        property_type: true,
        transaction_type: true,
        municipality: true,
        area: true,
        price: true,
        bedrooms: true,
        bathrooms: true,
        size_net_sqm: true,
      },
    });

    if (!property) {
      return errorResponse("Property not found");
    }

    const descriptionInput = {
      ...mapPropertyToDescriptionInput(property),
      tone,
      length,
      includeEmotionalAppeal,
      targetAudience,
    };

    if (context.testMode) {
      return successResponse({
        description: buildPqabDescription(descriptionInput),
        source: "template",
      });
    }

    const exceededCredits = await hasExceededAICredits(context.organizationId);
    if (exceededCredits) {
      return errorResponse("AI credits limit exceeded for organization");
    }

    const apiKey = await getOrgOpenAIKey(context.organizationId);
    if (!apiKey) {
      return successResponse({
        description: buildPqabDescription(descriptionInput),
        source: "template",
        message: "OpenAI key missing; returned template description.",
      });
    }

    const model = await getOrgOpenAIModel(context.organizationId);
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(descriptionInput) },
      ],
      temperature: 0.7,
      max_tokens: 600,
    });

    const description = completion.choices[0]?.message?.content?.trim();
    if (!description) {
      return errorResponse("Failed to generate description");
    }

    const tokensUsed = completion.usage?.total_tokens || 600;
    const creditsUsed = Math.max(1, Math.ceil(tokensUsed / 1000));
    await trackAICreditsUsage(context.organizationId, creditsUsed);

    return successResponse({
      description,
      source: "openai",
      creditsUsed,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to generate description"
    );
  }
}

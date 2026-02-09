"use server";

/**
 * AI Tool Actions - Property Valuation
 *
 * Estimates property value based on comparable listings.
 */

import { prismadb } from "@/lib/prisma";
import { estimatePropertyValue } from "@/lib/ai/property-valuation-engine";
import {
  type AIToolInput,
  type AIToolResponse,
  extractContext,
  validateContext,
  missingContextError,
  successResponse,
  errorResponse,
} from "./types";

type EstimatePropertyValueInput = {
  propertyId?: string;
  address?: string;
  propertyDetails?: {
    bedrooms: number;
    bathrooms: number;
    sqm: number;
    propertyType: string;
    yearBuilt?: number;
  };
  confidenceLevel?: boolean;
};

/**
 * Estimate property value using comparables.
 */
export async function estimatePropertyValueTool(
  input: AIToolInput<EstimatePropertyValueInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    let propertySize = input.propertyDetails?.sqm;
    let municipality: string | null = null;
    let propertyType: string | null = null;
    let transactionType: string | null = null;

    if (input.propertyId) {
      const property = await prismadb.properties.findFirst({
        where: { id: input.propertyId, organizationId: context.organizationId },
        select: {
          size_net_sqm: true,
          municipality: true,
          property_type: true,
          transaction_type: true,
        },
      });

      if (!property) {
        return errorResponse("Property not found");
      }

      propertySize = property.size_net_sqm || propertySize;
      municipality = property.municipality || null;
      propertyType = property.property_type || null;
      transactionType = property.transaction_type || null;
    }

    if (!propertySize) {
      return errorResponse("Property size is required for valuation");
    }

    const comparables = await prismadb.properties.findMany({
      where: {
        organizationId: context.organizationId,
        municipality: municipality || undefined,
        property_type: propertyType || undefined,
        transaction_type: transactionType || undefined,
        price: { not: null },
        size_net_sqm: { not: null },
      },
      select: {
        price: true,
        size_net_sqm: true,
      },
      take: 10,
    });

    const comparablePrices = comparables.filter(
      (item) => item.price && item.size_net_sqm
    );

    if (comparablePrices.length === 0) {
      return errorResponse("Not enough comparables to estimate value");
    }

    const totalPrice = comparablePrices.reduce((sum, item) => sum + (item.price || 0), 0);
    const totalSize = comparablePrices.reduce((sum, item) => sum + (item.size_net_sqm || 0), 0);
    const avgPricePerSqm = totalPrice / totalSize;

    const valuation = estimatePropertyValue({
      sizeNetSqm: propertySize,
      avgPricePerSqm,
      comparableCount: comparablePrices.length,
    });

    return successResponse({
      estimatedValue: valuation.estimatedValue,
      confidenceScore: valuation.confidenceScore,
      avgPricePerSqm: Math.round(avgPricePerSqm),
      comparablesUsed: comparablePrices.length,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to estimate property value"
    );
  }
}

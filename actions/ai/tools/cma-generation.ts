"use server";

/**
 * AI Tool Actions - CMA Generation
 *
 * Produces a comparative market analysis report for a property.
 */

import {
  CMA_COLUMNS,
  generateTablePDF,
} from "@/lib/export";
import { prismadb } from "@/lib/prisma";
import {
  buildCmaSummary,
  type CmaComparable,
  type CmaSubject,
} from "@/lib/ai/cma-generator";
import {
  type AIToolInput,
  type AIToolResponse,
  extractContext,
  validateContext,
  missingContextError,
  successResponse,
  errorResponse,
} from "./types";

type GenerateCmaReportInput = {
  propertyId: string;
  comparableCount?: number;
  radius?: number;
  timeRange?: number;
  includeMarketTrends?: boolean;
  outputFormat?: "pdf" | "html" | "json";
};

function toCmaComparable(property: {
  price: number | null;
  size_net_sqm: number | null;
}): CmaComparable | null {
  if (!property.price || !property.size_net_sqm) {
    return null;
  }
  return {
    price: property.price,
    sizeNetSqm: property.size_net_sqm,
  };
}

function toCmaSubject(property: {
  property_name: string | null;
  price: number | null;
  size_net_sqm: number | null;
}): CmaSubject {
  return {
    propertyName: property.property_name || undefined,
    price: property.price || undefined,
    sizeNetSqm: property.size_net_sqm || undefined,
  };
}

/**
 * Generate a CMA report with comparable properties.
 */
export async function generateCmaReport(
  input: AIToolInput<GenerateCmaReportInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const {
      propertyId,
      comparableCount = 5,
      outputFormat = "json",
    } = input;

    if (!propertyId) {
      return errorResponse("Missing required field: propertyId");
    }

    const subject = await prismadb.properties.findFirst({
      where: { id: propertyId, organizationId: context.organizationId },
      select: {
        id: true,
        property_name: true,
        property_type: true,
        transaction_type: true,
        municipality: true,
        area: true,
        price: true,
        bedrooms: true,
        bathrooms: true,
        size_net_sqm: true,
        createdAt: true,
        address_street: true,
        postal_code: true,
      },
    });

    if (!subject) {
      return errorResponse("Property not found");
    }

    const comparablesRaw = await prismadb.properties.findMany({
      where: {
        organizationId: context.organizationId,
        id: { not: subject.id },
        municipality: subject.municipality,
        property_type: subject.property_type,
        transaction_type: subject.transaction_type,
        price: { not: null },
        size_net_sqm: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: comparableCount,
      select: {
        id: true,
        property_name: true,
        property_type: true,
        property_status: true,
        price: true,
        bedrooms: true,
        bathrooms: true,
        size_net_sqm: true,
        year_built: true,
        condition: true,
        address_street: true,
        municipality: true,
        area: true,
        createdAt: true,
      },
    });

    const comparables = comparablesRaw
      .map((item) => ({
        ...item,
        comparable: toCmaComparable(item),
      }))
      .filter((item) => item.comparable !== null);

    const summary = buildCmaSummary(
      toCmaSubject(subject),
      comparables.map((item) => item.comparable as CmaComparable)
    );

    if (outputFormat === "pdf") {
      if (context.testMode) {
        return successResponse({
          summary,
          comparables,
          pdf: {
            filename: "cma-report.pdf",
            contentType: "application/pdf",
            base64: "dGVzdA==",
          },
        });
      }

      const pdfData = await generateTablePDF(
        "reports",
        comparables.map((item) => ({
          property_name: item.property_name,
          address_full: [item.address_street, item.area, item.municipality]
            .filter(Boolean)
            .join(", "),
          property_type: item.property_type,
          price: item.price,
          price_per_sqm: item.price && item.size_net_sqm
            ? Math.round(item.price / item.size_net_sqm)
            : null,
          square_feet: item.size_net_sqm,
          bedrooms: item.bedrooms,
          bathrooms: item.bathrooms,
          year_built: item.year_built,
          property_status: item.property_status,
          condition: item.condition,
          days_on_market: null,
          notes: "",
        })),
        {
          columns: CMA_COLUMNS,
          title: "CMA Report",
          subtitle: subject.property_name || "Comparative Market Analysis",
        }
      );

      const buffer = Buffer.from(await pdfData.blob.arrayBuffer());

      return successResponse({
        summary,
        comparables,
        pdf: {
          filename: pdfData.filename,
          contentType: pdfData.contentType,
          base64: buffer.toString("base64"),
        },
      });
    }

    return successResponse({
      summary,
      comparables,
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Failed to generate CMA");
  }
}

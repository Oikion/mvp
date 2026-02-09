"use server";

/**
 * AI Tool Actions - Contract Analysis
 *
 * Extracts risk flags and summaries from contract documents.
 */

import { prismadb } from "@/lib/prisma";
import { analyzeContractRisks } from "@/lib/ai/contract-analysis";
import { analyzeDocument } from "@/lib/documents/document-analyzer";
import { getDocumentText } from "@/lib/documents/text-extractor";
import {
  type AIToolInput,
  type AIToolResponse,
  extractContext,
  validateContext,
  missingContextError,
  successResponse,
  errorResponse,
} from "./types";

type AnalyzeContractTermsInput = {
  documentId: string;
  analysisType?: "summary" | "risk" | "comparison";
  compareToStandard?: boolean;
};

/**
 * Analyze contract terms and highlight risks.
 */
export async function analyzeContractTerms(
  input: AIToolInput<AnalyzeContractTermsInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    if (!input.documentId) {
      return errorResponse("Missing required field: documentId");
    }

    const document = await prismadb.documents.findFirst({
      where: {
        id: input.documentId,
        organizationId: context.organizationId,
      },
      select: {
        document_name: true,
        document_file_url: true,
      },
    });

    if (!document) {
      return errorResponse("Document not found");
    }

    const text = await getDocumentText(document.document_file_url);
    const analysis = await analyzeDocument(
      text,
      document.document_name,
      context.organizationId,
      input.analysisType === "risk" ? "summary" : "full"
    );

    const risks = analyzeContractRisks(text);

    return successResponse({
      summary: analysis.summary,
      risks,
      documentType: analysis.documentType,
      comparisonRequested: Boolean(input.compareToStandard),
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to analyze contract"
    );
  }
}

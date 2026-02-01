"use server";

/**
 * AI Tool Actions - Documents
 *
 * Document operations for AI tool execution.
 * These functions receive context directly from the AI executor.
 */

import { prismadb } from "@/lib/prisma";
import {
  type AIToolInput,
  type AIToolResponse,
  extractContext,
  validateContext,
  missingContextError,
  successResponse,
  errorResponse,
} from "./types";

// ============================================
// Types
// ============================================

interface ListDocumentsInput {
  type?: string;
  category?: string;
  search?: string;
  clientId?: string;
  propertyId?: string;
  limit?: number;
  cursor?: string;
}

interface GetDocumentDetailsInput {
  documentId: string;
}

interface AnalyzeDocumentInput {
  documentId: string;
  analysisType?: string;
}

interface ChatWithDocumentInput {
  documentId: string;
  question: string;
}

// ============================================
// Document Functions
// ============================================

/**
 * List documents with optional filtering
 */
export async function listDocuments(
  input: AIToolInput<ListDocumentsInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const limit = Math.min(input.limit || 20, 100);
    const { type, category, search, clientId, propertyId, cursor } = input;

    const where: Record<string, unknown> = {
      organizationId: context.organizationId,
    };

    if (type) {
      where.document_type = type;
    }

    if (category) {
      where.category = category;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (propertyId) {
      where.propertyId = propertyId;
    }

    if (search) {
      where.OR = [
        { document_name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const documents = await prismadb.documents.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        document_name: true,
        document_type: true,
        category: true,
        description: true,
        document_file_url: true,
        document_file_mimeType: true,
        document_file_size: true,
        createdAt: true,
        updatedAt: true,
        Users: {
          select: { id: true, name: true },
        },
        Clients: {
          select: { id: true, client_name: true },
        },
        Properties: {
          select: { id: true, property_name: true },
        },
      },
    });

    const hasMore = documents.length > limit;
    const items = hasMore ? documents.slice(0, -1) : documents;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return successResponse({
      documents: items.map((doc) => ({
        id: doc.id,
        name: doc.document_name,
        type: doc.document_type,
        category: doc.category,
        description: doc.description,
        url: doc.document_file_url,
        mimeType: doc.document_file_mimeType,
        size: doc.document_file_size,
        uploadedBy: doc.Users,
        linkedClient: doc.Clients,
        linkedProperty: doc.Properties,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      })),
      pagination: {
        hasMore,
        nextCursor,
        limit,
      },
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to list documents"
    );
  }
}

/**
 * Get detailed information about a specific document
 */
export async function getDocumentDetails(
  input: AIToolInput<GetDocumentDetailsInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const { documentId } = input;

    if (!documentId) {
      return errorResponse("Missing required field: documentId");
    }

    const document = await prismadb.documents.findFirst({
      where: {
        id: documentId,
        organizationId: context.organizationId,
      },
      include: {
        Users: {
          select: { id: true, name: true, email: true },
        },
        Clients: {
          select: { id: true, client_name: true, primary_email: true },
        },
        Properties: {
          select: { id: true, property_name: true, address_city: true },
        },
        CalendarEvent: {
          select: { id: true, title: true, startTime: true },
        },
      },
    });

    if (!document) {
      return errorResponse("Document not found");
    }

    return successResponse({
      document: {
        id: document.id,
        name: document.document_name,
        type: document.document_type,
        category: document.category,
        description: document.description,
        url: document.document_file_url,
        mimeType: document.document_file_mimeType,
        size: document.document_file_size,
        extractedText: document.extracted_text,
        metadata: document.metadata,
        uploadedBy: document.Users,
        linkedClient: document.Clients,
        linkedProperty: document.Properties,
        linkedEvents: document.CalendarEvent.map((e) => ({
          id: e.id,
          title: e.title,
          startTime: e.startTime.toISOString(),
        })),
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to get document details"
    );
  }
}

/**
 * Analyze a document (extract information, summarize, etc.)
 *
 * Note: This is a placeholder that returns document metadata.
 * In a full implementation, this would call an AI service to analyze the document.
 */
export async function analyzeDocument(
  input: AIToolInput<AnalyzeDocumentInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const { documentId, analysisType = "summary" } = input;

    if (!documentId) {
      return errorResponse("Missing required field: documentId");
    }

    const document = await prismadb.documents.findFirst({
      where: {
        id: documentId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        document_name: true,
        document_type: true,
        extracted_text: true,
        metadata: true,
        document_file_mimeType: true,
      },
    });

    if (!document) {
      return errorResponse("Document not found");
    }

    // For now, return available metadata and extracted text
    // A full implementation would call an AI service for analysis
    return successResponse({
      documentId: document.id,
      documentName: document.document_name,
      analysisType,
      analysis: {
        hasExtractedText: !!document.extracted_text,
        textLength: document.extracted_text?.length || 0,
        mimeType: document.document_file_mimeType,
        metadata: document.metadata,
        // Placeholder for actual AI analysis
        summary:
          document.extracted_text
            ? `Document "${document.document_name}" contains ${document.extracted_text.length} characters of extracted text.`
            : `Document "${document.document_name}" - no text content available for analysis.`,
      },
      message:
        "Note: Full AI-powered document analysis requires additional configuration.",
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to analyze document"
    );
  }
}

/**
 * Chat with a document (ask questions about its content)
 *
 * Note: This is a placeholder that searches extracted text.
 * In a full implementation, this would use RAG with embeddings.
 */
export async function chatWithDocument(
  input: AIToolInput<ChatWithDocumentInput>
): Promise<AIToolResponse> {
  const context = extractContext(input);
  if (!validateContext(context)) {
    return missingContextError();
  }

  try {
    const { documentId, question } = input;

    if (!documentId || !question) {
      return errorResponse("Missing required fields: documentId, question");
    }

    const document = await prismadb.documents.findFirst({
      where: {
        id: documentId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        document_name: true,
        extracted_text: true,
      },
    });

    if (!document) {
      return errorResponse("Document not found");
    }

    if (!document.extracted_text) {
      return errorResponse(
        "This document has no extracted text content to query."
      );
    }

    // Simple keyword search as placeholder
    // A full implementation would use RAG with vector embeddings
    const keywords = question.toLowerCase().split(/\s+/);
    const text = document.extracted_text.toLowerCase();
    const relevantSentences: string[] = [];

    const sentences = document.extracted_text.split(/[.!?]+/);
    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      if (keywords.some((kw) => sentenceLower.includes(kw))) {
        relevantSentences.push(sentence.trim());
      }
    }

    return successResponse({
      documentId: document.id,
      documentName: document.document_name,
      question,
      answer: relevantSentences.length > 0
        ? `Based on the document, here are relevant passages:\n\n${relevantSentences.slice(0, 3).join("\n\n")}`
        : "I couldn't find specific information about that in the document.",
      relevantPassages: relevantSentences.slice(0, 5),
      message:
        "Note: Full AI-powered document Q&A requires additional configuration.",
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to chat with document"
    );
  }
}

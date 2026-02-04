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
      // Note: Documents model doesn't have a category field
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
        description: true,
        document_file_url: true,
        document_file_mimeType: true,
        size: true,
        createdAt: true,
        updatedAt: true,
        Users_Documents_assigned_userToUsers: {
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
        description: doc.description,
        url: doc.document_file_url,
        mimeType: doc.document_file_mimeType,
        size: doc.size,
        uploadedBy: doc.Users_Documents_assigned_userToUsers,
        linkedClient: doc.Clients,
        linkedProperty: doc.Properties,
        createdAt: doc.createdAt?.toISOString() ?? null,
        updatedAt: doc.updatedAt?.toISOString() ?? null,
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
        Users_Documents_assigned_userToUsers: {
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
        description: document.description,
        url: document.document_file_url,
        mimeType: document.document_file_mimeType,
        size: document.size,
        uploadedBy: document.Users_Documents_assigned_userToUsers,
        linkedClient: document.Clients,
        linkedProperty: document.Properties,
        linkedEvents: document.CalendarEvent.map((e) => ({
          id: e.id,
          title: e.title,
          startTime: e.startTime.toISOString(),
        })),
        createdAt: document.createdAt?.toISOString() ?? null,
        updatedAt: document.updatedAt?.toISOString() ?? null,
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
        document_file_mimeType: true,
        description: true,
        size: true,
      },
    });

    if (!document) {
      return errorResponse("Document not found");
    }

    // Return basic document information
    // A full implementation would call an AI service for analysis
    return successResponse({
      documentId: document.id,
      documentName: document.document_name,
      analysisType,
      analysis: {
        mimeType: document.document_file_mimeType,
        documentType: document.document_type,
        description: document.description,
        size: document.size,
        summary: `Document "${document.document_name}" (${document.document_type || "unknown type"})${document.description ? `: ${document.description}` : ""}`,
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
 * Note: This is a placeholder function.
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
        document_type: true,
        description: true,
      },
    });

    if (!document) {
      return errorResponse("Document not found");
    }

    // Placeholder response - full implementation would use RAG with vector embeddings
    return successResponse({
      documentId: document.id,
      documentName: document.document_name,
      question,
      answer: `I found the document "${document.document_name}"${document.description ? `. Description: ${document.description}` : ""}. Full document Q&A requires text extraction and AI analysis to be configured.`,
      message:
        "Note: Full AI-powered document Q&A requires additional configuration for text extraction and embeddings.",
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to chat with document"
    );
  }
}

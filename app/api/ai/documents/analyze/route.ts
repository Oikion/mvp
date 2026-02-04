// @ts-nocheck
// TODO: Fix type errors
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { getDocumentText } from "@/lib/documents/text-extractor";
import { analyzeDocument } from "@/lib/documents/document-analyzer";

/**
 * POST /api/ai/documents/analyze
 * Analyze a document and extract key information
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (!user || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { documentId, analysisType = "summary" } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId is required" },
        { status: 400 }
      );
    }

    // Get the document
    const document = await prismadb.documents.findFirst({
      where: {
        id: documentId,
        organizationId,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    if (!document.document_file_url) {
      return NextResponse.json(
        { error: "Document has no file URL" },
        { status: 400 }
      );
    }

    // Extract text from document
    const documentText = await getDocumentText(
      document.document_file_url,
      document.extractedText as string | null
    );

    if (!documentText || documentText.length < 10) {
      return NextResponse.json(
        { error: "Could not extract text from document" },
        { status: 400 }
      );
    }

    // Analyze the document
    const analysis = await analyzeDocument(
      documentText,
      document.document_name,
      organizationId,
      analysisType as "summary" | "extraction" | "full"
    );

    // Cache the extracted text if not already cached
    if (!document.extractedText) {
      await prismadb.documents.update({
        where: { id: documentId },
        data: {
          extractedText: documentText.substring(0, 50000), // Limit stored text
        },
      });
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        name: document.document_name,
        type: document.document_file_mimeType,
      },
      analysis,
    });
  } catch (error) {
    console.error("[AI_DOCUMENTS_ANALYZE]", error);
    const message = error instanceof Error ? error.message : "Failed to analyze document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

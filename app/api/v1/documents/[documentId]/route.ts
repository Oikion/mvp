import { NextRequest } from "next/server";
import { prismadb } from "@/lib/prisma";
import { API_SCOPES } from "@/lib/api-auth";
import {
  withExternalApi,
  createApiSuccessResponse,
  createApiErrorResponse,
  ExternalApiContext,
} from "@/lib/external-api-middleware";
import { dispatchDocumentWebhook } from "@/lib/webhooks";

/**
 * GET /api/v1/documents/[documentId]
 * Get a single document
 */
export const GET = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const url = new URL(req.url);
    const documentId = url.pathname.split("/").pop();

    if (!documentId) {
      return createApiErrorResponse("Document ID is required", 400);
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
        document_file_url: true,
        description: true,
        size: true,
        tags: true,
        visibility: true,
        viewsCount: true,
        lastViewedAt: true,
        created_by_user: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
        Users_Documents_created_by_userToUsers: {
          select: { id: true, name: true, email: true },
        },
        Contacts: {
          select: { id: true, displayName: true },
        },
        Properties: {
          select: { id: true, property_name: true },
        },
      },
    });

    if (!document) {
      return createApiErrorResponse("Document not found", 404);
    }

    if (document.archivedAt) {
      return createApiErrorResponse("This resource has been archived and is no longer available.", 410);
    }

    return createApiSuccessResponse({
      document: {
        id: document.id,
        name: document.document_name,
        type: document.document_type,
        mimeType: document.document_file_mimeType,
        url: document.document_file_url,
        description: document.description,
        size: document.size,
        tags: document.tags,
        visibility: document.visibility,
        viewsCount: document.viewsCount,
        lastViewedAt: document.lastViewedAt?.toISOString(),
        createdBy: document.Users_Documents_created_by_userToUsers,
        linkedClients: document.Contacts,
        linkedProperties: document.Properties,
        createdAt: document.createdAt?.toISOString(),
        updatedAt: document.updatedAt?.toISOString(),
      },
    });
  },
  { requiredScopes: [API_SCOPES.DOCUMENTS_READ] }
);

/**
 * PUT /api/v1/documents/[documentId]
 * Update a document
 */
export const PUT = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const url = new URL(req.url);
    const documentId = url.pathname.split("/").pop();

    if (!documentId) {
      return createApiErrorResponse("Document ID is required", 400);
    }

    // Verify document exists and belongs to organization
    const existingDocument = await prismadb.documents.findFirst({
      where: {
        id: documentId,
        organizationId: context.organizationId,
      },
    });

    if (!existingDocument) {
      return createApiErrorResponse("Document not found", 404);
    }

    if (existingDocument.archivedAt) {
      return createApiErrorResponse("This resource has been archived and is no longer available.", 410);
    }

    const body = await req.json();
    const { name, type, description, tags, visibility, clientIds, propertyIds } = body;

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.document_name = name;
    if (type !== undefined) updateData.document_type = type;
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = tags;
    if (visibility !== undefined) updateData.visibility = visibility;

    // Handle relations
    if (clientIds !== undefined) {
      updateData.Clients = {
        set: [],
        connect: Array.isArray(clientIds) ? clientIds.map((id: string) => ({ id })) : [],
      };
    }

    if (propertyIds !== undefined) {
      updateData.Properties = {
        set: [],
        connect: Array.isArray(propertyIds) ? propertyIds.map((id: string) => ({ id })) : [],
      };
    }

    const document = await prismadb.documents.update({
      where: { id: documentId },
      data: updateData,
      select: {
        id: true,
        document_name: true,
        document_type: true,
        document_file_mimeType: true,
        document_file_url: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return createApiSuccessResponse({
      document: {
        id: document.id,
        name: document.document_name,
        type: document.document_type,
        mimeType: document.document_file_mimeType,
        url: document.document_file_url,
        description: document.description,
        createdAt: document.createdAt?.toISOString(),
        updatedAt: document.updatedAt?.toISOString(),
      },
    });
  },
  { requiredScopes: [API_SCOPES.DOCUMENTS_WRITE] }
);

/**
 * DELETE /api/v1/documents/[documentId]
 * Delete a document
 */
export const DELETE = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const url = new URL(req.url);
    const documentId = url.pathname.split("/").pop();

    if (!documentId) {
      return createApiErrorResponse("Document ID is required", 400);
    }

    // Verify document exists and belongs to organization
    const existingDocument = await prismadb.documents.findFirst({
      where: {
        id: documentId,
        organizationId: context.organizationId,
      },
    });

    if (!existingDocument) {
      return createApiErrorResponse("Document not found", 404);
    }

    if (existingDocument.archivedAt) {
      return createApiErrorResponse("This resource has been archived and is no longer available.", 410);
    }

    await prismadb.documents.update({
      where: { id: existingDocument.id },
      data: { archivedAt: new Date(), archivedBy: context.createdById },
    });

    dispatchDocumentWebhook(context.organizationId, "document.archived", existingDocument).catch(
      console.error
    );

    return createApiSuccessResponse({
      message: "Document archived successfully",
      documentId,
    });
  },
  { requiredScopes: [API_SCOPES.DOCUMENTS_WRITE] }
);

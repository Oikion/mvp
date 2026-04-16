// @ts-nocheck
import { NextRequest } from "next/server";
import { prismadb } from "@/lib/prisma";
import { API_SCOPES } from "@/lib/api-auth";
import {
  withExternalApi,
  createApiSuccessResponse,
  createApiErrorResponse,
  parsePaginationParams,
  parseFilterParams,
  ExternalApiContext,
} from "@/lib/external-api-middleware";
import { decryptDocumentForOrg } from "@/lib/model-encryption";

/**
 * GET /api/v1/documents
 * List documents for the organization
 */
export const GET = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const { cursor, limit } = parsePaginationParams(req);
    const filters = parseFilterParams(req, ["type", "search", "mimeType", "createdBy"]);

    // Build where clause
    const where: Record<string, unknown> = {
      organizationId: context.organizationId,
    };

    if (filters.type) {
      where.document_type = filters.type;
    }

    if (filters.mimeType) {
      where.document_file_mimeType = { startsWith: filters.mimeType };
    }

    if (filters.createdBy) {
      where.created_by_user = filters.createdBy;
    }

    if (filters.search) {
      where.OR = [
        { document_name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Fetch documents
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
        document_file_mimeType: true,
        document_file_url: true,
        description: true,
        size: true,
        created_by_user: true,
        createdAt: true,
        updatedAt: true,
        Users_Documents_created_by_userToUsers: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const hasMore = documents.length > limit;
    const items = hasMore ? documents.slice(0, -1) : documents;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    // Decrypt encrypted document fields
    const decryptedItems = await Promise.all(
      items.map((d) => decryptDocumentForOrg(d, context.organizationId))
    );

    return createApiSuccessResponse(
      {
        documents: decryptedItems.map((doc) => ({
          id: doc.id,
          name: doc.document_name,
          type: doc.document_type,
          mimeType: doc.document_file_mimeType,
          url: doc.document_file_url,
          description: doc.description,
          size: doc.size,
          createdBy: doc.Users_Documents_created_by_userToUsers,
          createdAt: doc.createdAt?.toISOString(),
          updatedAt: doc.updatedAt?.toISOString(),
        })),
      },
      200,
      { nextCursor, hasMore, limit }
    );
  },
  { requiredScopes: [API_SCOPES.DOCUMENTS_READ] }
);

/**
 * POST /api/v1/documents
 * Create a document record (for external file uploads)
 * Note: This creates a document record with an external URL.
 * For actual file uploads, use the internal /api/documents/upload endpoint.
 */
export const POST = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const body = await req.json();

    const {
      name,
      type,
      mimeType,
      url,
      description,
      size,
      clientIds,
      propertyIds,
    } = body;

    // Validate required fields
    if (!name) {
      return createApiErrorResponse("Missing required field: name", 400);
    }

    if (!mimeType) {
      return createApiErrorResponse("Missing required field: mimeType", 400);
    }

    if (!url) {
      return createApiErrorResponse("Missing required field: url", 400);
    }

    // Validate that linked entities belong to the caller's organization
    if (clientIds && Array.isArray(clientIds) && clientIds.length > 0) {
      const ownedClients = await prismadb.clients.findMany({
        where: { id: { in: clientIds }, organizationId: context.organizationId },
        select: { id: true },
      });
      if (ownedClients.length !== clientIds.length) {
        return createApiErrorResponse(
          "One or more clientIds do not belong to your organization",
          400
        );
      }
    }
    if (propertyIds && Array.isArray(propertyIds) && propertyIds.length > 0) {
      const ownedProperties = await prismadb.properties.findMany({
        where: { id: { in: propertyIds }, organizationId: context.organizationId },
        select: { id: true },
      });
      if (ownedProperties.length !== propertyIds.length) {
        return createApiErrorResponse(
          "One or more propertyIds do not belong to your organization",
          400
        );
      }
    }

    // Create document
    const { generateFriendlyId } = await import("@/lib/friendly-id");
    const docFriendlyId = await generateFriendlyId(prismadb, "Documents", context.organizationId);
    const document = await prismadb.documents.create({
      data: {
        id: crypto.randomUUID(),
        friendlyId: docFriendlyId,
        organizationId: context.organizationId,
        created_by_user: context.createdById,
        createdBy: context.createdById,
        document_name: name,
        document_type: type || null,
        document_file_mimeType: mimeType,
        document_file_url: url,
        description: description || null,
        size: size || null,
        // Link to clients if provided
        ...(clientIds && Array.isArray(clientIds) && clientIds.length > 0
          ? { Clients: { connect: clientIds.map((id: string) => ({ id })) } }
          : {}),
        // Link to properties if provided
        ...(propertyIds && Array.isArray(propertyIds) && propertyIds.length > 0
          ? { Properties: { connect: propertyIds.map((id: string) => ({ id })) } }
          : {}),
      },
      select: {
        id: true,
        document_name: true,
        document_type: true,
        document_file_mimeType: true,
        document_file_url: true,
        description: true,
        size: true,
        createdAt: true,
      },
    });

    return createApiSuccessResponse(
      {
        document: {
          id: document.id,
          name: document.document_name,
          type: document.document_type,
          mimeType: document.document_file_mimeType,
          url: document.document_file_url,
          description: document.description,
          size: document.size,
          createdAt: document.createdAt?.toISOString(),
        },
      },
      201
    );
  },
  { requiredScopes: [API_SCOPES.DOCUMENTS_WRITE] }
);

import { Prisma } from "@prisma/client";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { mergeDocumentMentions } from "./parse-mentions";
import { createShareLink } from "@/lib/documents/create-share-link";
import { uploadToBlob } from "@/lib/vercel-blob";
import { prismaForOrg, withTenantContext } from "@/lib/tenant";
import { generateFriendlyId } from "@/lib/friendly-id";
import { prismadb } from "@/lib/prisma";

export interface CreateDocumentInput {
  document_name: string;
  description?: string;
  document_file: File | Buffer;
  document_file_mimeType: string;
  document_type?: string;
  assigned_user?: string;
  // Explicit associations
  clientIds?: string[];
  propertyIds?: string[];
  eventIds?: string[];
  taskIds?: string[];
  // Share settings
  linkEnabled?: boolean;
  passwordProtected?: boolean;
  passwordHash?: string;
  expiresAt?: Date;
}

export async function createDocument(input: CreateDocumentInput) {
  const user = await getCurrentUser();
  const organizationId = await getCurrentOrgId();

  // Upload file to Vercel Blob
  const fileBuffer = input.document_file instanceof File
    ? Buffer.from(await input.document_file.arrayBuffer())
    : input.document_file;

  const blob = await uploadToBlob(input.document_name, fileBuffer, {
    contentType: input.document_file_mimeType,
    addRandomSuffix: true,
    access: "public",
  });

  return withTenantContext(organizationId, async () => {
    const prismaTenant = prismaForOrg(organizationId);

    // Parse and merge mentions
    const mergedMentions = await mergeDocumentMentions(
      input.description,
      {
        clientIds: input.clientIds,
        propertyIds: input.propertyIds,
        eventIds: input.eventIds,
        taskIds: input.taskIds,
      },
      organizationId,
      prismaTenant
    );

    // Generate shareable link if enabled
    const shareableLink = input.linkEnabled ? createShareLink() : null;

    // Generate friendly ID
    const documentId = await generateFriendlyId(prismadb, "Documents");

    // Create document
    const document = await prismaTenant.documents.create({
      data: {
        id: documentId,
        document_name: input.document_name,
        description: input.description,
        document_file_url: blob.url,
        document_file_mimeType: input.document_file_mimeType,
        document_type: input.document_type,
        assigned_user: input.assigned_user,
        created_by_user: user.id,
        createdBy: user.id,
        organizationId,
        size: fileBuffer.length,
        // Papermark fields
        shareableLink,
        linkEnabled: input.linkEnabled || false,
        passwordProtected: input.passwordProtected || false,
        passwordHash: input.passwordHash,
        expiresAt: input.expiresAt,
        mentions: mergedMentions as unknown as Prisma.InputJsonValue,
        // Link arrays
        accountsIDs: mergedMentions.clients.map((c) => c.id),
        linkedPropertiesIds: mergedMentions.properties.map((p) => p.id),
        linkedCalComEventsIds: mergedMentions.events.map((e) => e.id),
        linkedTasksIds: mergedMentions.tasks.map((t) => t.id),
        // Relations
        accounts: {
          connect: mergedMentions.clients.map((c) => ({ id: c.id })),
        },
        linkedProperties: {
          connect: mergedMentions.properties.map((p) => ({ id: p.id })),
        },
        linkedCalComEvents: {
          connect: mergedMentions.events.map((e) => ({ id: e.id })),
        },
        linkedTasks: {
          connect: mergedMentions.tasks.map((t) => ({ id: t.id })),
        },
      },
      include: {
        accounts: true,
        linkedProperties: true,
        linkedCalComEvents: true,
        linkedTasks: true,
      },
    });

    return document;
  });
}


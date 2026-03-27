import { Prisma } from "@prisma/client";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { mergeDocumentMentions } from "./parse-mentions";
import { createShareLink } from "@/lib/documents/create-share-link";
import { uploadDocument } from "@/actions/upload";
import { prismaForOrg } from "@/lib/tenant";
import { generateFriendlyId } from "@/lib/friendly-id";
import { prismadb } from "@/lib/prisma";
import { canPerformAction } from "@/lib/permissions";
import { encryptDocumentForOrg, decryptDocumentForOrg, decryptClientForOrg, decryptCalendarEventForOrg } from "@/lib/model-encryption";

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
  // Permission check: Users need document:create permission
  const check = await canPerformAction("document:create");
  if (!check.allowed) {
    throw new Error(check.reason || "Permission denied");
  }

  const user = await getCurrentUser();
  const organizationId = await getCurrentOrgId();

  // Upload file with automatic compression via unified action
  const uploadResult = await uploadDocument({
    file: input.document_file,
    fileName: input.document_name,
    mimeType: input.document_file_mimeType,
    organizationId,
    folder: "documents",
    preset: "general",
    addRandomSuffix: true,
  });

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
  const friendlyId = await generateFriendlyId(prismadb, "Documents", organizationId);

  const encryptedFields = await encryptDocumentForOrg({
    document_name: input.document_name,
    description: input.description,
  }, organizationId);

  // Create document - use compressed size and final mime type
  const document = await prismaTenant.documents.create({
    data: {
      friendlyId,
      document_name: encryptedFields.document_name ?? input.document_name,
      description: encryptedFields.description,
      document_file_url: uploadResult.url,
      document_file_mimeType: uploadResult.mimeType,
      document_type: input.document_type,
      assigned_user: input.assigned_user,
      created_by_user: user.id,
      createdBy: user.id,
      organizationId,
      size: uploadResult.compressedSize,
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
      linkedCalendarEventsIds: mergedMentions.events.map((e) => e.id),
      linkedTasksIds: mergedMentions.tasks.map((t) => t.id),
      // Relations
      Clients: {
        connect: mergedMentions.clients.map((c) => ({ id: c.id })),
      },
      Properties: {
        connect: mergedMentions.properties.map((p) => ({ id: p.id })),
      },
      CalendarEvent: {
        connect: mergedMentions.events.map((e) => ({ id: e.id })),
      },
      crm_Accounts_Tasks_DocumentsToCrmAccountsTasks: {
        connect: mergedMentions.tasks.map((t) => ({ id: t.id })),
      },
    },
    include: {
      Clients: true,
      Properties: true,
      CalendarEvent: true,
      crm_Accounts_Tasks_DocumentsToCrmAccountsTasks: true,
    },
  });

  const decryptedDoc = await decryptDocumentForOrg(document, organizationId);
  return {
    ...decryptedDoc,
    Clients: await Promise.all(document.Clients.map((c) => decryptClientForOrg(c, organizationId))),
    CalendarEvent: await Promise.all(document.CalendarEvent.map((e) => decryptCalendarEventForOrg(e, organizationId))),
  };
}

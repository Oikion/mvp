"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUserId } from "@/lib/get-current-user";
import { requireAction, requireActionOnEntity } from "@/lib/permissions/action-guards";
import {
  encryptOrgDocumentTemplateForOrg,
  decryptOrgDocumentTemplateForOrg,
} from "@/lib/model-encryption";
import {
  createDocumentTemplateSchema,
  updateDocumentTemplateSchema,
} from "@/lib/validations/document-templates";
import { serializePrisma } from "@/lib/prisma-serialize";
import {
  actionSuccess,
  actionError,
  actionNotFound,
  type ActionResponse,
} from "@/lib/action-response";

// ─────────────────────────────────────────────────────────────────────────────
// Select subset used by listDocumentTemplates — excludes body (large JSON)
// ─────────────────────────────────────────────────────────────────────────────

const TEMPLATE_LIST_SELECT = {
  id: true,
  organizationId: true,
  name: true,
  nameEl: true,
  nameEn: true,
  category: true,
  placeholders: true,
  version: true,
  isPublished: true,
  baseTemplateId: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 1. createDocumentTemplate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new OrgDocumentTemplate.
 * organizationId and createdByUserId are always injected server-side.
 */
export async function createDocumentTemplate(input: unknown): Promise<ActionResponse> {
  const guard = await requireAction("template:create");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const userId = await getCurrentUserId();

  // Strip client-supplied organizationId — we always use the server auth value
  const sanitized =
    typeof input === "object" && input !== null
      ? { ...(input as Record<string, unknown>) }
      : input;
  if (typeof sanitized === "object" && sanitized !== null) {
    delete (sanitized as Record<string, unknown>).organizationId;
  }

  const parsed = createDocumentTemplateSchema.parse(sanitized);

  try {
    const encrypted = await encryptOrgDocumentTemplateForOrg(
      {
        name: parsed.name,
        nameEl: parsed.nameEl,
        nameEn: parsed.nameEn,
      },
      organizationId
    );

    const template = await prismadb.orgDocumentTemplate.create({
      data: {
        ...encrypted,
        organizationId,
        category: parsed.category ?? "GENERAL",
        body: parsed.body,
        placeholders: parsed.placeholders ?? [],
        version: 1,
        isPublished: false,
        baseTemplateId: parsed.baseTemplateId,
        createdByUserId: userId ?? undefined,
      },
    });

    return actionSuccess(serializePrisma(template));
  } catch (error) {
    console.error("[DOCUMENT_TEMPLATE_CREATE]", error);
    return actionError("Failed to create document template", error as Error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. updateDocumentTemplate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update an existing OrgDocumentTemplate.
 * Increments version on every content update.
 * isPublished changes are kept separate and do not bump the version.
 */
export async function updateDocumentTemplate(
  id: string,
  input: unknown
): Promise<ActionResponse> {
  const organizationId = await getCurrentOrgId();

  const existing = await prismadb.orgDocumentTemplate.findFirst({
    where: { id, organizationId, deletedAt: null },
    select: { createdByUserId: true },
  });

  if (!existing) return actionNotFound("Document template");

  const guard = await requireActionOnEntity(
    "template:update",
    "document-template",
    id,
    existing.createdByUserId
  );
  if (guard) return guard;

  try {
    const parsed = updateDocumentTemplateSchema.parse(input);

    // Separate isPublished from content fields to avoid mixing publish state
    // with version-bumping content updates
    const { isPublished, ...contentFields } = parsed;

    const hasContentUpdate = Object.keys(contentFields).some(
      (k) => contentFields[k as keyof typeof contentFields] !== undefined
    );

    // Encrypt name fields if provided
    const encryptedFields =
      hasContentUpdate
        ? await encryptOrgDocumentTemplateForOrg(
            {
              name: contentFields.name,
              nameEl: contentFields.nameEl,
              nameEn: contentFields.nameEn,
            },
            organizationId
          )
        : {};

    const updateData: Record<string, unknown> = {};

    if (hasContentUpdate) {
      if (contentFields.name !== undefined || contentFields.nameEl !== undefined || contentFields.nameEn !== undefined) {
        Object.assign(updateData, encryptedFields);
      }
      if (contentFields.category !== undefined) updateData.category = contentFields.category;
      if (contentFields.body !== undefined) updateData.body = contentFields.body;
      if (contentFields.placeholders !== undefined) updateData.placeholders = contentFields.placeholders;
      if (contentFields.baseTemplateId !== undefined) updateData.baseTemplateId = contentFields.baseTemplateId;
      // Auto-increment version on every content update
      updateData.version = { increment: 1 };
    }

    if (isPublished !== undefined) {
      updateData.isPublished = isPublished;
    }

    const template = await prismadb.orgDocumentTemplate.update({
      where: { id, organizationId },
      data: updateData,
    });

    return actionSuccess(serializePrisma(template));
  } catch (error) {
    console.error("[DOCUMENT_TEMPLATE_UPDATE]", error);
    return actionError("Failed to update document template", error as Error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. publishDocumentTemplate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Publish an OrgDocumentTemplate to make it available org-wide.
 * Does NOT increment version — publishing is not a content change.
 */
export async function publishDocumentTemplate(id: string): Promise<ActionResponse> {
  const organizationId = await getCurrentOrgId();

  const existing = await prismadb.orgDocumentTemplate.findFirst({
    where: { id, organizationId, deletedAt: null },
    select: { createdByUserId: true },
  });

  if (!existing) return actionNotFound("Document template");

  const guard = await requireActionOnEntity(
    "template:publish",
    "document-template",
    id,
    existing.createdByUserId
  );
  if (guard) return guard;

  try {
    await prismadb.orgDocumentTemplate.update({
      where: { id, organizationId },
      data: { isPublished: true },
    });

    return actionSuccess({ id, isPublished: true });
  } catch (error) {
    console.error("[DOCUMENT_TEMPLATE_PUBLISH]", error);
    return actionError("Failed to publish document template", error as Error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. cloneDocumentTemplate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clone an existing OrgDocumentTemplate.
 * The new template starts at version 1, unpublished, with baseTemplateId set.
 */
export async function cloneDocumentTemplate(id: string): Promise<ActionResponse> {
  const guard = await requireAction("template:create");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();
  const userId = await getCurrentUserId();

  const source = await prismadb.orgDocumentTemplate.findFirst({
    where: { id, organizationId, deletedAt: null },
  });

  if (!source) return actionNotFound("Document template");

  try {
    // Decrypt the source name before prefixing
    const decrypted = await decryptOrgDocumentTemplateForOrg(
      { name: source.name, nameEl: source.nameEl, nameEn: source.nameEn },
      organizationId
    );

    const clonedName = `(Copy) ${decrypted.name ?? ""}`.trim();

    const encrypted = await encryptOrgDocumentTemplateForOrg(
      {
        name: clonedName,
        nameEl: decrypted.nameEl,
        nameEn: decrypted.nameEn,
      },
      organizationId
    );

    const newTemplate = await prismadb.orgDocumentTemplate.create({
      data: {
        ...encrypted,
        organizationId,
        category: source.category,
        body: source.body,
        placeholders: source.placeholders,
        version: 1,
        isPublished: false,
        baseTemplateId: source.id,
        createdByUserId: userId ?? undefined,
      },
    });

    return actionSuccess(serializePrisma(newTemplate));
  } catch (error) {
    console.error("[DOCUMENT_TEMPLATE_CLONE]", error);
    return actionError("Failed to clone document template", error as Error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. deleteDocumentTemplate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Soft-delete an OrgDocumentTemplate by setting deletedAt.
 * Never hard-deletes from the database.
 */
export async function deleteDocumentTemplate(id: string): Promise<ActionResponse> {
  const organizationId = await getCurrentOrgId();

  const existing = await prismadb.orgDocumentTemplate.findFirst({
    where: { id, organizationId, deletedAt: null },
    select: { createdByUserId: true },
  });

  if (!existing) return actionNotFound("Document template");

  const guard = await requireActionOnEntity(
    "template:delete",
    "document-template",
    id,
    existing.createdByUserId
  );
  if (guard) return guard;

  try {
    await prismadb.orgDocumentTemplate.update({
      where: { id, organizationId },
      data: { deletedAt: new Date() },
    });

    return actionSuccess({ success: true });
  } catch (error) {
    console.error("[DOCUMENT_TEMPLATE_DELETE]", error);
    return actionError("Failed to delete document template", error as Error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. listDocumentTemplates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List all non-deleted OrgDocumentTemplates for the current organization.
 * Returns a select subset (body excluded) for performance.
 * Names are decrypted before returning.
 */
export async function listDocumentTemplates(): Promise<ActionResponse> {
  const organizationId = await getCurrentOrgId();

  const guard = await requireAction("template:read");
  if (guard) return guard;

  try {
    const templates = await prismadb.orgDocumentTemplate.findMany({
      where: { organizationId, deletedAt: null },
      select: TEMPLATE_LIST_SELECT,
      orderBy: { updatedAt: "desc" },
    });

    const decrypted = await Promise.all(
      templates.map((t) => decryptOrgDocumentTemplateForOrg(t, organizationId))
    );

    return actionSuccess(serializePrisma(decrypted));
  } catch (error) {
    console.error("[DOCUMENT_TEMPLATE_LIST]", error);
    return actionError("Failed to list document templates", error as Error);
  }
}

import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { canPerformAction, requireActionOnEntity } from "@/lib/permissions";
import { handleGuardError } from "@/lib/permissions/action-guards";
import { isDemoOrg } from "@/lib/demo/demo-guard";
import { updateContactSchema } from "@/lib/validations/contacts";
import { encryptContactForOrg, decryptContactForOrg } from "@/lib/model-encryption";
import { isFriendlyId } from "@/lib/friendly-id";
import { logPiiAccess } from "@/lib/pii-access-log";
import { createChangeLogEntry, diffEntity, CONTACT_WATCHED_FIELDS } from "@/lib/entity-change-log";
import { logEntityUpdated, type FieldChange } from "@/lib/activity-logger";

// Activity Log safelist — non-encrypted fields only.
// PII fields (firstName, lastName, displayName, email, phones, taxId, etc.) are encrypted and NEVER tracked here.
const CONTACT_ACTIVITY_SAFELIST = [
  "status",
  "contactType",
  "clientType",
  "source",
  "leadScore",
  "visibilityState",
  "assignedToUserId",
  "tags",
] as const;

// Map safelist → actual Prisma column names on the Contact model
const CONTACT_ACTIVITY_FIELD_MAP: Record<string, string> = {
  status: "status",
  contactType: "category",
  clientType: "category",
  source: "source",
  leadScore: "leadScore",
  visibilityState: "visibility",
  assignedToUserId: "assignedAgentId",
  tags: "tags",
};

function stringifyValue(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return JSON.stringify(v);
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function computeContactActivityChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const safelistKey of CONTACT_ACTIVITY_SAFELIST) {
    const dbKey = CONTACT_ACTIVITY_FIELD_MAP[safelistKey];
    if (!dbKey) continue;
    if (!(dbKey in after)) continue;
    const fromVal = stringifyValue(before[dbKey]);
    const toVal = stringifyValue(after[dbKey]);
    if (fromVal !== toVal) {
      changes.push({ field: safelistKey, from: fromVal, to: toVal });
    }
  }
  return changes;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const readCheck = await canPerformAction("contact:read");
    if (!readCheck.allowed) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const organizationId = await getCurrentOrgId();
    const { contactId } = await params;

    // Support lookup by friendlyId or internal id
    const where = isFriendlyId(contactId)
      ? { organizationId, friendlyId: contactId }
      : { organizationId, id: contactId };

    const contact = await prismadb.contact.findFirst({
      where,
      include: {
        assignedAgent: { select: { name: true, id: true, avatar: true } },
        contactComments: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            user: { select: { name: true, id: true, avatar: true } },
          },
        },
        contactRelationshipsA: {
          include: {
            contactB: {
              select: { id: true, friendlyId: true, displayName: true, isCompany: true, category: true },
            },
          },
        },
        contactRelationshipsB: {
          include: {
            contactA: {
              select: { id: true, friendlyId: true, displayName: true, isCompany: true, category: true },
            },
          },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const decrypted = await decryptContactForOrg(contact, organizationId);

    // fire-and-forget PII access log — getCurrentUser() is already called by canPerformAction above
    getCurrentUser().then((actor) => {
      logPiiAccess({
        userId: actor.id,
        organizationId,
        entityType: "CONTACT",
        entityId: contact.id,
        action: "DECRYPT",
        fields: ["firstName", "lastName", "displayName", "companyName", "email", "secondaryEmail", "primaryPhone", "secondaryPhone", "officePhone", "whatsapp", "viber", "taxId", "doy", "vatNumber", "notes", "communicationNotes", "addresses"],
        source: "GET /api/crm/contacts/[contactId]",
      }).catch(() => {});
    }).catch(() => {});

    // Merge bidirectional relationships
    const relationships = [
      ...(decrypted.contactRelationshipsA || []).map((r: any) => ({
        id: r.id,
        relatedContact: r.contactB,
        relationshipType: r.relationshipType,
        notes: r.notes,
      })),
      ...(decrypted.contactRelationshipsB || []).map((r: any) => ({
        id: r.id,
        relatedContact: r.contactA,
        relationshipType: r.relationshipType,
        notes: r.notes,
      })),
    ];

    return NextResponse.json({
      data: { ...decrypted, relationships },
    });
  } catch (error) {
    console.error("[CONTACT_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { contactId } = await params;
    const body = await req.json();

    const validation = updateContactSchema.safeParse({ ...body, id: contactId });
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { id, ...data } = validation.data;

    // Verify ownership — also capture watched fields for changelog diff + activity log
    const existing = await prismadb.contact.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        status: true,
        assignedAgentId: true,
        visibility: true,
        category: true,
        source: true,
        doNotContact: true,
        allowMarketing: true,
        gdprConsentGiven: true,
        leadScore: true,
        tags: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const guard = await requireActionOnEntity("contact:update", "contact", contactId, existing.assignedAgentId);
    if (guard) return handleGuardError(guard);

    const encrypted = await encryptContactForOrg(data, organizationId);
    const { addresses: encAddresses, communicationNotes: encCommNotes, ...encryptedRest } = encrypted as Record<string, unknown>;

    const updated = await prismadb.contact.update({
      where: { id, organizationId },
      data: {
        ...encryptedRest,
        addresses: encAddresses === null || encAddresses === undefined ? undefined : (encAddresses as object),
        communicationNotes: encCommNotes === null || encCommNotes === undefined ? undefined : (encCommNotes as object | string),
        updatedBy: user.id,
      },
    });

    // Fire-and-forget changelog — errors must not affect the API response
    const changedFields = diffEntity(
      existing as Record<string, unknown>,
      updated as Record<string, unknown>,
      CONTACT_WATCHED_FIELDS,
      [] // all watched fields are non-PII, none are encrypted
    );
    if (changedFields.length > 0) {
      createChangeLogEntry({
        organizationId,
        entityType: "CONTACT",
        entityId: updated.id,
        eventType: "UPDATED",
        actorUserId: user.id,
        changedFields,
      }).catch((err) => console.error("[CONTACT_UPDATED_LOG]", err));
    }

    // Activity Log — diff against safelist (non-encrypted fields only) and emit UPDATED
    const activityChanges = computeContactActivityChanges(
      existing as Record<string, unknown>,
      updated as Record<string, unknown>
    );
    if (activityChanges.length > 0) {
      void logEntityUpdated({
        organizationId,
        parentType: "CONTACT",
        parentId: updated.id,
        createdByUserId: user.id,
        changes: activityChanges,
      });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[CONTACT_PUT]", error);
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { contactId } = await params;

    if (await isDemoOrg(organizationId)) {
      return NextResponse.json({ success: true });
    }

    const existing = await prismadb.contact.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true, assignedAgentId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const guard = await requireActionOnEntity("contact:delete", "contact", contactId, existing.assignedAgentId);
    if (guard) return handleGuardError(guard);

    await prismadb.contact.update({
      where: { id: contactId, organizationId },
      data: { archivedAt: new Date(), archivedBy: user.id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[CONTACT_ARCHIVE]", error);
    return NextResponse.json({ error: "Failed to archive contact" }, { status: 500 });
  }
}

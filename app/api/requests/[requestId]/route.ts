import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { canPerformAction, requireActionOnEntity } from "@/lib/permissions";
import { handleGuardError } from "@/lib/permissions/action-guards";
import { isDemoOrg } from "@/lib/demo/demo-guard";
import { updateRequestSchema } from "@/lib/validations/requests";
import { encryptRequestForOrg, decryptRequestForOrg, decryptContactForOrg } from "@/lib/model-encryption";
import { logEntityCreated, logEntityUpdated, type FieldChange } from "@/lib/activity-logger";
import { logPiiAccess } from "@/lib/pii-access-log";

// Safelist of non-encrypted Request fields tracked by the activity log.
const REQUEST_TRACKED_FIELDS = [
  "status",
  "purpose",
  "propertyTypes",
  "areas",
  "budgetMin",
  "budgetMax",
  "timeline",
  "assignedToUserId",
  "visibilityState",
] as const;

// Maps tracked-field name to the actual Prisma column on Request.
// `purpose`, `areas`, `assignedToUserId`, `visibilityState` are external-facing
// names; map them to the underlying schema columns.
const TRACKED_TO_COLUMN: Record<string, string> = {
  status: "status",
  purpose: "propertyCategory",
  propertyTypes: "propertyTypes",
  areas: "areasOfInterest", // encrypted — listed for completeness, filtered out below
  budgetMin: "budgetMin",
  budgetMax: "budgetMax",
  timeline: "timeline",
  assignedToUserId: "assignedAgentId",
  visibilityState: "visibility",
};

// Encrypted columns that must NEVER be tracked.
const REQUEST_ENCRYPTED_COLUMNS = new Set([
  "name",
  "notes",
  "locationDisplayName",
  "communicationNotes",
  "areasOfInterest",
]);

/**
 * Serialize a value into a string suitable for the `from`/`to` slots on a
 * FieldChange. Arrays serialize as JSON to preserve element order/comparison.
 */
function serializeValue(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return JSON.stringify(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/**
 * Diff old vs. new tracked-field values into FieldChange entries.
 * Skips encrypted columns and any field not present in the new payload.
 */
function diffTrackedFields(
  oldRecord: Record<string, unknown>,
  newPayload: Record<string, unknown>
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const trackedName of REQUEST_TRACKED_FIELDS) {
    const col = TRACKED_TO_COLUMN[trackedName];
    if (!col || REQUEST_ENCRYPTED_COLUMNS.has(col)) continue;
    if (!(col in newPayload)) continue;
    const before = serializeValue(oldRecord[col]);
    const after = serializeValue(newPayload[col]);
    if (before !== after) {
      changes.push({ field: trackedName, from: before, to: after });
    }
  }
  return changes;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { requestId } = await params;

    const readCheck = await canPerformAction("request:read");
    if (!readCheck.allowed) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const request = await prismadb.request.findFirst({
      where: { friendlyId: requestId, organizationId },
      include: {
        requestContacts: {
          include: {
            contact: {
              select: {
                id: true,
                friendlyId: true,
                displayName: true,
                isCompany: true,
                companyName: true,
                email: true,
                primaryPhone: true,
                category: true,
              },
            },
          },
        },
        assignedAgent: { select: { id: true, name: true, email: true } },
        propertyMatches: {
          include: {
            property: {
              select: {
                id: true,
                friendlyId: true,
                property_name: true,
                property_type: true,
                price: true,
                address_city: true,
                municipality: true,
                size_net_sqm: true,
                bedrooms: true,
                bathrooms: true,
              },
            },
          },
          orderBy: { matchScore: "desc" },
        },
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const decrypted = await decryptRequestForOrg(request, organizationId);
    // fire-and-forget PII access log for request
    logPiiAccess({
      userId,
      organizationId,
      entityType: "REQUEST",
      entityId: request.id,
      action: "DECRYPT",
      fields: ["name", "notes", "locationDisplayName", "communicationNotes", "areasOfInterest"],
      source: "GET /api/requests/[requestId]",
    }).catch(() => {});

    const decContacts = [];
    for (const rc of request.requestContacts) {
      const decContact = await decryptContactForOrg(rc.contact, organizationId);
      // fire-and-forget PII access log for each linked contact
      logPiiAccess({
        userId,
        organizationId,
        entityType: "CONTACT",
        entityId: rc.contact.id,
        action: "DECRYPT",
        fields: ["displayName", "companyName", "email", "primaryPhone"],
        source: "GET /api/requests/[requestId] (requestContacts)",
      }).catch(() => {});
      decContacts.push({ ...rc, contact: decContact });
    }

    return NextResponse.json({ ...decrypted, requestContacts: decContacts });
  } catch (error) {
    console.error("[REQUEST_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { requestId } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const body = await req.json();
    const validation = updateRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Encrypt sensitive fields if present
    const toEncrypt: Record<string, unknown> = {};
    if ("notes" in data) toEncrypt.notes = data.notes ?? null;
    if ("locationDisplayName" in data) toEncrypt.locationDisplayName = data.locationDisplayName ?? null;
    if ("communicationNotes" in data) toEncrypt.communicationNotes = data.communicationNotes ?? null;
    if ("areasOfInterest" in data) toEncrypt.areasOfInterest = data.areasOfInterest ?? null;

    const encrypted = Object.keys(toEncrypt).length > 0
      ? await encryptRequestForOrg(toEncrypt, organizationId)
      : {};

    // Look up the real ID + tracked fields for diffing.
    // Inline select keeps Prisma's type inference precise.
    const existing = await prismadb.request.findFirst({
      where: { friendlyId: requestId, organizationId },
      select: {
        id: true,
        draftStatus: true,
        status: true,
        propertyCategory: true,
        propertyTypes: true,
        budgetMin: true,
        budgetMax: true,
        timeline: true,
        assignedAgentId: true,
        visibility: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const guard = await requireActionOnEntity("request:update", "request", existing.id, existing.assignedAgentId);
    if (guard) return handleGuardError(guard);

    const updated = await prismadb.request.update({
      where: { id: existing.id, organizationId },
      data: {
        ...data,
        ...encrypted,
        updatedBy: user.id,
      },
    });

    // Activity log — fire-and-forget. Suppressed for drafts. Promotion from
    // draft → non-draft emits CREATED instead of UPDATED.
    const wasDraft = existing.draftStatus === true;
    const isDraftAfter = updated.draftStatus === true;

    if (wasDraft && !isDraftAfter) {
      void logEntityCreated({
        organizationId,
        parentType: "REQUEST",
        parentId: existing.id,
        createdByUserId: user.id,
        source: "manual",
      });
    } else if (!wasDraft && !isDraftAfter) {
      const changes = diffTrackedFields(
        existing as unknown as Record<string, unknown>,
        data as unknown as Record<string, unknown>
      );
      if (changes.length > 0) {
        void logEntityUpdated({
          organizationId,
          parentType: "REQUEST",
          parentId: existing.id,
          createdByUserId: user.id,
          changes,
        });
      }
    }
    // else: update on a draft (draftStatus stays true) — suppressed.

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[REQUEST_PUT]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { requestId } = await params;

    if (await isDemoOrg(organizationId)) {
      return NextResponse.json({ success: true });
    }

    // Resolve friendlyId → id, then soft-delete
    const existing = await prismadb.request.findFirst({
      where: { friendlyId: requestId, organizationId },
      select: { id: true, assignedAgentId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const deleteGuard = await requireActionOnEntity("request:delete", "request", existing.id, existing.assignedAgentId);
    if (deleteGuard) return handleGuardError(deleteGuard);

    await prismadb.request.update({
      where: { id: existing.id, organizationId },
      data: { archivedAt: new Date(), archivedBy: userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[REQUEST_ARCHIVE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

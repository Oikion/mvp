import { NextResponse } from "next/server";
import {
  ContactCategory,
  ContactStatus,
  ContactSource,
  ClientType,
  ClientStatus,
  LeadSource,
} from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { notifyClientCreated, notifyAccountWatchers } from "@/lib/notifications";
import { generateFriendlyId } from "@/lib/friendly-id";
import { dispatchContactWebhook } from "@/lib/webhooks";
import { canPerformAction, canPerformActionOnEntity } from "@/lib/permissions";
import { createClientSchema, updateClientSchema } from "@/lib/validations/crm";
import { encryptContactForOrg, decryptContactForOrg } from "@/lib/model-encryption";
import { validateAssignedTo } from "@/lib/validate-assigned-to";

// Legacy enum → v2 enum mappings for backward compat (clients/ route bridges pre-v2 API surface)
const CLIENT_TYPE_TO_CATEGORY: Record<ClientType, ContactCategory> = {
  [ClientType.BUYER]: ContactCategory.BUYER,
  [ClientType.SELLER]: ContactCategory.SELLER,
  [ClientType.RENTER]: ContactCategory.TENANT,
  [ClientType.INVESTOR]: ContactCategory.INVESTOR,
  [ClientType.REFERRAL_PARTNER]: ContactCategory.BROKER,
};

const CLIENT_STATUS_TO_CONTACT_STATUS: Record<ClientStatus, ContactStatus> = {
  [ClientStatus.LEAD]: ContactStatus.LEAD,
  [ClientStatus.ACTIVE]: ContactStatus.ACTIVE,
  [ClientStatus.INACTIVE]: ContactStatus.INACTIVE,
  [ClientStatus.CONVERTED]: ContactStatus.ACTIVE,
  [ClientStatus.LOST]: ContactStatus.INACTIVE,
};

const LEAD_SOURCE_TO_CONTACT_SOURCE: Record<LeadSource, ContactSource> = {
  [LeadSource.REFERRAL]: ContactSource.REFERRAL,
  [LeadSource.WEB]: ContactSource.WEB,
  [LeadSource.PORTAL]: ContactSource.PORTAL_LEAD,
  [LeadSource.WALK_IN]: ContactSource.WALK_IN,
  [LeadSource.SOCIAL]: ContactSource.SOCIAL_MEDIA,
};


export async function POST(req: Request) {
  try {
    const createCheck = await canPerformAction("client:create");
    if (!createCheck.allowed) {
      return NextResponse.json(
        { error: createCheck.reason || "Permission denied" },
        { status: 403 }
      );
    }

    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();

    const validationResult = createClientSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const v = validationResult.data;
    const friendlyId = await generateFriendlyId(prismadb, "Contact", organizationId);
    const validatedAssignedTo = await validateAssignedTo(v.assigned_to);

    const encrypted = await encryptContactForOrg(
      {
        displayName: v.client_name ?? "",
        email: v.primary_email ?? null,
        primaryPhone: v.primary_phone ?? null,
        secondaryPhone: v.secondary_phone ?? null,
        secondaryEmail: v.secondary_email ?? null,
        companyName: v.company_name ?? null,
        taxId: v.afm ?? null,
        doy: v.doy ?? null,
        idDocument: v.id_doc ?? null,
        companyGemi: v.company_gemi ?? null,
        officePhone: v.office_phone ?? null,
        notes: v.description ?? null,
      },
      organizationId
    );
    const {
      communicationNotes: encCommNotes,
      addresses: encAddresses,
      ...encryptedRest
    } = encrypted as { communicationNotes?: unknown; addresses?: unknown } & typeof encrypted;

    const newClient = await prismadb.contact.create({
      data: {
        friendlyId,
        createdBy: user.id,
        updatedBy: user.id,
        organizationId,
        ...encryptedRest,
        communicationNotes:
          v.communication_notes != null
            ? v.communication_notes
            : encCommNotes == null
              ? undefined
              : (encCommNotes as object | string),
        addresses: encAddresses == null ? undefined : (encAddresses as object),
        isCompany: v.person_type === "COMPANY",
        languagePreference: v.language ?? null,
        gdprConsentGiven: v.gdpr_consent ?? false,
        gdprConsentDate: v.gdpr_consent ? new Date() : null,
        allowMarketing: v.allow_marketing ?? false,
        source: v.lead_source ? LEAD_SOURCE_TO_CONTACT_SOURCE[v.lead_source] : null,
        category: v.client_type ? [CLIENT_TYPE_TO_CATEGORY[v.client_type]] : [],
        status: v.client_status
          ? CLIENT_STATUS_TO_CONTACT_STATUS[v.client_status]
          : ContactStatus.LEAD,
        assignedAgentId: validatedAssignedTo,
      },
    });

    await invalidateCache(
      ["clients:list", "dashboard:accounts-count", v.assigned_to ? `user:${v.assigned_to}` : ""].filter(Boolean)
    );

    if (!v.draft_status) {
      await notifyClientCreated({
        entityType: "CONTACT",
        entityId: newClient.id,
        entityName: v.client_name ?? "",
        creatorId: user.id,
        creatorName: user.name || user.email || "Someone",
        organizationId,
        assignedToId: v.assigned_to ?? undefined,
      });
      dispatchContactWebhook(organizationId, "contact.created", newClient).catch(console.error);
    }

    return NextResponse.json({ newClient }, { status: 200 });
  } catch (error) {
    console.error("[CLIENTS_POST]", error);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();

    const validationResult = updateClientSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { id, ...v } = validationResult.data;

    const existingClient = await prismadb.contact.findFirst({
      where: { id, organizationId },
      select: { id: true, assignedAgentId: true },
    });

    if (!existingClient) {
      return NextResponse.json({ error: "Client not found or access denied" }, { status: 404 });
    }

    const updateCheck = await canPerformActionOnEntity(
      "client:update",
      "contact",
      id,
      existingClient.assignedAgentId
    );
    if (!updateCheck.allowed) {
      return NextResponse.json({ error: updateCheck.reason || "Permission denied" }, { status: 403 });
    }

    if (v.assigned_to !== undefined && v.assigned_to !== existingClient.assignedAgentId) {
      const reassignCheck = await canPerformAction("client:reassign_agent");
      if (!reassignCheck.allowed) {
        return NextResponse.json(
          { error: "You do not have permission to change the assigned agent" },
          { status: 403 }
        );
      }
    }

    const validatedAssignedTo =
      v.assigned_to !== undefined ? await validateAssignedTo(v.assigned_to) : undefined;

    const encryptableFields = {
      ...(v.client_name !== undefined && { displayName: v.client_name }),
      ...(v.primary_email !== undefined && { email: v.primary_email }),
      ...(v.primary_phone !== undefined && { primaryPhone: v.primary_phone }),
      ...(v.secondary_phone !== undefined && { secondaryPhone: v.secondary_phone }),
      ...(v.secondary_email !== undefined && { secondaryEmail: v.secondary_email }),
      ...(v.company_name !== undefined && { companyName: v.company_name }),
      ...(v.afm !== undefined && { taxId: v.afm }),
      ...(v.doy !== undefined && { doy: v.doy }),
      ...(v.id_doc !== undefined && { idDocument: v.id_doc }),
      ...(v.company_gemi !== undefined && { companyGemi: v.company_gemi }),
      ...(v.office_phone !== undefined && { officePhone: v.office_phone }),
      ...(v.description !== undefined && { notes: v.description }),
    };

    const encrypted = await encryptContactForOrg(encryptableFields, organizationId);
    const {
      communicationNotes: encCommNotes,
      addresses: encAddresses,
      ...encryptedRest
    } = encrypted as { communicationNotes?: unknown; addresses?: unknown } & typeof encrypted;

    const updatedClient = await prismadb.contact.update({
      where: { id, organizationId },
      data: {
        updatedBy: user.id,
        ...encryptedRest,
        ...(encCommNotes !== undefined && { communicationNotes: encCommNotes as object | string }),
        ...(encAddresses !== undefined && { addresses: encAddresses as object }),
        ...(v.communication_notes !== undefined && { communicationNotes: v.communication_notes }),
        ...(v.person_type !== undefined && { isCompany: v.person_type === "COMPANY" }),
        ...(v.language !== undefined && { languagePreference: v.language }),
        ...(v.gdpr_consent !== undefined && {
          gdprConsentGiven: v.gdpr_consent,
          gdprConsentDate: v.gdpr_consent ? new Date() : null,
        }),
        ...(v.allow_marketing !== undefined && { allowMarketing: v.allow_marketing }),
        ...(v.lead_source !== undefined && {
          source: v.lead_source ? LEAD_SOURCE_TO_CONTACT_SOURCE[v.lead_source] : null,
        }),
        ...(v.client_type !== undefined && {
          category: v.client_type ? [CLIENT_TYPE_TO_CATEGORY[v.client_type]] : [],
        }),
        ...(v.client_status !== undefined && {
          status: CLIENT_STATUS_TO_CONTACT_STATUS[v.client_status],
        }),
        ...(validatedAssignedTo !== undefined && { assignedAgentId: validatedAssignedTo }),
      },
    });

    await invalidateCache(
      ["clients:list", `account:${id}`, v.assigned_to ? `user:${v.assigned_to}` : ""].filter(Boolean)
    );

    await notifyAccountWatchers(
      id,
      organizationId,
      "ACCOUNT_UPDATED",
      `Client "${updatedClient.displayName}" was updated`,
      `${user.name || user.email} updated the client "${updatedClient.displayName}"`,
      { updatedBy: user.id, updatedByName: user.name || user.email }
    );

    dispatchContactWebhook(organizationId, "contact.updated", updatedClient).catch(console.error);

    return NextResponse.json({ updatedClient }, { status: 200 });
  } catch (error) {
    console.error("[CLIENTS_PUT]", error);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

/**
 * GET /api/crm/clients
 *
 * Cursor-paginated contact list. Supports ?minimal=true for selector use cases.
 * Note: displayName is encrypted — text search runs post-decrypt in memory.
 */
export async function GET(req: Request) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limitParam = searchParams.get("limit");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const minimal = searchParams.get("minimal") === "true";

    const where: Record<string, unknown> = { organizationId };
    if (status) where.status = status;

    if (minimal) {
      const contacts = await prismadb.contact.findMany({
        where,
        select: { id: true, displayName: true },
        orderBy: { createdAt: "asc" },
        take: 1000,
      });
      const decrypted = await Promise.all(
        contacts.map((c) => decryptContactForOrg(c, organizationId))
      );
      return NextResponse.json({ items: decrypted, nextCursor: null, hasMore: false }, { status: 200 });
    }

    let limit = 50;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0) limit = Math.min(parsed, 100);
    }

    const contacts = await prismadb.contact.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        friendlyId: true,
        displayName: true,
        email: true,
        primaryPhone: true,
        status: true,
        category: true,
        isCompany: true,
        assignedAgentId: true,
        createdAt: true,
        updatedAt: true,
        assignedAgent: { select: { id: true, name: true } },
      },
    });

    const hasMore = contacts.length > limit;
    const items = hasMore ? contacts.slice(0, -1) : contacts;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    const decrypted = await Promise.all(
      items.map((c) => decryptContactForOrg(c, organizationId))
    );

    // Post-decrypt text search (displayName and email are encrypted at rest)
    let results = decrypted;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = decrypted.filter(
        (c) =>
          c.displayName?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.primaryPhone?.includes(q)
      );
    }

    return NextResponse.json(
      { items: JSON.parse(JSON.stringify(results)), nextCursor, hasMore },
      { status: 200 }
    );
  } catch (error) {
    console.error("[CLIENTS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

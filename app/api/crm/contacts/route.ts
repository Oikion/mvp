import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { generateFriendlyId } from "@/lib/friendly-id";
import { canPerformAction } from "@/lib/permissions";
import { createContactSchema, contactQuerySchema } from "@/lib/validations/contacts";
import { encryptContactForOrg, decryptContactForOrg } from "@/lib/model-encryption";
import { validateAssignedTo } from "@/lib/validate-assigned-to";
import { notifyContactCreated } from "@/lib/notifications";
import { createChangeLogEntry } from "@/lib/entity-change-log";
import { logEntityCreated } from "@/lib/activity-logger";

export async function GET(req: Request) {
  try {
    // Auth check first — must have userId + orgId
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const readCheck = await canPerformAction("contact:read");
    if (!readCheck.allowed) {
      return NextResponse.json({ error: readCheck.reason || "Permission denied" }, { status: 403 });
    }

    // Validate query params with Zod
    const { searchParams } = new URL(req.url);
    const queryValidation = contactQuerySchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    const status = queryValidation.success ? queryValidation.data.status : undefined;
    const category = queryValidation.success ? queryValidation.data.category : undefined;
    const search = queryValidation.success ? queryValidation.data.search : undefined;
    const limit = queryValidation.success && queryValidation.data.limit ? queryValidation.data.limit : 50;
    const cursor = queryValidation.success ? queryValidation.data.cursor : undefined;

    const where: Record<string, unknown> = { organizationId };
    if (status) where.status = status;
    if (category) where.category = { has: category };

    const contacts = await prismadb.contact.findMany({
      where,
      select: {
        id: true,
        friendlyId: true,
        firstName: true,
        lastName: true,
        displayName: true,
        isCompany: true,
        companyName: true,
        email: true,
        primaryPhone: true,
        category: true,
        status: true,
        visibility: true,
        tags: true,
        leadScore: true,
        createdAt: true,
        assignedAgentId: true,
        assignedAgent: { select: { name: true, id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const hasMore = contacts.length > limit;
    const results = hasMore ? contacts.slice(0, limit) : contacts;
    const nextCursor = hasMore ? results[results.length - 1].id : null;

    // Decrypt PII fields
    const decrypted = [];
    for (const contact of results) {
      try {
        decrypted.push(await decryptContactForOrg(contact, organizationId));
      } catch (err) {
        console.error(`[CONTACTS_GET] Failed to decrypt contact ${contact.id}:`, err);
      }
    }

    // Filter by search (post-decrypt since names are encrypted)
    let filtered = decrypted;
    if (search) {
      const q = search.toLowerCase();
      filtered = decrypted.filter((c) =>
        c.displayName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.primaryPhone?.includes(q) ||
        c.companyName?.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({
      data: filtered,
      meta: { cursor: nextCursor, hasMore },
    });
  } catch (error) {
    console.error("[CONTACTS_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const createCheck = await canPerformAction("contact:create");
    if (!createCheck.allowed) {
      return NextResponse.json({ error: createCheck.reason || "Permission denied" }, { status: 403 });
    }

    const user = await getCurrentUser();
    const body = await req.json();

    const validation = createContactSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;
    const friendlyId = await generateFriendlyId(prismadb, "Contact", organizationId);
    const validatedAgent = await validateAssignedTo(data.assignedAgentId);

    const encrypted = await encryptContactForOrg(
      {
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        displayName: data.displayName,
        companyName: data.companyName ?? null,
        email: data.email ?? null,
        secondaryEmail: data.secondaryEmail ?? null,
        primaryPhone: data.primaryPhone ?? null,
        secondaryPhone: data.secondaryPhone ?? null,
        officePhone: data.officePhone ?? null,
        whatsapp: data.whatsapp ?? null,
        viber: data.viber ?? null,
        taxId: data.taxId ?? null,
        doy: data.doy ?? null,
        vatNumber: data.vatNumber ?? null,
        companyGemi: data.companyGemi ?? null,
        companyId: data.companyId ?? null,
        idDocument: data.idDocument ?? null,
        notes: data.notes ?? null,
        communicationNotes: data.communicationNotes ?? null,
        addresses: data.addresses ?? null,
      },
      organizationId
    );
    const { addresses: _encAddresses, communicationNotes: _encCommNotes, ...encryptedRest } = encrypted as { addresses?: unknown; communicationNotes?: unknown } & typeof encrypted;

    const contact = await prismadb.contact.create({
      data: {
        organizationId,
        friendlyId,
        createdBy: user.id,
        updatedBy: user.id,
        ...encryptedRest,
        addresses: _encAddresses === null || _encAddresses === undefined ? undefined : (_encAddresses as object),
        communicationNotes: _encCommNotes === null || _encCommNotes === undefined ? undefined : (_encCommNotes as object | string),
        isCompany: data.isCompany ?? false,
        category: data.category,
        status: data.status ?? "LEAD",
        source: data.source ?? null,
        visibility: data.visibility ?? "PRIVATE",
        assignedAgentId: validatedAgent,
        languagePreference: data.languagePreference ?? null,
        tags: data.tags ?? [],
        leadScore: data.leadScore ?? null,
        doNotContact: data.doNotContact ?? false,
        gdprConsentGiven: data.gdprConsentGiven ?? false,
        gdprConsentDate: data.gdprConsentGiven ? new Date() : null,
        allowMarketing: data.allowMarketing ?? false,
        referredById: data.referredById ?? null,
      },
    });

    void notifyContactCreated({
      entityType: "CONTACT",
      entityId: contact.id,
      entityName: contact.displayName,
      creatorId: user.id,
      creatorName: user.name || user.email || "Someone",
      organizationId,
      assignedToId: validatedAgent ?? undefined,
    }).catch((err) => console.error("[CONTACTS_POST] notifyContactCreated failed", err));

    void createChangeLogEntry({
      organizationId,
      entityType: "CONTACT",
      entityId: contact.id,
      eventType: "CREATED",
      actorUserId: userId,
    }).catch((err) => console.error("[CONTACT_CREATED_LOG]", err));

    // Activity Log — fire-and-forget (separate from EntityChangeLog above)
    void logEntityCreated({
      organizationId,
      parentType: "CONTACT",
      parentId: contact.id,
      createdByUserId: user.id,
      source: "manual",
    });

    return NextResponse.json({ data: contact }, { status: 201 });
  } catch (error) {
    console.error("[CONTACTS_POST]", error);
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }
}

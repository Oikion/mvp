import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { generateFriendlyId } from "@/lib/friendly-id";
import { canPerformAction } from "@/lib/permissions";
import { createRequestSchema, requestQuerySchema } from "@/lib/validations/requests";
import { encryptRequestForOrg, decryptRequestForOrg, decryptContactForOrg } from "@/lib/model-encryption";

export async function GET(req: Request) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const readCheck = await canPerformAction("request:read");
    if (!readCheck.allowed) {
      return NextResponse.json({ error: readCheck.reason || "Permission denied" }, { status: 403 });
    }

    // Validate query params
    const { searchParams } = new URL(req.url);
    const queryValidation = requestQuerySchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      requestType: searchParams.get("requestType") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      minimal: searchParams.get("minimal") ?? undefined,
    });

    const params: Partial<import("@/lib/validations/requests").RequestQueryParams> = queryValidation.success ? queryValidation.data : {};
    const limit = params.limit ?? 50;
    const cursor = params.cursor;

    const where: Record<string, unknown> = { organizationId };
    if (params.status) {
      const statuses = params.status.split(",");
      where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    }
    if (params.requestType) where.requestType = params.requestType;

    const requests = await prismadb.request.findMany({
      where,
      select: {
        id: true,
        friendlyId: true,
        requestType: true,
        propertyCategory: true,
        propertyTypes: true,
        status: true,
        urgency: true,
        budgetMin: true,
        budgetMax: true,
        surfaceMin: true,
        surfaceMax: true,
        bedroomsMin: true,
        bedroomsMax: true,
        locationDisplayName: true,
        municipality: true,
        region: true,
        notes: true,
        visibility: true,
        timeline: true,
        createdAt: true,
        assignedAgentId: true,
        requestContacts: {
          select: {
            role: true,
            contact: {
              select: {
                id: true,
                friendlyId: true,
                displayName: true,
                isCompany: true,
              },
            },
          },
        },
        assignedAgent: { select: { name: true, id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const hasMore = requests.length > limit;
    const results = hasMore ? requests.slice(0, limit) : requests;
    const nextCursor = hasMore ? results[results.length - 1].id : null;

    // Decrypt fields
    const decrypted = [];
    for (const request of results) {
      try {
        const decReq = await decryptRequestForOrg(request, organizationId);
        // Decrypt linked contacts
        const decContacts = [];
        for (const rc of request.requestContacts) {
          const decContact = await decryptContactForOrg(rc.contact, organizationId);
          decContacts.push({ ...rc, contact: decContact });
        }
        decrypted.push({ ...decReq, requestContacts: decContacts });
      } catch (err) {
        console.error(`[REQUESTS_GET] Failed to decrypt request ${request.id}:`, err);
      }
    }

    // Post-decrypt search filtering (encrypted fields can't be searched in DB)
    let filtered = decrypted;
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = decrypted.filter(
        (r) =>
          r.friendlyId?.toLowerCase().includes(q) ||
          r.locationDisplayName?.toLowerCase().includes(q) ||
          r.municipality?.toLowerCase().includes(q) ||
          r.requestContacts?.some((rc: any) =>
            rc.contact?.displayName?.toLowerCase().includes(q)
          )
      );
    }

    return NextResponse.json({ data: filtered, nextCursor, hasMore: !!nextCursor });
  } catch (error) {
    console.error("[REQUESTS_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, orgId: organizationId } = await auth();
    if (!userId || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const createCheck = await canPerformAction("request:create");
    if (!createCheck.allowed) {
      return NextResponse.json({ error: createCheck.reason || "Permission denied" }, { status: 403 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const body = await req.json();
    const validation = createRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;
    const friendlyId = await generateFriendlyId(prismadb, "Request", organizationId);

    const encrypted = await encryptRequestForOrg(
      {
        notes: data.notes ?? null,
        locationDisplayName: data.locationDisplayName ?? null,
        communicationNotes: data.communicationNotes ?? null,
        areasOfInterest: data.areasOfInterest ?? null,
      },
      organizationId
    );

    const request = await prismadb.request.create({
      data: {
        organizationId,
        friendlyId,
        createdBy: user.id,
        updatedBy: user.id,
        assignedAgentId: data.assignedAgentId ?? null,
        requestType: data.requestType,
        propertyCategory: data.propertyCategory ?? null,
        propertyTypes: data.propertyTypes ?? [],
        status: data.status ?? "ACTIVE",
        urgency: data.urgency ?? "MEDIUM",
        budgetMin: data.budgetMin ?? null,
        budgetMax: data.budgetMax ?? null,
        surfaceMin: data.surfaceMin ?? null,
        surfaceMax: data.surfaceMax ?? null,
        plotSizeMin: data.plotSizeMin ?? null,
        plotSizeMax: data.plotSizeMax ?? null,
        bedroomsMin: data.bedroomsMin ?? null,
        bedroomsMax: data.bedroomsMax ?? null,
        bathroomsMin: data.bathroomsMin ?? null,
        bathroomsMax: data.bathroomsMax ?? null,
        floorMin: data.floorMin ?? null,
        floorMax: data.floorMax ?? null,
        groundFloorOnly: data.groundFloorOnly ?? false,
        constructionYearMin: data.constructionYearMin ?? null,
        constructionYearMax: data.constructionYearMax ?? null,
        conditionPreference: data.conditionPreference ?? [],
        heatingTypes: data.heatingTypes ?? [],
        energyClassMin: data.energyClassMin ?? null,
        furnished: data.furnished ?? null,
        requiresElevator: data.requiresElevator ?? null,
        requiresParking: data.requiresParking ?? null,
        requiresStorage: data.requiresStorage ?? null,
        requiresGarden: data.requiresGarden ?? null,
        petFriendly: data.petFriendly ?? null,
        requiresAC: data.requiresAC ?? null,
        insideCityPlan: data.insideCityPlan ?? null,
        legalizationOk: data.legalizationOk ?? null,
        viewTypes: data.viewTypes ?? [],
        orientationPref: data.orientationPref ?? [],
        locationDisplayName: encrypted.locationDisplayName,
        areasOfInterest: encrypted.areasOfInterest,
        municipality: data.municipality ?? null,
        region: data.region ?? null,
        timeline: data.timeline ?? null,
        notes: encrypted.notes,
        communicationNotes: encrypted.communicationNotes,
        visibility: data.visibility ?? "PRIVATE",
        draftStatus: data.draftStatus ?? false,
      },
    });

    // If a contactId was provided, verify it belongs to this org then link
    if (body.contactId && typeof body.contactId === "string") {
      const contact = await prismadb.contact.findFirst({
        where: { id: body.contactId, organizationId },
        select: { id: true },
      });
      if (contact) {
        await prismadb.requestContact.create({
          data: {
            organizationId,
            requestId: request.id,
            contactId: contact.id,
          },
        });
      }
    }

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    console.error("[REQUESTS_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

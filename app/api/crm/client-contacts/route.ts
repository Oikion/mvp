import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";

/**
 * POST /api/crm/client-contacts
 * Create a relationship between two contacts (replaces v1 Client_Contacts sub-contact model).
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    if (!body) {
      return new NextResponse("No form data", { status: 400 });
    }

    const {
      contactIdA,
      contactIdB,
      relationshipType,
      notes,
    } = body;

    if (!contactIdA || !contactIdB || !relationshipType) {
      return new NextResponse("Missing required fields: contactIdA, contactIdB, relationshipType", { status: 400 });
    }

    const organizationId = await getCurrentOrgId();

    // Verify both contacts belong to this org
    const contacts = await prismadb.contact.findMany({
      where: { id: { in: [contactIdA, contactIdB] }, organizationId },
      select: { id: true },
    });

    if (contacts.length !== 2) {
      return NextResponse.json({ error: "One or both contacts not found" }, { status: 404 });
    }

    const relationship = await prismadb.contactRelationship.create({
      data: {
        organizationId,
        contactIdA,
        contactIdB,
        relationshipType,
        notes: notes || null,
      },
    });

    await invalidateCache([
      `contact:${contactIdA}`,
      `contact:${contactIdB}`,
    ]);

    return NextResponse.json({ relationship }, { status: 200 });
  } catch (error) {
    console.error("[CLIENT_CONTACTS_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

/**
 * PUT /api/crm/client-contacts
 * Update a contact relationship.
 */
export async function PUT(req: Request) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();

    if (!body) {
      return new NextResponse("No form data", { status: 400 });
    }

    const { id, relationshipType, notes } = body;

    if (!id) {
      return new NextResponse("Missing relationship ID", { status: 400 });
    }

    // IDOR prevention: verify relationship belongs to user's org
    const existing = await prismadb.contactRelationship.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Relationship not found" }, { status: 404 });
    }

    const relationship = await prismadb.contactRelationship.update({
      where: { id },
      data: {
        ...(relationshipType ? { relationshipType } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    });

    await invalidateCache([
      `contact:${existing.contactIdA}`,
      `contact:${existing.contactIdB}`,
    ]);

    return NextResponse.json({ relationship }, { status: 200 });
  } catch (error) {
    console.error("[CLIENT_CONTACTS_PUT]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

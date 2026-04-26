import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import {
  logEntityLinkedSymmetric,
  logEntityUnlinkedSymmetric,
} from "@/lib/activity-logger";

// Link properties to a client
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
    const { clientId, propertyIds } = body;

    if (!clientId || !Array.isArray(propertyIds)) {
      return new NextResponse("Invalid request: clientId and propertyIds array required", { status: 400 });
    }

    // Verify client belongs to organization
    const client = await prismadb.contact.findFirst({
      where: { id: clientId, organizationId },
      select: { id: true, friendlyId: true },
    });

    if (!client) {
      return new NextResponse("Client not found or access denied", { status: 404 });
    }

    // Verify all properties belong to organization
    const properties = await prismadb.properties.findMany({
      where: { id: { in: propertyIds }, organizationId },
      select: { id: true, friendlyId: true, property_name: true },
    });

    if (properties.length !== propertyIds.length) {
      return new NextResponse("Some properties not found or access denied", { status: 404 });
    }

    // Create links (Prisma will handle duplicates via unique constraint)
    const links = await Promise.all(
      propertyIds.map((propertyId: string) =>
        prismadb.contactProperty.upsert({
          where: {
            contactId_propertyId: {
              contactId: clientId,
              propertyId,
            },
          },
          create: {
            id: crypto.randomUUID(),
            organizationId,
            contactId: clientId,
            propertyId,
          },
          update: {},
        })
      )
    );

    await invalidateCache([`account:${clientId}`, "clients:list"]);

    // Activity Log — symmetric Contact ↔ Property link per property
    const contactLabel = client.friendlyId ?? "Contact";
    const contactUrl = `/app/crm/contacts/${clientId}`;
    for (const prop of properties) {
      void logEntityLinkedSymmetric({
        organizationId,
        aType: "CONTACT",
        aId: clientId,
        aLabel: contactLabel,
        aUrl: contactUrl,
        bType: "PROPERTY",
        bId: prop.id,
        bLabel: prop.property_name ?? prop.friendlyId ?? "Property",
        bUrl: `/app/mls/properties/${prop.friendlyId ?? prop.id}`,
        createdByUserId: user.id,
      });
    }

    return NextResponse.json({ links }, { status: 200 });
  } catch (error) {
    console.error("[LINK_PROPERTIES_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// Unlink properties from a client
export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const propertyIds = searchParams.get("propertyIds")?.split(",") || [];

    if (!clientId) {
      return new NextResponse("clientId is required", { status: 400 });
    }

    // Verify client belongs to organization
    const client = await prismadb.contact.findFirst({
      where: { id: clientId, organizationId },
      select: { id: true, friendlyId: true },
    });

    if (!client) {
      return new NextResponse("Client not found or access denied", { status: 404 });
    }

    // Capture property labels before deletion
    const unlinkedProperties = propertyIds.length
      ? await prismadb.properties.findMany({
          where: { id: { in: propertyIds }, organizationId },
          select: { id: true, friendlyId: true, property_name: true },
        })
      : [];

    // Delete links
    await prismadb.contactProperty.deleteMany({
      where: {
        contactId: clientId,
        propertyId: { in: propertyIds },
      },
    });

    await invalidateCache([`account:${clientId}`, "clients:list"]);

    // Activity Log — symmetric Contact ↔ Property unlink per property
    const contactLabel = client.friendlyId ?? "Contact";
    const contactUrl = `/app/crm/contacts/${clientId}`;
    for (const prop of unlinkedProperties) {
      void logEntityUnlinkedSymmetric({
        organizationId,
        aType: "CONTACT",
        aId: clientId,
        aLabel: contactLabel,
        aUrl: contactUrl,
        bType: "PROPERTY",
        bId: prop.id,
        bLabel: prop.property_name ?? prop.friendlyId ?? "Property",
        bUrl: `/app/mls/properties/${prop.friendlyId ?? prop.id}`,
        createdByUserId: user.id,
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[LINK_PROPERTIES_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// Link clients to a property
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
    const { propertyId, clientIds } = body;

    if (!propertyId || !Array.isArray(clientIds)) {
      return new NextResponse("Invalid request: propertyId and clientIds array required", { status: 400 });
    }

    // Verify property belongs to organization
    const property = await prismadb.properties.findFirst({
      where: { id: propertyId, organizationId },
      select: { id: true, friendlyId: true, property_name: true },
    });

    if (!property) {
      return new NextResponse("Property not found or access denied", { status: 404 });
    }

    // Verify all clients belong to organization
    const clients = await prismadb.contact.findMany({
      where: { id: { in: clientIds }, organizationId },
      select: { id: true, friendlyId: true },
    });

    if (clients.length !== clientIds.length) {
      return new NextResponse("Some clients not found or access denied", { status: 404 });
    }

    // Create links
    const links = await Promise.all(
      clientIds.map((clientId: string) =>
        prismadb.contactProperty.upsert({
          where: {
            contactId_propertyId: {
              contactId: clientId,
              propertyId,
            },
          },
          create: {
            id: crypto.randomUUID(),
            organizationId,
            contactId: clientId,
            propertyId,
          },
          update: {},
        })
      )
    );

    await invalidateCache([`property:${propertyId}`, "properties:list"]);

    // Activity Log — symmetric Contact ↔ Property link per linked client
    const propertyLabel = property.property_name ?? property.friendlyId ?? "Property";
    const propertyUrl = `/app/mls/properties/${property.friendlyId ?? property.id}`;
    for (const c of clients) {
      void logEntityLinkedSymmetric({
        organizationId,
        aType: "CONTACT",
        aId: c.id,
        aLabel: c.friendlyId ?? "Contact",
        aUrl: `/app/crm/contacts/${c.id}`,
        bType: "PROPERTY",
        bId: property.id,
        bLabel: propertyLabel,
        bUrl: propertyUrl,
        createdByUserId: user.id,
      });
    }

    return NextResponse.json({ links }, { status: 200 });
  } catch (error) {
    console.error("[LINK_PROPERTIES_PUT]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
